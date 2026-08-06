// A backend that satisfies the live preflight and nothing else: 200 "Healthy" on /health, 404 on all
// the rest, and no /__fixture/health. It exists to prove that the preflight cannot tell WHICH backend
// answered -- the same word that the two real worlds on this machine answer with.
const http = require('http');
const PORT = Number(process.argv[2] || 5093);
http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('Healthy'); }
  res.writeHead(404); res.end();
}).listen(PORT, '127.0.0.1', () => process.stdout.write('[stub-api] listening on http://127.0.0.1:' + PORT + '\n'));
