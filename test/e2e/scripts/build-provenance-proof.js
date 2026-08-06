#!/usr/bin/env node
//
// DOES A LIVE JOURNEY ARTIFACT NAME THE CHECKOUT THAT SERVED IT — WITHOUT ASKING THE PORT?
//
//   node test/e2e/scripts/build-provenance-proof.js
//
// ---- WHY THIS EXISTS --------------------------------------------------------------------------
//
// `backendBuild` is what separates a live artifact from an anecdote: `/health` answers the word
// "Healthy" for every API ever built, and on 2026-08-02 two live worlds stood on this machine at once
// out of two different api worktrees at two different commits, each satisfying it identically. Every
// live artifact standing on this branch on 2026-08-04 was one of two shapes — `backendBuild: null`, or
// a build learned by running `lsof` on the port and asking whoever held it what directory they were
// in.
//
// The second shape is the dangerous one, and it is dangerous exactly when it matters: the port answers
// about WHOEVER HOLDS IT AT READ TIME. A stale process answers as confidently as the right one, and
// the artifact then names a world that was never under test. That is `F-PROBE-ROOT-WRONG-WORLD` in a
// different costume, and this estate has already recorded it once.
//
// `test/e2e/support/world-stamp.js` is the answer: the script that BUILDS the world writes down, at
// the moment it came up healthy, which checkout it built from and which process it started. This file
// is the proof that the answer travels all the way into an artifact, and that it discriminates.
//
// ---- WHAT MAKES THIS A PROOF RATHER THAN A DEMONSTRATION --------------------------------------
//
// A field that is always populated proves nothing. So every arm here is arranged so that THE WRONG
// ANSWER IS AVAILABLE AND NAMEABLE:
//
//   • The stand-in API is served by THIS process, whose cwd is the Web-modules checkout. So the port,
//     if it were asked, would answer `Web-modules@<frontend sha>` — a real, plausible, WRONG answer,
//     and precisely the frontend/backend confusion `backendBuild` exists to end.
//   • The stamp names a different real git checkout, made fresh in a temp directory. Two of them, so
//     the recorded value can be shown to CHANGE when the checkout changes rather than merely to exist.
//   • One arm invalidates the stamp and requires the artifact to change to the port's wrong answer.
//     Without that arm, arms 1 and 2 would pass identically against a store that ignored the stamp and
//     happened to be handed the right value some other way.
//
// ---- WHAT IT DOES NOT PROVE -------------------------------------------------------------------
//
//   • Not that `live-world.sh` stamps correctly end to end. That script needs a SQL container, the
//     migration chain and a real WebApi; this proof stands in for the world, not for the script. What
//     it does prove is that the stamp WRITER and READER used here are the same modules that script
//     calls — they are copied out of test/e2e/support/ and their sha256 is printed.
//   • Nothing about the product. The stand-in app is fifteen lines of HTML whose only relevant
//     property is which origin it calls.

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SUPPORT = path.join(REPO_ROOT, 'test', 'e2e', 'support');
const PLAYWRIGHT_CLI = path.join(REPO_ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
const JOURNEY = 'provenance-probe';
// Where the artifacts this proof produces are kept. They are the deliverable — a live journey artifact
// naming the build that served it — so they are copied OUT of the throwaway harness on purpose.
const OUT = process.env.PROVENANCE_PROOF_OUT || null;

function say (line) { process.stdout.write(line + '\n'); }
function warn (line) { process.stderr.write(line + '\n'); }

function sha256 (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// ---- THE STAND-IN WORLD ------------------------------------------------------------------------

function listen (server) {
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

/** A stand-in for a REAL api: answers `/health`, and 404s the fixture tell so the preflight lets it be. */
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

/** The app under test. It signs in and then fetches a SUBJECT route, both from the named origin. */
function webServer (state) {
  return http.createServer((_req, res) => {
    const target = JSON.stringify(state.target);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>app</title>\n' +
      '<h1 id="h">loading</h1>\n<script>\n' +
      'fetch(' + target + ' + \'/user\').then(r => r.json())\n' +
      '  .then(() => fetch(' + target + ' + \'/workforce/stores/1/context\'))\n' +
      '  .then(r => r.json())\n' +
      '  .then(d => { document.getElementById(\'h\').textContent = \'served by \' + d.ping; })\n' +
      '  .catch(e => { document.getElementById(\'h\').textContent = \'no backend: \' + e.message; });\n' +
      '</script>');
  });
}

/** A real git checkout standing in for an API worktree. Real, because the stamp asks git for the HEAD. */
function checkout (root, name) {
  const repo = path.join(root, name);
  fs.mkdirSync(repo, { recursive: true });
  const run = (...args) => execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: Object.assign({}, process.env, {
      GIT_AUTHOR_NAME: 'proof',
      GIT_AUTHOR_EMAIL: 'proof@example.invalid',
      GIT_COMMITTER_NAME: 'proof',
      GIT_COMMITTER_EMAIL: 'proof@example.invalid'
    })
  });
  run('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'Program.cs'), '// the api ' + name + ' was built from\n');
  run('add', 'Program.cs');
  run('commit', '-q', '-m', 'a build of ' + name, '--no-gpg-sign');
  return { repo, name, head: run('rev-parse', 'HEAD').trim() };
}

// ---- THE HARNESS -------------------------------------------------------------------------------

const SPEC = `const { test, expect, journeyDetails } = require('../support/journey');

// It passes on its own terms in every arm: it opens the page and reads what the page says. The
// subject of this proof is the artifact's \`backendBuild\`, not whether a journey can fail.
test('the page loads and says who served it', journeyDetails({
  journey: '${JOURNEY}',
  capabilities: ['harness.provenance.probe'],
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
 * A checkout-shaped tree holding a COPY of the real support files.
 *
 * A copy rather than the files in place, for the reason guard-proof.js gives: `journey.js` derives its
 * artifact directory from its own depth on disk, so running in place would file a `provenance-probe`
 * artifact beside real evidence and append this proof's runs to the real ledger. The copy also gives
 * `world-stamp.js` its own `artifacts/world/live/`, which is what lets this proof write a stamp at
 * all without touching the stamps of any world actually standing on this machine.
 */
function buildHarness (root) {
  const dir = path.join(root, 'harness');
  fs.mkdirSync(path.join(dir, 'test', 'e2e', 'support'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'test', 'e2e', 'journeys'), { recursive: true });
  fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(dir, 'node_modules'));

  const copied = ['journey.js', 'artifact-store.js', 'journey-assertions.js', 'world-stamp.js'];
  copied.forEach((file) => {
    fs.copyFileSync(path.join(SUPPORT, file), path.join(dir, 'test/e2e/support', file));
  });
  fs.writeFileSync(path.join(dir, 'test/e2e/journeys', JOURNEY + '.spec.js'), SPEC);
  fs.writeFileSync(path.join(dir, 'playwright.config.js'), CONFIG);
  return { dir, copied };
}

function runArm (harness, env) {
  const artifacts = path.join(harness.dir, 'artifacts', 'journeys');
  fs.rmSync(artifacts, { recursive: true, force: true });

  const childEnv = Object.assign({}, process.env, env);
  // Never inherit a live target or a declared build from the caller's shell: the arms differ ONLY in
  // what this proof sets, and an inherited E2E_* would silently change one.
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
      let artifact = null;
      try {
        artifact = JSON.parse(fs.readFileSync(path.join(artifacts, JOURNEY + '.playwright.json'), 'utf8'));
      } catch (e) { /* null — an arm that files nothing is a failure this proof reports, not a crash */ }
      resolve({ code, artifact, output });
    });
  });
}

// ---- THE ARMS ----------------------------------------------------------------------------------

async function main () {
  if (!fs.existsSync(PLAYWRIGHT_CLI)) {
    warn('@playwright/test is not installed. `npm install` first.');
    process.exit(2);
  }

  const live = liveApiServer();
  const webState = { target: null };
  const web = webServer(webState);
  const livePort = await listen(live);
  const webPort = await listen(web);
  const liveOrigin = 'http://127.0.0.1:' + livePort;
  webState.target = liveOrigin;

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-provenance-proof-'));
  const harness = buildHarness(root);
  // The harness's OWN copy of the stamp module, so its REPO_ROOT is the harness and its stamps land
  // exactly where a real run would look: <harness>/artifacts/world/live/<host>-<port>.json.
  const stamps = require(path.join(harness.dir, 'test/e2e/support/world-stamp.js'));
  const alpha = checkout(root, 'okamapi-alpha');
  const beta = checkout(root, 'okamapi-beta');

  // What the PORT would say if it were asked. It is this process — the one serving the stand-in API —
  // and its cwd is this checkout, so the wrong answer available to every arm is the FRONTEND's commit
  // presented as the API's build.
  const portWouldSay = require(path.join(harness.dir, 'test/e2e/support/artifact-store.js'))
    .buildFromListeningProcess(liveOrigin);

  say('support files under test');
  harness.copied.forEach(file => say('  ' + file.padEnd(22) + sha256(path.join(SUPPORT, file))));
  say('stand-in live api      ' + liveOrigin + '   (served by pid ' + process.pid + ', cwd ' + path.basename(REPO_ROOT) + ')');
  say('stand-in app           http://127.0.0.1:' + webPort);
  say('the port would say     ' + ((portWouldSay && portWouldSay.id) || 'nothing') + '   <- the wrong answer, available in every arm');
  say('checkout alpha         ' + alpha.name + '@' + alpha.head);
  say('checkout beta          ' + beta.name + '@' + beta.head + '\n');

  const armEnv = { E2E_API_BASE_URL: liveOrigin, E2E_WEB_PORT: String(webPort) };
  const arms = [
    {
      id: '1',
      why: 'stamped from checkout ALPHA, nothing declared',
      stamp: alpha,
      env: armEnv,
      expectId: alpha.name + '@' + alpha.head,
      expectSource: /^stamp:/
    },
    {
      id: '2',
      why: 'the same world stamped from a DIFFERENT checkout (BETA)',
      stamp: beta,
      env: armEnv,
      expectId: beta.name + '@' + beta.head,
      expectSource: /^stamp:/
    },
    {
      id: '3',
      why: 'stamp INVALIDATED (its world is gone) — must fall back to the port and be WRONG',
      stamp: alpha,
      invalidate: true,
      env: armEnv,
      // The whole point of this arm: with the stamp refused, the artifact names the frontend checkout
      // as the API's build. If arms 1 and 2 produced the same value as this one, they proved nothing.
      expectId: (portWouldSay && portWouldSay.id) || null,
      expectSource: /^process:/
    },
    {
      id: '4',
      why: 'stamped ALPHA while the shell declares BETA — a command copied from an older world',
      stamp: alpha,
      env: Object.assign({ E2E_API_BUILD: beta.name + '@' + beta.head }, armEnv),
      expectId: alpha.name + '@' + alpha.head,
      expectSource: /^stamp:/,
      expectDetail: /overrode E2E_API_BUILD/
    },
    {
      id: '5',
      why: 'NO stamp, the shell declares ALPHA — the declaration still carries a remote runner',
      env: Object.assign({ E2E_API_BUILD: alpha.name + '@' + alpha.head }, armEnv),
      expectId: alpha.name + '@' + alpha.head,
      expectSource: /^env:E2E_API_BUILD$/
    }
  ];

  const failures = [];
  for (const arm of arms) {
    stamps.clearStamp(liveOrigin);
    if (arm.stamp) {
      // `launchedPid` is this process, which is also the one holding `liveOrigin` — the stand-in API
      // is an `http.createServer` in here — so the stamp resolves the socket holder back to us. And
      // `builtFrom` is the token the checkout was made at, which is the same thing `live-world.sh`
      // reads at build time; a stamp cannot be written without it.
      const written = stamps.writeStamp({
        apiBaseUrl: liveOrigin,
        repo: arm.stamp.repo,
        launchedPid: process.pid,
        builtFrom: arm.stamp.head
      });
      if (arm.invalidate) {
        // The state every stamp reaches eventually: it outlived the world it describes. Written as a
        // pid that is not running, which is what `readStamp` refuses on.
        const stamp = Object.assign(JSON.parse(fs.readFileSync(written.file, 'utf8')), { pid: 2147483646 });
        fs.writeFileSync(written.file, JSON.stringify(stamp, null, 2) + '\n');
      }
    }

    const result = await runArm(harness, arm.env);
    const build = result.artifact && result.artifact.backendBuild;
    const ok = result.code === 0 &&
      result.artifact && result.artifact.status === 'passed' && result.artifact.backend === 'live' &&
      !!build && build.id === arm.expectId && arm.expectSource.test(build.source) &&
      (!arm.expectDetail || arm.expectDetail.test(build.detail || ''));
    if (!ok) { failures.push({ arm, result }); }

    say((ok ? '  ok  ' : '  FAIL') + '  ' + arm.id + '  ' + (build ? build.id : 'NO BUILD').padEnd(52) +
      '  ' + (build ? build.source : '-').padEnd(34) + '  ' + arm.why);
    if (!ok) { say('        expected ' + arm.expectId + ' from ' + arm.expectSource); }

    if (OUT && result.artifact) {
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, 'arm-' + arm.id + '.' + JOURNEY + '.playwright.json'),
        JSON.stringify(result.artifact, null, 2) + '\n');
    }
  }

  [live, web].forEach(s => s.close());
  if (process.env.PROVENANCE_PROOF_KEEP) {
    say('\nharness kept at ' + root);
  } else {
    fs.rmSync(root, { recursive: true, force: true });
  }

  if (failures.length) {
    say('\n' + failures.length + ' of ' + arms.length + ' arms did not do what they must.\n');
    failures.forEach(({ arm, result }) => {
      say('---- arm ' + arm.id + ' (' + arm.why + ') ----');
      say(result.output.trim().split('\n').slice(-25).join('\n') + '\n');
    });
    process.exit(1);
  }

  say('\nAll ' + arms.length + ' arms held. A live journey artifact names the checkout the world script\n' +
    'recorded, changes when that checkout changes, and — arm 3 — names the port\'s wrong answer the\n' +
    'moment the stamp is no longer verifiable. Nothing asked the API what it was.');
}

main().catch((error) => {
  warn('\n' + ((error && error.stack) || error) + '\n');
  process.exit(1);
});
