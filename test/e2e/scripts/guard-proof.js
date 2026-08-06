#!/usr/bin/env node
//
// DOES THE WRONG-WORLD GUARD ACTUALLY FAIL THE PROCESS?
//
//   node test/e2e/scripts/guard-proof.js
//
// ---- WHY THIS EXISTS --------------------------------------------------------------------------
//
// `test/e2e/support/journey.js` detects a run that is not what it says it is: a live-labelled journey
// whose browser never reached the origin its artifact names, or a fixture-labelled one the fixture
// never served. For a while it detected exactly that, wrote `"status": "failed"` into the artifact —
// and let Playwright print `1 passed` and exit 0. The detection was real and the consequence was
// nothing, so every artifact produced under it carried only the weight of an exit code that was zero
// regardless.
//
// One line closes it — `if (wrongWorld) { throw new Error(error); }`, after the artifact is written,
// never before. That line is the reason any journey artifact in this repo means anything, and until
// this file existed NOTHING in the tree went red if somebody deleted it. A tree with 91 Jest suites
// had no test of the one line the evidence standard rests on.
//
// ---- WHY IT IS NOT A UNIT TEST ----------------------------------------------------------------
//
// Because the thing that was lying was the EXIT CODE, and an assertion inside a test cannot observe
// its own runner's exit code. `expect(journeySource).toContain('throw')` would pass against a throw
// Playwright swallows; mocking `testInfo` would prove something about the mock. So this drives a real
// `playwright test` child process, against a real Chromium, and reads `status` off the process — the
// same number CI reads.
//
// ---- WHY IT MUTATES ITSELF --------------------------------------------------------------------
//
// A guard whose whole purpose is to fail is worthless if it cannot. Arms 1-3 would pass identically
// against a harness that failed EVERYTHING, and arms 4-5 would pass against one that failed NOTHING;
// neither shape proves the guard is load-bearing. So the same two mislabelled runs are repeated
// against a copy of `journey.js` with the re-throw REMOVED and are required to come back GREEN — exit
// 0, `1 passed`, artifact still saying `failed`. That is the historical defect, reproduced on demand.
// If a mutant arm goes red, this proof is measuring something other than the re-throw and says so
// rather than reporting success.
//
// ---- WHAT IT DOES NOT PROVE -------------------------------------------------------------------
//
//   • Not that a journey talked to the RIGHT live build. Identity is `backendBuild`'s job, and an
//     unidentified build deliberately does not fail a run — see artifact-store.js.
//   • Not partial mislabelling. The guard trips on ZERO traffic from the named origin; a run that
//     reached both the fixture and a live API reaches neither branch, and nothing here covers it.
//   • Nothing about the product. The stand-in app is fifteen lines of HTML; the only property of it
//     that matters is WHICH ORIGIN IT CALLS, which is the one property `nuxt dev` bakes in at compile
//     time and the one `reuseExistingServer` can silently get wrong.
//
// This proof is not wired into CI — no workflow in this repo runs any suite yet, which is L-FE-CI's
// subject, not this file's.

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SUPPORT = path.join(REPO_ROOT, 'test', 'e2e', 'support');
const PLAYWRIGHT_CLI = path.join(REPO_ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
const KEEP = !!process.env.GUARD_PROOF_KEEP;

// The statement whose absence was the defect. Matched exactly and by intent: this proof's entire
// claim is "removing THIS makes the mislabelled run green again", so if it is no longer here the
// honest outcome is a loud stop, not a quiet pass against a mutation that changed nothing.
const RETHROW = 'if (wrongWorld) { throw new Error(error); }';

// THE SECOND STATEMENT WITH THE SAME PROPERTY. Both wrong-world branches above are floors at ZERO,
// and signing in clears both of them — so a build whose subject calls went to a different origin
// than its authentication reaches the named backend for the door, fetches everything the journey is
// about from elsewhere, and files an artifact naming a backend that served only `POST /user/login`.
// `judgeSubjectOrigin` is what refuses that, and arms S1/S2 below are the runs it has to refuse.
// Mutated the same way and for the same reason: an arm that would pass with the check deleted
// measures nothing about the check.
const SPLIT_BRANCH = 'if (split) {';

// THE THIRD STATEMENT WITH THE SAME PROPERTY, and the one the split above cannot reach. The split is
// attributed BY ORIGIN and deliberately excludes the app's own, so that documents, bundles and
// webfonts are never counted as a second API. `nuxt.config.js:138` mounts a proxy at `/okam-api`, so
// a client built with `API_BASE_URL=/okam-api` fetches its whole subject SAME-ORIGIN — landing in
// neither subject counter, leaving both at zero, and sailing past a judge that needs a positive one
// before it will speak. `judgeProxiedSubject` is what refuses that, and arm P1 is the run it has to
// refuse. Mutated for the same reason as the other two: an arm that would pass with the check
// deleted measures nothing about the check.
const PROXY_BRANCH = 'if (proxied) {';

// Written to the streams rather than through `console`, matching dev-server.js and journey.js — this
// output is a report a person reads, and the repo lints `no-console` in this tree.
function say (line) { process.stdout.write(line + '\n'); }
function warn (line) { process.stderr.write(line + '\n'); }

function sha256 (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// ---- THE STAND-IN WORLDS ----------------------------------------------------------------------

function listen (server) {
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

/**
 * A stand-in for a REAL api: answers `/health`, and 404s `/__fixture/health` so the preflight's
 * fixture-tell does not mistake it for the throwaway. Everything else is a data route.
 */
function liveApiServer () {
  return http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    const send = (code, body, type) => {
      res.writeHead(code, { 'content-type': type || 'application/json', 'access-control-allow-origin': '*' });
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
    if (p === '/__fixture/health') { return send(404, { error: 'no such route' }); }
    if (p === '/health') { return send(200, 'Healthy', 'text/plain'); }
    return send(200, { ping: 'live' });
  });
}

/**
 * A stand-in for `test/e2e/fixture/api-server.js`, reduced to the three things the guard uses: the
 * tell, the reset, and the served count. `/__fixture/*` is a control surface and is NOT counted,
 * exactly as the real fixture has it — otherwise the recorder's own reset would satisfy the guard.
 */
function fixtureApiServer (state) {
  return http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(body));
    };
    if (p === '/__fixture/health') { return send(200, { ok: true }); }
    if (p === '/__fixture/reset' && req.method === 'POST') { state.served = 0; return send(200, { ok: true }); }
    if (p === '/__fixture/stats') { return send(200, { served: state.served }); }
    state.served += 1;
    return send(200, { ping: 'fixture' });
  });
}

/**
 * The app under test, standing in for `nuxt dev`.
 *
 * The one property that reproduces the defect is the one `nuxt dev` fixes at COMPILE time: the origin
 * the built bundle calls. A dev server already on the port — adopted by `reuseExistingServer` — calls
 * whatever IT was compiled against, whatever the run is labelled. `state.target` is that baked-in value.
 *
 * IT MAKES TWO CALLS, NOT ONE, and they are the two kinds every admin journey makes: `/user`, which
 * `journey-assertions.SHELL_PATHS` classifies as the sign-in shell, and a module route, which it
 * classifies as the journey's SUBJECT. `state.subjectTarget` is where the second one goes, and
 * pointing it somewhere other than `state.target` is a split origin — an app whose door is one API
 * and whose data is another. It defaults to `state.target`, so every arm written before this
 * behaves exactly as it did.
 */
/**
 * THE SAME-ORIGIN PROXY, standing in for `server-middleware/okam-api-proxy.js`.
 *
 * Mounted at the same path and rewriting the same way (`pathRewrite: { '^/okam-api': '' }`), because
 * the property under test is precisely that the BROWSER never sees the upstream origin: it records a
 * response from the app, and the app is not the API the artifact names. A stub that answered
 * `/okam-api/*` locally would reproduce that much, but not the fact that the backend really did
 * serve the call — which is the whole reason this shape is a reporting defect rather than a
 * wrong-world one, and the reason the sentence it produces says so.
 */
function proxyTo (origin, req, res) {
  const upstream = new URL(req.url.replace(/^\/okam-api/, '') || '/', origin);
  const forward = http.request({
    hostname: upstream.hostname,
    port: upstream.port,
    path: upstream.pathname + upstream.search,
    method: req.method,
    headers: { host: upstream.host }
  }, (answer) => {
    res.writeHead(answer.statusCode, { 'content-type': answer.headers['content-type'] || 'application/json' });
    answer.pipe(res);
  });
  forward.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy: ' + error.message }));
  });
  req.pipe(forward);
}

function webServer (state) {
  return http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;

    if (p === '/okam-api' || p.indexOf('/okam-api/') === 0) {
      return proxyTo(state.proxyTarget || state.target, req, res);
    }

    // Anything else that is not the page is one of the app's OWN routes — `/_nuxt/…`. Answered as
    // JSON so that a same-origin fetch to it RESOLVES, which is what arm P3 needs in order to show
    // that such a fetch does not red. A path that merely begins with the same letters as the mount
    // (`/okam-api-docs`) lands here too, and must.
    if (p !== '/') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ping: 'app' }));
    }

    // `calls` is the full list this page fetches, in order. An arm that does not set it gets the two
    // every admin journey makes — `/user` at `target`, the module route at `subjectTarget` — so the
    // ten arms written before the proxy existed behave exactly as they did. A RELATIVE url in the
    // list is same-origin, which is how the proxied arms are expressed.
    const urls = state.calls ||
      [state.target + '/user', (state.subjectTarget || state.target) + '/workforce/stores/1/context'];
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>app</title>\n' +
      '<h1 id="h">loading</h1>\n<script>\n' +
      'const urls = ' + JSON.stringify(urls) + ';\n' +
      '(async () => {\n' +
      '  let last = null;\n' +
      '  for (const u of urls) { const r = await fetch(u); last = await r.json(); }\n' +
      '  document.getElementById(\'h\').textContent = \'served by \' + (last && last.ping);\n' +
      '})().catch(e => { document.getElementById(\'h\').textContent = \'no backend: \' + e.message; });\n' +
      '</script>');
  });
}

// ---- THE HARNESSES ----------------------------------------------------------------------------

const SPEC = `const { test, expect, journeyDetails } = require('../support/journey');

// Passes on its own terms in every arm: it opens the page and reads what the page says. That is
// deliberate — if the body could fail by itself, the exit code would prove nothing about the guard.
test('the page loads and says who served it', journeyDetails({
  journey: 'guard-probe',
  capabilities: ['harness.guard.probe'],
  surface: 'public',
  tag: ['@live']
}), async ({ page, journey }) => {
  await journey.step('open the page', async () => {
    await page.goto('/');
    await expect(page.locator('#h')).not.toHaveText('loading');
    return await page.locator('#h').textContent();
  });
});
`;

const CONFIG = `const { defineConfig, devices } = require('@playwright/test');
const WEB_PORT = process.env.E2E_WEB_PORT;
const LIVE_API = process.env.E2E_API_BASE_URL || null;
module.exports = defineConfig({
  testDir: './test/e2e/journeys',
  testMatch: '**/*.spec.js',
  outputDir: './artifacts/playwright-output',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  grepInvert: LIVE_API ? /@fixture/ : undefined,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:' + WEB_PORT, headless: true, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
`;

/**
 * A throwaway checkout-shaped tree holding a COPY of the real support files.
 *
 * A copy rather than the files in place, for one reason: `journey.js` derives its artifact directory
 * from its own depth on disk, so running it in place would append this proof's runs to
 * `artifacts/journeys/runs/ledger.jsonl` and file a `guard-probe` artifact beside real evidence. The
 * copy is made fresh on every invocation and its sha256 is printed, so what ran is checkable.
 */
function buildHarness (root, name, mutate) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'test', 'e2e', 'support'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'test', 'e2e', 'journeys'), { recursive: true });
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'));

  // EVERY LOCAL `require` THE COPY WILL MAKE, RESOLVED TRANSITIVELY rather than listed by hand.
  //
  // A hand-written list is how this proof came to be DEAD AT THE TIP. It named exactly
  // `artifact-store.js` and `journey-assertions.js`; `artifact-store.js` then grew a
  // `require('./world-stamp')` and the list did not follow, so every arm — all of them, the five
  // original and the split-origin pair alike — died in module load with `Cannot find module
  // './world-stamp'` and `No tests found`. The script still ran, still printed a table, and still
  // exited nonzero, so it looked like a guard regression rather than a proof that could no longer
  // execute. A proof that cannot run reports nothing, and this one reported nothing at every tip
  // from `94fa256` — which added the require — onwards. NOT "these arms never ran": they were
  // runnable at their own approval (`22f2108`, an ancestor of `94fa256`, where artifact-store.js had
  // no such require) and died when `94fa256` landed underneath them. The weaker claim is the
  // provable one, and it is still the finding: a standing proof silently stopped executing and
  // five commits shipped over it.
  //
  // Resolved from the source text instead, closing over whatever the support files actually import,
  // so the next `require('./…')` added to any of them is copied the day it is written.
  const copied = new Set();
  const queue = ['journey.js', 'artifact-store.js', 'journey-assertions.js'];
  while (queue.length) {
    const name = queue.shift();
    if (copied.has(name)) { continue; }
    copied.add(name);
    const text = fs.readFileSync(path.join(SUPPORT, name), 'utf8');
    // `journey.js` is written below instead, because it is the file this proof MUTATES.
    if (name !== 'journey.js') {
      fs.writeFileSync(path.join(dir, 'test/e2e/support', name), text);
    }
    // EVERY local require is matched, not only the ones this copier can place. The first version of
    // this closure matched `require('./name')` with no `/` in its character class, so a future
    // `require('./sub/dir/x')` or `require('../fixture/x')` would have been silently skipped and the
    // harness would have died in module load again — the same silent-skip defect one turn along.
    // Anything that is not a plain same-directory module is therefore REFUSED loudly rather than
    // dropped, because a proof that cannot build its harness must say so, not exit as if it had.
    for (const match of text.matchAll(/require\('(\.[^']*)'\)/g)) {
      const spec = match[1];
      if (!/^\.\/[A-Za-z0-9_.-]+$/.test(spec)) {
        throw new Error(
          'guard-proof.js builds its throwaway harness by following the support files\' local\n' +
          'requires, and ' + name + ' requires `' + spec + '`, which is not a same-directory module\n' +
          'this copier knows how to place. Refusing to build a harness that would die in module\n' +
          'load — that is precisely the failure this closure exists to end, and skipping it quietly\n' +
          'is how the hand-written list rotted. Teach buildHarness to copy it.');
      }
      const dep = spec.slice(2);
      queue.push(/\.js$/.test(dep) ? dep : dep + '.js');
    }
  }

  const journeyPath = path.join(dir, 'test/e2e/support/journey.js');
  let source = fs.readFileSync(path.join(SUPPORT, 'journey.js'), 'utf8');

  if (mutate === 'rethrow') {
    if (!source.includes(RETHROW)) {
      throw new Error(
        'This proof mutates `journey.js` by removing:\n\n    ' + RETHROW + '\n\n' +
        'and that statement is no longer in test/e2e/support/journey.js. Refusing to report success:\n' +
        'a mutation that changes nothing makes every other arm of this proof unfalsifiable, which is\n' +
        'the exact defect this file exists to stop. Point the mutation at whatever now re-throws\n' +
        'after the artifact is written, or say plainly that nothing does.');
    }
    source = source.replace(RETHROW, '/* MUTANT: re-throw removed by guard-proof.js */');
  }

  if (mutate === 'split') {
    if (!source.includes(SPLIT_BRANCH)) {
      throw new Error(
        'This proof mutates `journey.js` by disabling:\n\n    ' + SPLIT_BRANCH + '\n\n' +
        'and that branch is no longer in test/e2e/support/journey.js. Refusing to report success:\n' +
        'arms S1 and S2 would then be measuring nothing, and a split-origin run that goes green in\n' +
        'both the pristine and the mutant harness proves the guard is absent, not present. Point the\n' +
        'mutation at whatever now acts on `judgeSubjectOrigin`, or say plainly that nothing does.');
    }
    source = source.replace(SPLIT_BRANCH, 'if (false && split) { /* MUTANT: split-origin guard disabled */');
  }

  if (mutate === 'proxy') {
    if (!source.includes(PROXY_BRANCH)) {
      throw new Error(
        'This proof mutates `journey.js` by disabling:\n\n    ' + PROXY_BRANCH + '\n\n' +
        'and that branch is no longer in test/e2e/support/journey.js. Refusing to report success:\n' +
        'arm P1 would then be measuring nothing, and a proxied-subject run that goes green in both\n' +
        'the pristine and the mutant harness proves the guard is absent, not present. Point the\n' +
        'mutation at whatever now acts on `judgeProxiedSubject`, or say plainly that nothing does.');
    }
    source = source.replace(PROXY_BRANCH, 'if (false && proxied) { /* MUTANT: same-origin-proxy guard disabled */');
  }
  fs.writeFileSync(journeyPath, source);
  fs.writeFileSync(path.join(dir, 'test/e2e/journeys/guard-probe.spec.js'), SPEC);
  fs.writeFileSync(path.join(dir, 'playwright.config.js'), CONFIG);
  return { dir, journeyPath, sha: sha256(journeyPath) };
}

// ---- ONE ARM ----------------------------------------------------------------------------------

/**
 * Runs one `playwright test` child and reports the number CI would read.
 *
 * ASYNCHRONOUS, and that is not a style choice: the three stand-in worlds are HTTP servers in THIS
 * process, so a blocking `spawnSync` would hold the event loop for the whole run and none of them
 * could answer. Every arm then times out in fixture setup and the proof reports a guard failure that
 * is entirely its own — which is how this was first written, and it took a mutant arm going red to
 * say so.
 */
function runArm (harness, env) {
  const artifacts = path.join(harness.dir, 'artifacts', 'journeys');
  fs.rmSync(artifacts, { recursive: true, force: true });

  const childEnv = Object.assign({}, process.env, env);
  // Never inherit a live target, a declared build or a fixture port from the caller's shell: this
  // proof's arms differ ONLY in what it sets here, and an inherited E2E_* would silently change one.
  ['E2E_API_BASE_URL', 'E2E_FIXTURE_PORT', 'E2E_WEB_PORT', 'E2E_BASE_URL', 'E2E_API_BUILD', 'E2E_API_REPO', 'OKAM_API_REPO', 'CI']
    .forEach((key) => { if (!(key in env)) { delete childEnv[key]; } });

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [PLAYWRIGHT_CLI, 'test'], { cwd: harness.dir, env: childEnv });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    const killer = setTimeout(() => child.kill('SIGKILL'), 180000);
    child.on('close', (code) => {
      clearTimeout(killer);
      const summary = (output.match(/^\s*\d+ (?:passed|failed).*$/gm) || []).map(s => s.trim()).join(', ');
      let artifact = 'NONE';
      try {
        artifact = JSON.parse(fs.readFileSync(path.join(artifacts, 'guard-probe.playwright.json'), 'utf8')).status;
      } catch (e) { /* NONE — a run refused before the browser opened files nothing, which is correct */ }
      resolve({ code, summary, artifact, output });
    });
  });
}

// ---- THE ARMS ---------------------------------------------------------------------------------

async function main () {
  if (!fs.existsSync(PLAYWRIGHT_CLI)) {
    warn('@playwright/test is not installed. `npm install` first.');
    process.exit(2);
  }

  const fixtureState = { served: 0 };
  const webState = { target: null };
  const live = liveApiServer();
  const fixture = fixtureApiServer(fixtureState);
  const web = webServer(webState);
  const livePort = await listen(live);
  const fixturePort = await listen(fixture);
  const webPort = await listen(web);
  const liveOrigin = 'http://127.0.0.1:' + livePort;
  const fixtureOrigin = 'http://127.0.0.1:' + fixturePort;

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-guard-proof-'));
  const pristine = buildHarness(root, 'pristine', null);
  const mutant = buildHarness(root, 'mutant', 'rethrow');
  const splitMutant = buildHarness(root, 'split-mutant', 'split');
  const proxyMutant = buildHarness(root, 'proxy-mutant', 'proxy');

  say('journey.js under test  ' + sha256(path.join(SUPPORT, 'journey.js')));
  say('  pristine copy        ' + pristine.sha);
  say('  mutant copy          ' + mutant.sha + '   (re-throw removed)');
  say('  split-mutant copy    ' + splitMutant.sha + '   (split-origin guard disabled)');
  say('  proxy-mutant copy    ' + proxyMutant.sha + '   (same-origin-proxy guard disabled)');
  say('stand-in live api      ' + liveOrigin);
  say('stand-in fixture       ' + fixtureOrigin);
  say('stand-in app           http://127.0.0.1:' + webPort + '\n');

  // `expect` is the EXIT CODE this arm must produce. `artifact` is what must be on disk afterwards —
  // it separates "the guard caught it" from "something else went wrong and also failed the run".
  const arms = [
    {
      id: '1',
      harness: pristine,
      why: 'live-labelled, app compiled against the FIXTURE',
      target: fixtureOrigin,
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'nonzero',
      artifact: 'failed'
    },
    {
      id: '2',
      harness: pristine,
      why: 'fixture-labelled, app compiled against a LIVE api',
      target: liveOrigin,
      env: { E2E_FIXTURE_PORT: String(fixturePort), E2E_WEB_PORT: String(webPort) },
      expect: 'nonzero',
      artifact: 'failed'
    },
    {
      id: '3',
      harness: pristine,
      why: 'live-labelled, pointed AT the throwaway fixture',
      target: fixtureOrigin,
      env: { E2E_API_BASE_URL: fixtureOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'nonzero',
      artifact: 'NONE'
    },
    {
      id: '4',
      harness: pristine,
      why: 'live-labelled, app compiled against that LIVE api (honest)',
      target: liveOrigin,
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    },
    {
      id: '5',
      harness: pristine,
      why: 'fixture-labelled, app compiled against that FIXTURE (honest)',
      target: fixtureOrigin,
      env: { E2E_FIXTURE_PORT: String(fixturePort), E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    },
    // ---- THE SPLIT-ORIGIN ARMS. Both of these clear the served floor honestly — the named backend
    // answered the sign-in — and are still lies about which API the journey exercised.
    {
      id: 'S1',
      harness: pristine,
      why: 'live-labelled; signs in at the named api, fetches its SUBJECT elsewhere',
      target: liveOrigin,
      subjectTarget: fixtureOrigin,
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'nonzero',
      artifact: 'failed'
    },
    {
      id: 'S2',
      harness: pristine,
      why: 'fixture-labelled; signs in at the fixture, fetches its SUBJECT elsewhere',
      target: fixtureOrigin,
      subjectTarget: liveOrigin,
      env: { E2E_FIXTURE_PORT: String(fixturePort), E2E_WEB_PORT: String(webPort) },
      expect: 'nonzero',
      artifact: 'failed'
    },
    // ---- THE SAME-ORIGIN PROXY ARMS. `nuxt.config.js:138` mounts `okam-api-proxy.js` at
    // `/okam-api`, so a client built with `API_BASE_URL=/okam-api` fetches its subject from its OWN
    // origin. The split judge above attributes by origin and excludes the app's, so this shape lands
    // in NO counter: both subject numbers read 0, nothing is positive, nothing speaks, and the
    // artifact names a backend that answered only the door. P1 is that run.
    //
    // P2, P3 and P4 are the three ways the new counter must stay SILENT, and they are the arms that
    // make P1 worth having. A counter that reds on "the proxy served it" AND on "nothing was
    // fetched" would have moved the silent zero one column along rather than closed it; a counter
    // that reds on any same-origin fetch would red on the Nuxt dev server and be deleted within the
    // week; and one that tested the un-stripped path would call every proxied sign-in a subject.
    {
      id: 'P1',
      harness: pristine,
      why: 'live-labelled; signs in at the named api, proxies its SUBJECT same-origin',
      target: liveOrigin,
      calls: [liveOrigin + '/user', '/okam-api/workforce/stores/1/context'],
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'nonzero',
      artifact: 'failed'
    },
    {
      id: 'P2',
      harness: pristine,
      why: 'live-labelled; signs in and fetches NOTHING else — no subject anywhere',
      target: liveOrigin,
      calls: [liveOrigin + '/user'],
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    },
    {
      id: 'P3',
      harness: pristine,
      why: 'live-labelled; a same-origin fetch OUTSIDE the mount (a Nuxt route) — must not red',
      target: liveOrigin,
      calls: [liveOrigin + '/user', '/_nuxt/workforce-context.json'],
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    },
    {
      id: 'P4',
      harness: pristine,
      why: 'live-labelled; the SIGN-IN goes through the proxy — shell once stripped, not subject',
      target: liveOrigin,
      calls: [liveOrigin + '/user', '/okam-api/user/login'],
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    },
    {
      id: 'M1',
      harness: mutant,
      why: 'arm 1 with the re-throw REMOVED — must go green again',
      target: fixtureOrigin,
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'failed'
    },
    {
      id: 'M2',
      harness: mutant,
      why: 'arm 2 with the re-throw REMOVED — must go green again',
      target: liveOrigin,
      env: { E2E_FIXTURE_PORT: String(fixturePort), E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'failed'
    },
    {
      id: 'M3',
      harness: splitMutant,
      why: 'arm S1 with the split-origin guard DISABLED — must go green again',
      target: liveOrigin,
      subjectTarget: fixtureOrigin,
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    },
    {
      id: 'M4',
      harness: proxyMutant,
      why: 'arm P1 with the same-origin-proxy guard DISABLED — must go green again',
      target: liveOrigin,
      calls: [liveOrigin + '/user', '/okam-api/workforce/stores/1/context'],
      env: { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) },
      expect: 'zero',
      artifact: 'passed'
    }
  ];

  const failures = [];
  for (const arm of arms) {
    webState.target = arm.target;
    webState.subjectTarget = arm.subjectTarget || arm.target;
    webState.proxyTarget = arm.proxyTarget || arm.target;
    webState.calls = arm.calls || null;
    fixtureState.served = 0;
    const result = await runArm(arm.harness, arm.env);
    const gotExit = result.code === 0 ? 'zero' : 'nonzero';
    // DID A TEST ACTUALLY RUN? Exit code and artifact are not enough on their own, and arm 3 is the
    // proof of it: it expects `nonzero` + `NONE`, which is EXACTLY the signature of a harness that
    // died in module load — nothing executed, nothing was written, the process exited 1. So arm 3
    // was satisfiable by the very breakage this script failed to notice for five commits. The
    // runner's own summary is the discriminator: a real refusal still runs the spec and prints
    // `1 failed`, while a module-load death prints no summary at all.
    const executed = /\b1 (?:passed|failed)\b/.test(result.summary || '');
    const ok = gotExit === arm.expect && result.artifact === arm.artifact && executed;
    if (!ok) { failures.push({ arm, result }); }
    say(
      (ok ? '  ok  ' : '  FAIL') + '  ' + arm.id.padEnd(3) +
      '  exit ' + String(result.code).padEnd(4) +
      '  artifact ' + result.artifact.padEnd(7) +
      '  ' + (result.summary || '(no summary)').padEnd(22) + '  ' + arm.why);
    if (!ok) {
      let why = '        expected exit ' + arm.expect + ' and artifact ' + arm.artifact;
      if (!executed) {
        why += ', AND NO TEST EXECUTED — the harness died before running a spec ' +
          '(a module-load death, not a guard verdict)';
      }
      say(why);
    }
  }

  [live, fixture, web].forEach(s => s.close());
  if (KEEP) {
    say('\nharnesses kept at ' + root);
  } else {
    fs.rmSync(root, { recursive: true, force: true });
  }

  if (failures.length) {
    say('\n' + failures.length + ' of ' + arms.length + ' arms did not do what they must.\n');
    failures.forEach(({ arm, result }) => {
      say('---- arm ' + arm.id + ' (' + arm.why + ') ----');
      say(result.output.trim().split('\n').slice(-25).join('\n') + '\n');
    });
    const mutantFailed = failures.some(
      f => f.arm.harness === mutant || f.arm.harness === splitMutant || f.arm.harness === proxyMutant);
    if (mutantFailed) {
      say('A MUTANT ARM FAILED. That is not a guard regression — it means this proof is no longer\n' +
        'measuring the statement it removes, so the arms it backs prove nothing either. Fix the\n' +
        'mutation first.\n');
    }
    process.exit(1);
  }

  say('\nAll ' + arms.length + ' arms held. A mislabelled run fails the process; so does one whose subject\n' +
    'calls left for another origin behind an honest sign-in; and so does one that fetched its subject\n' +
    'through the same-origin `/okam-api` proxy, where BOTH subject counters read zero and every floor\n' +
    'was green. That last guard stays silent for a journey that fetched no subject at all, for a\n' +
    'same-origin fetch outside the mount, and for a sign-in that went through it — so it distinguishes\n' +
    'a proxied subject from an absent one rather than reding on both. Removing the re-throw, the\n' +
    'split-origin branch, or the proxy branch makes the matching run green again — which is what\n' +
    'makes the rest mean something.');
}

main().catch((error) => {
  warn('\n' + ((error && error.stack) || error) + '\n');
  process.exit(1);
});
