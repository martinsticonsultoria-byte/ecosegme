const CACHE = 'ecosegme-v2'

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/index.html'])))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

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

  // Navegação (HTML): sempre busca a versão mais nova na rede primeiro.
  // Cai pro cache só se estiver offline — evita ficar preso num shell
  // antigo apontando pra um bundle .js que já foi substituído no deploy.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Demais assets: stale-while-revalidate — responde do cache na hora
  // (rápido, funciona offline) mas sempre atualiza o cache em segundo
  // plano, então nunca fica travado numa versão velha pra sempre.
  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          c.put(e.request, res.clone())
          return res
        }).catch(() => cached)
        return cached || network
      })
    )
  )
})
