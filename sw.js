// Service worker: aplicația merge și fără net după prima deschidere (citirea cu modelul cere net).
// Fișierele proprii: rețea întâi, cache ca rezervă (deci o versiune nouă ajunge la prima deschidere cu net).
// pdf.js de pe cdnjs: cache întâi (e fixat pe versiune).
const CACHE = 'pray-names-v18';
const PROPRII = ['./', './index.html', './style.css', './app.js', './ocr.js', './reguli.js', './nume.js', './nume-date.js', './lexic.js', './foaie.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(PROPRII);
    try { await c.addAll(CDN); } catch (err) { console.warn('pdf.js nu a putut fi pus în cache acum', err); }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.includes('googleapis') || u.hostname.includes('anthropic')) return;
  if (u.origin === location.origin) {
    const cheie = new Request(u.origin + u.pathname);   // fără ?proba etc.
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(resp => {   // no-cache = revalidare cu ETag, ca o versiune nouă să ajungă imediat, nu după 10 min de HTTP cache
      if (resp.ok) caches.open(CACHE).then(c => c.put(cheie, resp.clone()));
      return resp;
    }).catch(() => caches.match(cheie).then(r => r || caches.match('./index.html'))));
  } else if (u.hostname === 'cdnjs.cloudflare.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => { if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone())); return resp; })));
  }
});
