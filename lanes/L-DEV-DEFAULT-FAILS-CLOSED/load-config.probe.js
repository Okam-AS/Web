// Loads `nuxt.config.js` once, through Nuxt's own loader, and prints one JSON line.
//
// Invoked as `node load-config.probe.js <nuxt-command>` so that `process.argv` has the SAME SHAPE
// the real CLI sees: `[node, <bin>, <command>]`. `node_modules/.bin/nuxt-ts` does not re-spawn — it
// calls `cli.run(null, hooks)`, and `@nuxt/cli`'s `run()` reads `process.argv.slice(2)` in that
// same process — so argv[2] is the command in both worlds. Passing no command mimics a bare `nuxt`
// invocation, which the CLI dispatches to `dev`.
//
// Named `.probe.js` so no test runner collects it.

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { loadNuxtConfig } = require(path.join(REPO_ROOT, 'node_modules', '@nuxt', 'config'));

loadNuxtConfig({ rootDir: REPO_ROOT })
  .then((o) => {
    process.stdout.write(JSON.stringify({
      ok: true,
      apiBaseUrl: (o.env || {}).API_BASE_URL,
      edition: (o.env || {}).EDITION
    }));
  })
  .catch((e) => {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: String((e && e.message) || e)
    }));
  });
