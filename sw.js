// Service worker: aplicația merge și fără net după prima deschidere (citirea cu modelul cere net).
const CACHE = 'pray-names-v1';
const FISIERE = ['./', './index.html', './style.css', './app.js', './ocr.js', './reguli.js', './nume.js', './manifest.webmanifest', './icons/icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FISIERE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.includes('googleapis') || u.hostname.includes('anthropic')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    if (resp.ok && (u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com')) { const copie = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
    return resp;
  })));
});
