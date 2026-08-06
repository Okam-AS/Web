// Cross-site topology harness — page side.
//
// One server, deliberately reachable under TWO hostnames, which is the whole design:
//   http://localhost:3907  -> CROSS-SITE  to the API at http://127.0.0.1:4907
//   http://127.0.0.1:3907  -> SAME-SITE   to the API at http://127.0.0.1:4907  (port is not "site")
//
// The page issues the same two calls `utils/growth/growth-guest-client.js` issues — POST
// /v1/growth/preference-sessions then GET /v1/growth/preference-session/preferences with
// `credentials: 'include'` and the X-Growth-Csrf double-submit header — and reports, per topology,
// what the BROWSER did. A request the browser refuses to send surfaces as a thrown TypeError with no
// status; that is the CORS break. A request that is sent but arrives without the cookie surfaces as
// 401 growth.session_invalid; that is the SameSite break. The two are distinguishable on purpose.

const http = require('http');

const PORT = 3907;
const API = 'http://127.0.0.1:4907';

const PAGE = `<!doctype html>
<meta charset="utf-8">
<title>Growth preference-centre origin harness</title>
<h1 id="site"></h1>
<table id="out" border="1" cellpadding="6"><thead><tr>
<th>topology</th><th>CORS policy</th><th>cookie SameSite</th><th>session open</th><th>preferences read</th><th>verdict</th>
</tr></thead><tbody></tbody></table>
<pre id="done"></pre>
<script>
const API = ${JSON.stringify(API)};
const MODES = [
  ['today',    'AllowAnyOrigin (as deployed)', 'Strict'],
  ['corsonly', 'named origin + credentials',   'Strict'],
  ['corslax',  'named origin + credentials',   'Lax'],
  ['corsnone', 'named origin + credentials',   'None; Secure']
];

function describe (e) {
  // A browser-refused cross-origin request is a TypeError with no response object at all.
  return e && e.name ? e.name + ': ' + e.message : String(e);
}

async function run (mode) {
  const row = { open: '', read: '', verdict: '' };
  let csrf = null;
  try {
    const r = await fetch(API + '/v1/growth/preference-sessions?mode=' + mode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'harness-token-not-a-real-credential' }),
      credentials: 'include'
    });
    const b = await r.json();
    csrf = b.csrfToken;
    row.open = r.status + ' ok';
  } catch (e) {
    row.open = 'BLOCKED BY BROWSER (' + describe(e) + ')';
    row.read = 'never reached';
    row.verdict = 'FAIL — preflight refused before the cookie mattered';
    return row;
  }
  try {
    const r = await fetch(API + '/v1/growth/preference-session/preferences?mode=' + mode, {
      method: 'GET',
      headers: { 'X-Growth-Csrf': csrf },
      credentials: 'include'
    });
    const b = await r.json();
    row.read = r.status + ' ' + (b.code || 'ok') + ' · cookieAttached=' + b.cookieAttached;
    row.verdict = (r.status === 200 && b.cookieAttached === true)
      ? 'PASS — cookie attached, 200'
      : 'FAIL — cookie not attached';
  } catch (e) {
    row.read = 'BLOCKED BY BROWSER (' + describe(e) + ')';
    row.verdict = 'FAIL — read refused';
  }
  return row;
}

(async () => {
  document.getElementById('site').textContent =
    'page origin ' + location.origin + '  ->  API ' + API +
    (location.hostname === 'localhost' ? '   [CROSS-SITE]' : '   [SAME-SITE, cross-origin]');
  const tbody = document.querySelector('#out tbody');
  for (const [mode, cors, ss] of MODES) {
    const r = await run(mode);
    const tr = document.createElement('tr');
    for (const cell of [mode, cors, ss, r.open, r.read, r.verdict]) {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  document.getElementById('done').textContent = 'HARNESS COMPLETE';
})();
</script>`;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(PAGE);
}).listen(PORT, () => process.stdout.write('page-server listening on ' + PORT + '\n'));
