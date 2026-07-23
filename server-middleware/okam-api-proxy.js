// Same-origin proxy for deckhand previews: the client is built with API_BASE_URL=/okam-api and
// this middleware forwards those calls to the local backend, so the preview works through the
// tunnel without CORS or a public API host.
// Note: http-proxy-middleware v1 restores req.originalUrl before proxying, so the /okam-api
// prefix must be stripped with pathRewrite or the backend receives the prefixed path (404).
const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = createProxyMiddleware({
  target: process.env.OKAM_API_PROXY_TARGET || 'http://127.0.0.1:5080',
  changeOrigin: true,
  pathRewrite: { '^/okam-api': '' }
})
