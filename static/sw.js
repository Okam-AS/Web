// Self-destroying service worker.
// https://github.com/NekR/self-destroying-sw
//
// MÅ versjonskontrolleres og deployes. Vi har skrudd av Workbox
// (pwa.workbox = false i nuxt.config.js), så denne filen er kill-switchen som
// erstatter den gamle caching-service-workeren: den avregistrerer seg selv,
// sletter alle gamle cacher, og tvinger en reload slik at brukerne får ferske
// assets i stedet for gammel, cachet styling.

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames.map(function (name) {
          return caches.delete(name)
        }))
      })
      .then(function () {
        return self.registration.unregister()
      })
      .then(function () {
        return self.clients.matchAll()
      })
      .then(function (clients) {
        clients.forEach(function (client) {
          client.navigate(client.url)
        })
      })
  )
})
