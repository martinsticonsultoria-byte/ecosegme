const CACHE = 'ecosegme-v1'

self.addEventListener('install', e =>
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html']))
  )
)

self.addEventListener('fetch', e => {
  const isAPI = e.request.url.includes('onrender.com')
  if (isAPI) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()))
          return r
        })
        .catch(() => caches.match(e.request))
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  )
})
