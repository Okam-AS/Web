// Starts `nuxt dev` for the browser journeys, with the `core` submodule borrowed for the duration.
//
// Playwright's `webServer` runs a COMMAND, and this is that command rather than `npm run dev`
// directly, for two reasons that are both about honesty:
//
//   1. core. A lane worktree has an empty `core/`, so `nuxt dev` compiles for ninety seconds and
//      then fails on `~/core/platform` — an error a reader would reasonably blame on Playwright.
//      `ensureCore()` borrows a checkout, and the exit handler puts the directory back exactly as it
//      was. It is never committed (git refuses: `core` is a gitlink), and a real checkout is left
//      alone.
//   2. API_BASE_URL. The whole app reads one env var to decide which origin it talks to, and it is
//      inlined at BUILD time by webpack's DefinePlugin (see env.ts). So it has to be set on the
//      process that compiles the bundle, not on the test runner.
//
// The `dist/` guard below is about a Nuxt 2 trap rather than about tests: this app builds with
// `target: 'static'`, and with a stale `dist/` present `nuxt start` serves that folder instead of the
// fresh build. `nuxt dev` does not, which is why dev is what the journeys run against — a `build`
// + `start` harness would have been silently testing whatever was generated last.

const { spawn } = require('child_process');
const path = require('path');
const { ensureCore, releaseCore, REPO_ROOT } = require('../support/core-checkout');

const PORT = process.env.E2E_WEB_PORT || '3010';
const API_BASE_URL = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));

const borrowed = ensureCore();
if (borrowed.borrowed) {
  process.stdout.write('[dev-server] borrowed core from ' + borrowed.source + '\n');
}

let released = false;
function release () {
  if (released) { return; }
  released = true;
  releaseCore(borrowed);
}

const child = spawn(
  process.execPath,
  [path.join(REPO_ROOT, 'node_modules', '.bin', 'nuxt-ts')],
  {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
      NODE_ENV: 'development',
      PORT,
      HOST: '127.0.0.1',
      API_BASE_URL
    })
  }
);

// SIGTERM is how Playwright stops a webServer; SIGINT is Ctrl-C in a headed local run. `exit` is the
// belt-and-braces path — `releaseCore` is synchronous precisely so it can run there.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    child.kill(signal);
    release();
    process.exit(0);
  });
}
process.on('exit', release);
child.on('exit', (code) => {
  release();
  process.exit(code === null ? 1 : code);
});
