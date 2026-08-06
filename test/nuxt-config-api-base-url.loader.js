// Loads `nuxt.config.js` through Nuxt's own loader in a FRESH process and prints one JSON line.
//
// A child process rather than a `require()` because the loader copies `.env` into `process.env`,
// caches the required config and is not re-entrant — a second case in one process would be reading
// the first case's world, and the thing under test is precisely how it reads the world.
//
// Invoked as `node test/nuxt-config-api-base-url.loader.js [nuxt-command]` so `process.argv` has
// the SAME SHAPE the real CLI sees. `node_modules/.bin/nuxt-ts` does not re-spawn: it calls
// `cli.run(null, hooks)` and `@nuxt/cli`'s `run()` reads `process.argv.slice(2)` in that same
// process, so argv[2] is the nuxt command in both worlds. No command mimics a bare `nuxt`
// invocation, which the CLI dispatches to `dev`.
//
// Named `.loader.js` rather than `.test.js`, so jest's testMatch does not collect it, and kept
// beside the one test that uses it rather than in a shared `support/` folder.

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const { loadNuxtConfig } = require(path.join(REPO_ROOT, 'node_modules', '@nuxt', 'config'));

loadNuxtConfig({ rootDir: REPO_ROOT })
  .then((options) => {
    process.stdout.write(JSON.stringify({
      ok: true,
      apiBaseUrl: (options.env || {}).API_BASE_URL,
      edition: (options.env || {}).EDITION
    }));
  })
  .catch((error) => {
    process.stdout.write(JSON.stringify({
      ok: false,
      error: String((error && error.message) || error)
    }));
  });
