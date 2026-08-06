// Cross-site topology harness — API side. NOT a fixture that stands in for the backend.
//
// It replicates exactly two things from the real system and nothing else, because exactly two things
// are in question:
//   1. the Set-Cookie attributes GrowthPreferenceController.OpenSession emits
//      (HttpOnly; Secure; SameSite=Strict; Path=/v1/growth)          — OkamAPI Controllers/GrowthPreferenceController.cs:58-65
//   2. the CORS headers Program.cs's default policy emits
//      (Access-Control-Allow-Origin: * and NO Allow-Credentials)     — OkamAPI Program.cs:96-103
// Both were verified against the LIVE deployed API before this file was written (see RUNS.md).
//
// The point of the harness is that the browser, not this server, decides whether the cookie comes
// back. This server only reports what the browser chose to send. A same-origin fixture cannot
// observe that choice at all, which is why the page is served from a DIFFERENT SITE than this API.
//
// Bound to loopback only. No real token, no real secret, no real store is involved.

const http = require('http');

const PORT = 4907;

// The two page origins the harness drives. Both are potentially-trustworthy origins, so the browser
// accepts `Secure` cookies over plain http from them — no self-signed certificate rigging needed.
//
//   http://localhost:3907  vs  http://127.0.0.1:4907  -> DIFFERENT registrable domains = CROSS-SITE.
//                                                        Models okam.no vs okamapi.azurewebsites.net.
//   http://127.0.0.1:3907  vs  http://127.0.0.1:4907  -> same host, different port = SAME-SITE,
//                                                        cross-origin. Port is not part of "site",
//                                                        so this models okam.no vs api.okam.no
//                                                        exactly in the respect under test.
const CROSS_SITE_PAGE = 'http://localhost:3907';
const SAME_SITE_PAGE = 'http://127.0.0.1:3907';
const NAMED_ORIGINS = [CROSS_SITE_PAGE, SAME_SITE_PAGE];

// The topologies under test. `cors` is what Program.cs does; `sameSite` is what the controller does.
const MODES = {
  // Exactly as deployed today.
  today: { cors: 'any', sameSite: 'Strict' },
  // Program.cs fixed to name the origins with credentials; cookie left alone.
  corsonly: { cors: 'named', sameSite: 'Strict' },
  // Program.cs fixed AND the cookie "moved off Strict" the obvious way. THE TRAP.
  corslax: { cors: 'named', sameSite: 'Lax' },
  // Program.cs fixed AND the cookie moved to the only value that crosses sites.
  corsnone: { cors: 'named', sameSite: 'None' }
};

const SESSIONS = new Map(); // cookieValue -> csrfToken

function modeOf (url) {
  const m = (new URL(url, 'http://x')).searchParams.get('mode');
  return MODES[m] ? m : 'today';
}

function applyCors (req, res, mode) {
  const spec = MODES[mode];
  const origin = req.headers.origin;
  if (spec.cors === 'any') {
    // Program.cs: policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-growth-csrf');
    return;
  }
  // The proposed policy: name the web origins, allow credentials, vary on Origin.
  res.setHeader('Vary', 'Origin');
  if (origin && NAMED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-growth-csrf');
  }
}

function json (res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const mode = modeOf(req.url);
  const path = req.url.split('?')[0];
  applyCors(req, res, mode);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ---- Endpoint 3: open the session, set the cookie -------------------------------------------
  if (req.method === 'POST' && path === '/v1/growth/preference-sessions') {
    const cookieValue = 'sess-' + mode;
    const csrf = 'csrf-' + mode;
    SESSIONS.set(cookieValue, csrf);
    // Per-mode cookie NAME so four variants can be exercised in one browser profile without one
    // topology's cookie satisfying another's read. Attributes are what is under test, not the name.
    const attrs = [
      'gr_pref_' + mode + '=' + cookieValue,
      'HttpOnly',
      'Secure',
      'SameSite=' + MODES[mode].sameSite,
      'Path=/v1/growth'
    ];
    res.setHeader('Set-Cookie', attrs.join('; '));
    json(res, 200, { csrfToken: csrf, setCookie: attrs.join('; ') });
    return;
  }

  // ---- Endpoint 4: the preferences read the exit criterion names -------------------------------
  if (req.method === 'GET' && path === '/v1/growth/preference-session/preferences') {
    const raw = req.headers.cookie || '';
    const want = 'gr_pref_' + mode + '=sess-' + mode;
    const cookiePresent = raw.split(/;\s*/).includes(want);
    const csrfHeader = req.headers['x-growth-csrf'];
    if (!cookiePresent) {
      // This is GrowthPreferenceController.TryAuthorizeSession's deny-closed branch.
      json(res, 401, { code: 'growth.session_invalid', cookieAttached: false });
      return;
    }
    if (csrfHeader !== SESSIONS.get('sess-' + mode)) {
      json(res, 401, { code: 'growth.session_invalid', cookieAttached: true, csrf: false });
      return;
    }
    json(res, 200, { cookieAttached: true, channel: 'Email', purpose: 'Newsletter', standing: 'subscribed' });
    return;
  }

  json(res, 404, { code: 'not_found' });
});

server.listen(PORT, () => {
  process.stdout.write('api-stub listening on ' + PORT + '\n');
});
