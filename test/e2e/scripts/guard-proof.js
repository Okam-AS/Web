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
function webServer (state) {
  return http.createServer((_req, res) => {
    const shell = JSON.stringify(state.target);
    const subject = JSON.stringify(state.subjectTarget || state.target);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>app</title>\n' +
      '<h1 id="h">loading</h1>\n<script>\n' +
      'fetch(' + shell + ' + \'/user\').then(r => r.json())\n' +
      '  .then(() => fetch(' + subject + ' + \'/workforce/stores/1/context\'))\n' +
      '  .then(r => r.json())\n' +
      '  .then(d => { document.getElementById(\'h\').textContent = \'served by \' + d.ping; })\n' +
      '  .catch(e => { document.getElementById(\'h\').textContent = \'no backend: \' + e.message; });\n' +
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

  fs.copyFileSync(path.join(SUPPORT, 'artifact-store.js'), path.join(dir, 'test/e2e/support/artifact-store.js'));
  fs.copyFileSync(path.join(SUPPORT, 'journey-assertions.js'), path.join(dir, 'test/e2e/support/journey-assertions.js'));
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

  say('journey.js under test  ' + sha256(path.join(SUPPORT, 'journey.js')));
  say('  pristine copy        ' + pristine.sha);
  say('  mutant copy          ' + mutant.sha + '   (re-throw removed)');
  say('  split-mutant copy    ' + splitMutant.sha + '   (split-origin guard disabled)');
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
    }
  ];

  const failures = [];
  for (const arm of arms) {
    webState.target = arm.target;
    webState.subjectTarget = arm.subjectTarget || arm.target;
    fixtureState.served = 0;
    const result = await runArm(arm.harness, arm.env);
    const gotExit = result.code === 0 ? 'zero' : 'nonzero';
    const ok = gotExit === arm.expect && result.artifact === arm.artifact;
    if (!ok) { failures.push({ arm, result }); }
    say(
      (ok ? '  ok  ' : '  FAIL') + '  ' + arm.id.padEnd(3) +
      '  exit ' + String(result.code).padEnd(4) +
      '  artifact ' + result.artifact.padEnd(7) +
      '  ' + (result.summary || '(no summary)').padEnd(22) + '  ' + arm.why);
    if (!ok) {
      say('        expected exit ' + arm.expect + ' and artifact ' + arm.artifact);
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
    const mutantFailed = failures.some(f => f.arm.harness === mutant || f.arm.harness === splitMutant);
    if (mutantFailed) {
      say('A MUTANT ARM FAILED. That is not a guard regression — it means this proof is no longer\n' +
        'measuring the statement it removes, so the arms it backs prove nothing either. Fix the\n' +
        'mutation first.\n');
    }
    process.exit(1);
  }

  say('\nAll ' + arms.length + ' arms held. A mislabelled run fails the process, and so does one whose\n' +
    'subject calls left for another origin behind an honest sign-in; removing the re-throw, or the\n' +
    'split-origin branch, makes the matching run green again — which is what makes the rest mean\n' +
    'something.');
}

main().catch((error) => {
  warn('\n' + ((error && error.stack) || error) + '\n');
  process.exit(1);
});
