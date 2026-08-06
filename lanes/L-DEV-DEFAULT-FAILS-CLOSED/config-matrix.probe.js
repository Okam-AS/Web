// What does `nuxt.config.js` resolve `env.API_BASE_URL` to, for each way this repository is started?
//
// One CHILD PROCESS per row, because Nuxt's loader copies `.env` into `process.env` and caches the
// required config — a second row in the same process would be reading the first row's world. Each
// child is `load-config.probe.js`, invoked with the nuxt command as argv[2] so the child's
// `process.argv` has the shape the real CLI sees.
//
// The rows are named for the command that produces that world, and the two deploy rows are the ones
// that must not move: `.github/workflows/nuxtjs.yml` (okam.no) and `vercel.json` (OKAM_EDITION=ch,
// www.okam-swiss.ch) both run `npm run generate` and set no API_BASE_URL.
//
// Named `.probe.js` so no test runner collects it.
// Run: node lanes/L-DEV-DEFAULT-FAILS-CLOSED/config-matrix.probe.js

const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHILD = path.join(__dirname, 'load-config.probe.js');

const ROWS = [
  { name: 'npm run dev          [API_BASE_URL unset]', cmd: null, NODE_ENV: 'development' },
  { name: 'npm run dev          [API_BASE_URL=http://localhost:5080]', cmd: null, NODE_ENV: 'development', API_BASE_URL: 'http://localhost:5080' },
  { name: 'nuxt dev             [NODE_ENV forced to production]', cmd: 'dev', NODE_ENV: 'production' },
  { name: 'npm run generate     [okam.no, github pages]', cmd: 'generate', NODE_ENV: 'production' },
  { name: 'npm run generate     [www.okam-swiss.ch, vercel, EDITION=ch]', cmd: 'generate', NODE_ENV: 'production', OKAM_EDITION: 'ch' },
  { name: 'npm run build', cmd: 'build', NODE_ENV: 'production' },
  { name: 'npm run start', cmd: 'start', NODE_ENV: 'production' },
  { name: 'npm run generate     [API_BASE_URL=https://example.invalid]', cmd: 'generate', NODE_ENV: 'production', API_BASE_URL: 'https://example.invalid' }
];

function run (row) {
  const env = Object.assign({}, process.env, { NODE_ENV: row.NODE_ENV });
  delete env.API_BASE_URL;
  delete env.OKAM_EDITION;
  if (row.API_BASE_URL) { env.API_BASE_URL = row.API_BASE_URL; }
  if (row.OKAM_EDITION) { env.OKAM_EDITION = row.OKAM_EDITION; }

  const args = row.cmd ? [CHILD, row.cmd] : [CHILD];
  const out = execFileSync(process.execPath, args, {
    cwd: REPO_ROOT, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  return JSON.parse(out);
}

let refusals = 0;
for (const row of ROWS) {
  const r = run(row);
  const verdict = r.ok
    ? 'API_BASE_URL -> ' + JSON.stringify(r.apiBaseUrl) + (r.edition === 'ch' ? '   [EDITION=ch]' : '')
    : 'REFUSED TO LOAD';
  process.stdout.write(row.name.padEnd(60) + ' | ' + verdict + '\n');
  if (!r.ok) {
    refusals += 1;
    process.stdout.write(r.error.split('\n').map(l => '        ' + l).join('\n') + '\n');
  }
}
process.stdout.write('\nrows that refused: ' + refusals + ' of ' + ROWS.length + '\n');
