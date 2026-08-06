// WHICH BACKEND A BUILD OF THIS REPOSITORY TALKS TO.
//
// `nuxt.config.js` chooses ONE origin, once, at build time — webpack's DefinePlugin inlines it (see
// `env.ts`), both HTTP stacks read it (`core/helpers/configuration.ts`,
// `utils/workforce/api-client.js`), and nothing at runtime can change it. That makes this file's
// resolution the single point where a laptop is pointed at real venues or not.
//
// It used to default to the deployed API in EVERY world, dev included, so `npm run dev` with no
// override was a live client against production — on an app whose admin pages overwrite a store
// record on Save. Two properties have to hold at once, and neither is safe alone:
//
//   1. A dev server with no named target REFUSES TO START. Not "warns", not "falls back to
//      localhost" — a fallback is silent, and silence is the failure shape being fixed.
//   2. THE DEPLOYS DO NOT MOVE. `.github/workflows/nuxtjs.yml` (okam.no) and `vercel.json`
//      (www.okam-swiss.ch, OKAM_EDITION=ch) both run `npm run generate` and set no API_BASE_URL.
//      `www.okam-swiss.ch` is a Nuxt build of THIS repository and really does call the deployed API
//      — a lane measured `/vilkar-store` issuing `GET /stores/1` against it. Its landing page makes
//      no API call at all, so a shallow check of that site says "safe" and is wrong. If (1) is ever
//      implemented as "refuse whenever the variable is unset", the Swiss site goes dark, because
//      unset is exactly the state that build is in.
//
// Each case runs in a fresh child process with an explicit NODE_ENV and an explicit nuxt command,
// because those two — not the emptiness of the variable — are the discriminator under test.

const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOADER = path.join(__dirname, 'nuxt-config-api-base-url.loader.js');
const DEPLOYED_API = 'https://okamapi.azurewebsites.net';

function load ({ command, nodeEnv, apiBaseUrl, edition }) {
  const env = Object.assign({}, process.env, { NODE_ENV: nodeEnv });
  delete env.API_BASE_URL;
  delete env.OKAM_EDITION;
  if (apiBaseUrl) { env.API_BASE_URL = apiBaseUrl; }
  if (edition) { env.OKAM_EDITION = edition; }

  const args = command ? [LOADER, command] : [LOADER];
  const stdout = execFileSync(process.execPath, args, {
    cwd: REPO_ROOT, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  return JSON.parse(stdout);
}

// Loading the config spawns node and evaluates the whole file; six of them do not fit in 5s.
jest.setTimeout(120000);

describe('a dev build cannot reach production by forgetting a variable', () => {
  it('refuses to resolve at all when a dev server names no API target', () => {
    const result = load({ command: null, nodeEnv: 'development' });

    expect(result.ok).toBe(false);
    // The refusal has to be usable at 22:00 by someone who has never read this file: it must name
    // the variable and show the shape of a value, or it just moves the confusion.
    expect(result.error).toContain('API_BASE_URL');
    expect(result.error).toContain('http://localhost:5080');
    // And it must not have silently chosen production on the way past.
    expect(result.apiBaseUrl).toBeUndefined();
  });

  it('refuses for `nuxt dev` even when NODE_ENV says production, because the command is the truth', () => {
    const result = load({ command: 'dev', nodeEnv: 'production' });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('API_BASE_URL');
  });

  it('takes the dev target it is given', () => {
    const result = load({ command: null, nodeEnv: 'development', apiBaseUrl: 'http://localhost:5080' });

    expect(result.ok).toBe(true);
    expect(result.apiBaseUrl).toBe('http://localhost:5080');
  });

  it('lets a dev build reach the deployed API when someone types it, which is the point of typing it', () => {
    const result = load({ command: null, nodeEnv: 'development', apiBaseUrl: DEPLOYED_API });

    expect(result.ok).toBe(true);
    expect(result.apiBaseUrl).toBe(DEPLOYED_API);
  });
});

describe('the deployed builds keep the API they have always had', () => {
  // `npm run generate`, which is what BOTH deploy paths run.
  it('resolves the deployed API for okam.no, whose workflow sets no API_BASE_URL', () => {
    const result = load({ command: 'generate', nodeEnv: 'production' });

    expect(result.ok).toBe(true);
    expect(result.apiBaseUrl).toBe(DEPLOYED_API);
  });

  it('resolves the deployed API for www.okam-swiss.ch, whose vercel.json sets only OKAM_EDITION', () => {
    const result = load({ command: 'generate', nodeEnv: 'production', edition: 'ch' });

    expect(result.ok).toBe(true);
    expect(result.edition).toBe('ch');
    expect(result.apiBaseUrl).toBe(DEPLOYED_API);
  });

  it('resolves the deployed API for `nuxt build` and `nuxt start` too', () => {
    expect(load({ command: 'build', nodeEnv: 'production' }).apiBaseUrl).toBe(DEPLOYED_API);
    expect(load({ command: 'start', nodeEnv: 'production' }).apiBaseUrl).toBe(DEPLOYED_API);
  });

  it('still lets a deploy override the target explicitly', () => {
    const result = load({ command: 'generate', nodeEnv: 'production', apiBaseUrl: 'https://example.invalid' });

    expect(result.ok).toBe(true);
    expect(result.apiBaseUrl).toBe('https://example.invalid');
  });
});
