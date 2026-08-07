// The consumer-web TLS front end for the guest-exit world.
//
// ---- WHY THE PAGE HAS TO BE SERVED OVER https, WHICH IS NOT A PREFERENCE -----------------------
//
// `GrowthUnsubscribePageLink.BuildUri` REFUSES any `Growth:UnsubscribePageBaseUrl` that is not an
// absolute `https://` origin, and it refuses fail-closed — a dispatch whose exit link cannot be
// composed does not go out at all. So a world serving the page over plain http cannot produce a
// dispatched message in the first place, and a journey that opened a link it had built for itself
// would be proving the page rather than the exit.
//
// The second reason is the browser's. The page is loaded from the consumer-web origin and fetches
// the API on a DIFFERENT one; if the page were https and the API were not, or the other way about,
// Chromium would block the request as mixed content before any CORS decision was ever made — and
// the run would fail for a reason that has nothing to do with what is being measured.
//
// ---- WHY A PROXY RATHER THAN https ON `nuxt dev` ----------------------------------------------
//
// `test/e2e/scripts/dev-server.js` is the one place that knows how to start this app for a journey
// — it borrows `core/`, it sets `API_BASE_URL` on the process that COMPILES the bundle, and it puts
// the submodule back on the way out. Teaching it TLS would mean either editing a file three other
// journeys depend on or duplicating it. This sits in front instead: `nuxt dev` is started exactly as
// every other journey starts it, on loopback http, and this terminates TLS in front of it. Nothing
// about the app under test changes.
//
// ---- THE CERTIFICATE IS THE WORLD'S, AND IT IS NEVER INSTALLED ANYWHERE ------------------------
//
// The backend world generates one self-signed certificate per run and writes it beside its
// handshake; this reads that same pair. So the API and the page are served under ONE trust anchor,
// which is what lets the journey's own preflight verify TLS properly (`NODE_EXTRA_CA_CERTS`) instead
// of being told to skip verification. Nothing is added to the system keychain and nothing outlives
// the run directory.

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const runDir = process.env.GROWTH_GUEST_EXIT_WORLD_DIR;
const listenPort = Number(process.env.GROWTH_GUEST_EXIT_WEB_PORT);
const upstreamPort = Number(process.env.GROWTH_GUEST_EXIT_UPSTREAM_PORT);

if (!runDir || !listenPort || !upstreamPort) {
  process.stderr.write(
    'growth-guest-exit-web-tls: GROWTH_GUEST_EXIT_WORLD_DIR, GROWTH_GUEST_EXIT_WEB_PORT and ' +
    'GROWTH_GUEST_EXIT_UPSTREAM_PORT are all required. This is started by ' +
    'test/e2e/scripts/growth-guest-exit-world.sh, not by hand.\n');
  process.exit(2);
}

const tlsDir = path.join(runDir, 'tls');
const options = {
  cert: fs.readFileSync(path.join(tlsDir, 'cert.pem')),
  key: fs.readFileSync(path.join(tlsDir, 'key.pem'))
};

/** Pipes one request to `nuxt dev` and its answer back, headers and status untouched. */
function forward (request, response) {
  const upstream = http.request({
    host: '127.0.0.1',
    port: upstreamPort,
    method: request.method,
    path: request.url,
    headers: request.headers
  }, (answer) => {
    response.writeHead(answer.statusCode, answer.headers);
    answer.pipe(response);
  });

  upstream.on('error', (error) => {
    // 502 rather than a hang: a dev server that died mid-run must read as a dead upstream in the
    // journey's `failedRequests`, not as a navigation timeout eighty lines in.
    response.writeHead(502, { 'content-type': 'text/plain' });
    response.end('guest-exit TLS front end: nuxt dev on 127.0.0.1:' + upstreamPort + ' — ' + error.message);
  });

  request.pipe(upstream);
}

/**
 * Nuxt 2's dev client opens a websocket for hot reload. It is not part of anything under test, but a
 * refused upgrade lands in the page's console as an error and console errors go into the artifact —
 * so it is proxied rather than dropped, and the record stays about the product.
 */
function forwardUpgrade (request, socket, head) {
  const upstream = http.request({
    host: '127.0.0.1',
    port: upstreamPort,
    method: request.method,
    path: request.url,
    headers: request.headers
  });

  upstream.on('upgrade', (answer, upstreamSocket, upstreamHead) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      Object.entries(answer.headers).map(([k, v]) => k + ': ' + v).join('\r\n') +
      '\r\n\r\n');
    if (upstreamHead && upstreamHead.length) { socket.unshift(upstreamHead); }
    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  if (head && head.length) { upstream.write(head); }
  upstream.end();
}

// BOTH LOOPBACK FAMILIES, on purpose. The page origin is spelled `localhost` so that it is a
// different HOST from the API's `127.0.0.1` — a different origin AND a different site, which is the
// shape a deployment has and the shape a same-port-different-path harness cannot reproduce. But
// `localhost` resolves to ::1 on this machine and to 127.0.0.1 in some clients, and a front end
// bound to only one of them fails for whichever client picked the other, with a connection error
// that reads like a dead server.
const hosts = ['127.0.0.1', '::1'];
let listening = 0;

for (const host of hosts) {
  const server = https.createServer(options, forward);
  server.on('upgrade', forwardUpgrade);
  server.on('error', (error) => {
    if (error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT') { return; }
    process.stderr.write('growth-guest-exit-web-tls: ' + host + ':' + listenPort + ' — ' + error.message + '\n');
    process.exit(1);
  });
  server.listen(listenPort, host, () => {
    listening += 1;
    process.stdout.write('[guest-exit-tls] https://' + (host === '::1' ? '[::1]' : host) + ':' + listenPort +
      ' -> http://127.0.0.1:' + upstreamPort + '\n');
  });
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => process.exit(0));
}
