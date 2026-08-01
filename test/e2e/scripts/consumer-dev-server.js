// Starts ConsumerWeb's `nuxi dev` for the consumer checkout journey.
//
// WHY A SIBLING REPO. The funded checkout does not live in this repo. `pages/webshop/checkout.vue`
// here is a thirteen-line redirect to shop.okam.no; the checkout a real guest uses is
// ../ConsumerWeb (Nuxt 3, branch feature/swiss), which is where @sven put this lane on 2026-07-31
// (D-SPEC-L-MEALS-FUNDED = consumerweb). The journey harness lives here because this is where
// Playwright and the artifact contract are, so the harness reaches across and the app stays put.
//
// WHY NOT `npm run dev`. That script runs `npx nuxi`, which reaches the network for a CLI the repo
// already has. This spawns the checked-out one, so a run is offline and deterministic.
//
// THE ENV IS THE WHOLE CONFIGURATION. ConsumerWeb picks its API origin from two Vite variables read
// at BUILD time (env.ts): `VITE_APP_ENV=local` selects the local environment and
// `VITE_API_BASE_URL` is the origin it then talks to. They must be set on the process that compiles
// the bundle, never on the test runner.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONSUMER_ROOT = process.env.E2E_CONSUMER_ROOT || path.resolve(__dirname, '..', '..', '..', '..', 'ConsumerWeb');
const PORT = process.env.E2E_CONSUMER_WEB_PORT || '3020';
const API_BASE_URL = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_CONSUMER_FIXTURE_PORT || 4020));

// Named, not guessed. A missing sibling checkout must say so in one line rather than surface as a
// three-minute webServer timeout that reads like a broken config.
const cli = path.join(CONSUMER_ROOT, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs');
for (const required of [CONSUMER_ROOT, path.join(CONSUMER_ROOT, 'pages', 'checkout.vue'), path.join(CONSUMER_ROOT, 'core', 'services', 'cart-service.ts'), cli]) {
  if (!fs.existsSync(required)) {
    process.stderr.write('[consumer-dev-server] missing ' + required + '\n' +
      'The consumer journey drives ../ConsumerWeb. Check the repo out beside this one (or set\n' +
      'E2E_CONSUMER_ROOT), make sure its `core` submodule is initialised, and run `npm install` there.\n');
    process.exit(1);
  }
}

const child = spawn(process.execPath, [cli, 'dev', '--port', PORT], {
  cwd: CONSUMER_ROOT,
  stdio: 'inherit',
  env: Object.assign({}, process.env, {
    VITE_APP_ENV: 'local',
    VITE_API_BASE_URL: API_BASE_URL,
    VITE_SELECTED_THEME: process.env.VITE_SELECTED_THEME || 'okam'
  })
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    child.kill(signal);
    process.exit(0);
  });
}
child.on('exit', (code) => process.exit(code === null ? 1 : code));
