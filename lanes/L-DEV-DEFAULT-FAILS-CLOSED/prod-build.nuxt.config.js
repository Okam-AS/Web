// The repository's real `nuxt.config.js`, with ONLY the output directories moved into this lane.
//
// Why not just run `nuxt build`? `.nuxt/` is shared by ~124 worktrees off this checkout, and a lane
// that overwrites it while a sibling is mid-run is exactly the kind of cross-lane damage this
// program keeps paying for. Nothing here touches the value under test: `buildDir` and
// `generate.dir` are output paths, and `env.API_BASE_URL` is spread through from the real config,
// resolved by the real `resolveApiBaseUrl()`, under the real command's NODE_ENV.
//
// Used as: node node_modules/.bin/nuxt-ts build --config-file lanes/<lane>/prod-build.nuxt.config.js
// `@nuxt/config`'s `loadNuxtConfig` resolves `--config-file` against rootDir (= cwd = repo root),
// so srcDir, modulesDir and every `~/…` alias still point at the repository.

const base = require('../../nuxt.config.js');
const config = base && base.default ? base.default : base;

// LANE_BUILD_DIR keeps the two edition arms (no / ch) in separate directories, so neither can be
// read as the other's output.
const OUT = process.env.LANE_BUILD_DIR || 'lanes/L-DEV-DEFAULT-FAILS-CLOSED/.nuxt-prod';

module.exports = Object.assign({}, config, {
  buildDir: OUT,
  generate: Object.assign({}, config.generate, { dir: OUT + '-generated' })
});
