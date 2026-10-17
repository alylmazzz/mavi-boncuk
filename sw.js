// Mavi Boncuk — çevrimdışı destek. Sayfalar önce ağdan istenir (her zaman güncel), ağ yoksa son görülen kopya açılır.
// Sürümlü dosyalar (/assets/) önbellekten verilir. Yönetim paneli ve /api hiçbir zaman önbelleğe alınmaz.
const ONBELLEK = 'mb-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(ONBELLEK).then((c) => c.add('/')).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== ONBELLEK).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /^\/(api|yonetim|_vercel)\b/.test(u.pathname)) return;
  if (u.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(r).then((v) => v || fetch(r).then((y) => { if (y.ok) { const k = y.clone(); caches.open(ONBELLEK).then((c) => c.put(r, k)); } return y; })));
    return;
  }
  if (r.mode === 'navigate' || u.pathname.startsWith('/data/')) {
    e.respondWith(fetch(r).then((y) => { if (y.ok) { const k = y.clone(); caches.open(ONBELLEK).then((c) => c.put(r, k)); } return y; })
      .catch(() => caches.match(r).then((v) => v || caches.match('/'))));
  }
});
