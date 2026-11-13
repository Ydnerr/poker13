/* Service worker Kartu 13: nyimpen gambar kartu, background, dan Firebase SDK di HP / PC.
   Buka kedua dan seterusnya jadi cepat dan hemat kuota. index.html SENGAJA nggak disentuh,
   jadi auto-update halaman tetap jalan seperti biasa.
   Naikin V kalau mau maksa semua orang buang cache lama. */
const V = 'k13-assets-v2';
const FB = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'];
const LOCAL = ['cards/back.webp', 'cover/bg-portrait.svg', 'cover/bg-landscape.svg'];
for (let i = 0; i < 52; i++) LOCAL.push('cards/' + i + '.webp');

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.allSettled([
    ...LOCAL.map(u => c.add(u)), // satu gagal (mis. 404) nggak bikin yang lain batal
    ...FB.map(u => c.add(new Request(u, { mode: 'cors', credentials: 'omit' })))
  ])));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// cards/ dan cover/: langsung dari cache, sambil diam-diam dicek versi terbarunya (kalau lo ganti gambar, muncul di buka berikutnya)
async function swr(r) {
  const u = new URL(r.url), key = u.origin + u.pathname, c = await caches.open(V), hit = await c.match(key);
  const net = fetch(r).then(res => { if (res.ok) c.put(key, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}
// Firebase SDK: URL-nya berversi (10.12.2), isinya nggak pernah berubah
async function cacheFirst(r) {
  const c = await caches.open(V), hit = await c.match(r.url);
  if (hit) return hit;
  const res = await fetch(new Request(r.url, { mode: 'cors', credentials: 'omit' }));
  if (res.ok) c.put(r.url, res.clone());
  return res;
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) { if (/\/(cards|cover)\//.test(u.pathname)) e.respondWith(swr(r)); return; }
  if (u.href.startsWith('https://www.gstatic.com/firebasejs/')) e.respondWith(cacheFirst(r));
});
