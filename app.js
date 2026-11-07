// Pray Names – interfața: încărcare PDF/poze → citire (OCR cu model de vedere) → verificare → foi A6 de tipar, 4 pe A4.
const $ = s => document.querySelector(s);
const CHEIE_LOT = 'pray-names-lot', CHEIE_SET = 'pray-names-setari';
const DPI = 150;   // destul pentru citirea scrisului; poza ~300 KB–1 MB/pagină
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

let lot = { pagini: [] };
let ziProba = null;   // doar la probă locală: ziua „de azi" pentru calendar
const VIATA_MS = 24 * 3600 * 1000;   // paginile încărcate dispar singure după 24 h (hotărârea ei 4.11.2026)
const setari = incarcaSetari();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const idNou = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- pozele stau în IndexedDB (localStorage nu le încape); textul citit în localStorage ----------
const DB = { nume: 'pray-names', magazin: 'poze' };
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB.nume, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(DB.magazin);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function pozaPune(id, img) { try { const d = await db(); await new Promise((res, rej) => { const t = d.transaction(DB.magazin, 'readwrite'); t.objectStore(DB.magazin).put(img, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { console.warn('poza nesalvată', e); } }
async function pozaIa(id) { try { const d = await db(); return await new Promise((res, rej) => { const r = d.transaction(DB.magazin).objectStore(DB.magazin).get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); } catch { return null; } }
async function pozaSterge(id) { try { const d = await db(); d.transaction(DB.magazin, 'readwrite').objectStore(DB.magazin).delete(id); } catch {} }
async function pozeGoleste() { try { const d = await db(); d.transaction(DB.magazin, 'readwrite').objectStore(DB.magazin).clear(); } catch {} }

// ---------- setări ----------
function incarcaSetari() { try { return Object.assign({ furnizor: 'gemini', cheie: '', model: '', aspect: { ...FOAIE.IMPLICIT } }, JSON.parse(localStorage.getItem(CHEIE_SET) || '{}')); } catch { return { furnizor: 'gemini', cheie: '', model: '', aspect: { ...FOAIE.IMPLICIT } }; } }
function salveazaSetari() { try { localStorage.setItem(CHEIE_SET, JSON.stringify(setari)); } catch {} }
setari.aspect = Object.assign({ ...FOAIE.IMPLICIT }, setari.aspect || {});

// ---------- memoria de corecturi (învață din ce corectezi la pasul 2) ----------
const CHEIE_INV = 'pray-names-invatat';
let memInv = INVATAT.gol();
try { const m = JSON.parse(localStorage.getItem(CHEIE_INV) || 'null'); if (m && m.corectii) memInv = m; } catch {}
function salveazaInvatat() { try { localStorage.setItem(CHEIE_INV, JSON.stringify(memInv)); } catch {} }
REGULI.seteazaExceptii(INVATAT.listaNume(memInv));   // cuvintele pe care ea le-a declarat nume nu se mai scot ca „cuvinte obișnuite"

// ---------- cheia API pe telefon (7.11.2026) ----------
// Cheia NU se pune în depozitul public (oricine ar putea să-ți consume cota). Se mută de pe un dispozitiv pe altul printr-un link
// cu cheia după „#" (partea de după # nu pleacă niciodată către server): pe calculator apare ca cod QR, telefonul îl scanează,
// aplicația se deschide, își ia cheia în setări și șterge „#…" din adresă.
const ADRESA_APP = 'https://almeueste777-ops.github.io/pray-names/';
const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
function linkCuCheie(cheie, furnizor) { return `${ADRESA_APP}#cheie=${encodeURIComponent(cheie)}&furnizor=${furnizor}`; }
let cheiePrimita = false;
(function preiaCheieDinLink() {
  const m = location.hash.match(/^#cheie=([^&]+)(?:&furnizor=(gemini|claude))?/);
  if (!m) return;
  try {
    const cheie = decodeURIComponent(m[1]).trim();
    if (/^[\w.\-]{16,300}$/.test(cheie)) { setari.cheie = cheie; if (m[2]) setari.furnizor = m[2]; salveazaSetari(); cheiePrimita = true; }
  } catch {}
  history.replaceState(null, '', location.pathname + location.search);   // cheia dispare din bara de adresă și din istoric
})();
(function umpleModele() {
  const sel = $('#set-model');
  for (const m of OCR.MODELE_GEMINI) { const o = document.createElement('option'); o.value = m.id; o.textContent = `${m.nume}${m.peZi ? ` (${m.peZi} pagini/zi)` : ' (cotă necunoscută)'}`; sel.appendChild(o); }
  const f = $('#asp-font'); for (const x of FOAIE.FONTURI) { const o = document.createElement('option'); o.value = x.nume; o.textContent = x.nume; f.appendChild(o); }
})();
$('#btn-setari').onclick = () => { const d = $('#setari'); d.returnValue = ''; $('#set-furnizor').value = setari.furnizor; $('#set-cheie').value = setari.cheie; $('#set-model').value = setari.model; d.showModal(); };
$('#setari').addEventListener('close', () => {
  if ($('#setari').returnValue !== 'ok') return;
  setari.furnizor = $('#set-furnizor').value; setari.cheie = $('#set-cheie').value.trim(); setari.model = $('#set-model').value.trim();
  salveazaSetari(); actualizeazaButoane();
});
// ---------- actualizări + istoric (7.11.2026) ----------
const FISIERE_APP = ['index.html', 'style.css', 'app.js', 'ocr.js', 'reguli.js', 'nume.js', 'nume-date.js', 'limba-date.js', 'lexic.js', 'invatat.js', 'foaie.js', 'istoric.js', 'sw.js', 'manifest.webmanifest'];
function versiuneaMea() { return (window.ISTORIC && ISTORIC[0] && ISTORIC[0].versiune) || null; }
function deseneazaIstoric() {
  const c = $('#act-istoric'); c.textContent = '';
  for (const v of (window.ISTORIC || [])) {
    const d = document.createElement('div'); d.className = 'ist-versiune';
    const h = document.createElement('b'); h.textContent = (v.versiune ? `Versiunea ${v.versiune} · ` : '') + v.data; d.appendChild(h);
    const ul = document.createElement('ul'); for (const p of v.puncte) { const li = document.createElement('li'); li.textContent = p; ul.appendChild(li); }
    d.appendChild(ul); c.appendChild(d);
  }
}
async function versiuneaDePeNet() {
  const r = await fetch('sw.js?verifica=' + Date.now(), { cache: 'no-store' });
  const m = (await r.text()).match(/pray-names-v(\d+)/);
  return m ? +m[1] : null;
}
$('#btn-actualizari').onclick = async () => {
  const st = $('#act-stare'), mea = versiuneaMea();
  $('#act-versiune').textContent = mea ? `Ai versiunea ${mea}.` : '';
  deseneazaIstoric(); st.textContent = 'Se verifică ce e nou…'; $('#actualizari').showModal();
  try {
    const nou = await versiuneaDePeNet();
    st.textContent = nou && mea && nou > mea ? `Există versiunea ${nou}. Apasă „Actualizează aplicația".` : `Ai ultima versiune${mea ? ' (' + mea + ')' : ''}. Poți apăsa totuși butonul dacă ceva nu arată bine.`;
  } catch { st.textContent = 'Nu pot verifica acum (fără internet?).'; }
};
$('#btn-actualizeaza').onclick = async () => {
  const st = $('#act-stare'); st.textContent = 'Se descarcă ultima versiune…';
  try {
    // 1) fișierele se iau de pe net, ocolind memoria browserului; 2) se șterge memoria aplicației; 3) se reîncarcă.
    //    Pomelnicele încărcate, pozele și setările (cheia) NU se ating.
    await Promise.all(FISIERE_APP.map(f => fetch(f + '?v=' + Date.now(), { cache: 'reload' }).then(() => fetch(f, { cache: 'reload' }))));
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    st.textContent = 'Gata, se reîncarcă…';
    setTimeout(() => location.reload(), 400);
  } catch (e) { st.textContent = 'Nu s-a putut actualiza (fără internet?). Încearcă din nou.'; }
};

// cheia pe telefon: cod QR + link de copiat
function incarcaScript(src) {
  return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('nu s-a putut încărca generatorul de cod QR (fără internet?)')); document.head.appendChild(s); });
}
$('#btn-telefon').onclick = async () => {
  const cheie = $('#set-cheie').value.trim() || setari.cheie, furnizor = $('#set-furnizor').value || setari.furnizor;
  const qr = $('#qr'), camp = $('#telefon-link');
  qr.textContent = '';
  if (!cheie) { qr.textContent = 'Întâi lipește cheia în căsuța „Cheia API” și apasă Salvează.'; camp.value = ''; $('#telefon').showModal(); return; }
  const link = linkCuCheie(cheie, furnizor); camp.value = link;
  $('#telefon').showModal();
  try {
    await incarcaScript(QR_LIB);
    const q = window.qrcode(0, 'M'); q.addData(link); q.make();
    qr.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });   // SVG generat de bibliotecă din date numerice, fără text de la utilizator
  } catch (e) { qr.textContent = e.message + ' Folosește linkul de mai jos.'; }
};
$('#btn-copiaza-link').onclick = async () => {
  const camp = $('#telefon-link'); camp.select();
  try { await navigator.clipboard.writeText(camp.value); $('#btn-copiaza-link').textContent = 'Copiat ✓'; } catch { document.execCommand && document.execCommand('copy'); }
};
$('#telefon').addEventListener('close', () => { $('#qr').textContent = ''; $('#telefon-link').value = ''; $('#btn-copiaza-link').textContent = 'Copiază linkul'; });   // cheia nu rămâne în pagină
// aspectul foii (pasul 3)
for (const [id, cheie] of [['#asp-font', 'font'], ['#asp-chenar', 'chenar'], ['#asp-culoare', 'culoare'], ['#asp-pe-coala', 'peCoala']]) {
  const el = $(id); el.value = setari.aspect[cheie];
  el.onchange = () => { setari.aspect[cheie] = el.value; salveazaSetari(); deseneazaFoi(); };
}
// foaia-calendar
(function calendar() {
  const cb = $('#cal-activ');
  cb.checked = !!setari.aspect.calendar;
  cb.onchange = () => { setari.aspect.calendar = cb.checked; salveazaSetari(); deseneazaFoi(); };
})();
// mărimea literei: scrisă de ea (pt) sau automată
(function marime() {
  const nr = $('#asp-marime'), auto = $('#asp-auto');
  const arata = () => { auto.checked = setari.aspect.marime === 'auto'; nr.disabled = auto.checked; nr.value = auto.checked ? (setari.aspect.ultimaMarime || 18) : setari.aspect.marime; };
  nr.onchange = () => { const v = Math.min(48, Math.max(8, +nr.value || 18)); setari.aspect.marime = v; setari.aspect.ultimaMarime = v; salveazaSetari(); arata(); deseneazaFoi(); };
  auto.onchange = () => { setari.aspect.marime = auto.checked ? 'auto' : (setari.aspect.ultimaMarime || 18); salveazaSetari(); arata(); deseneazaFoi(); };
  arata();
})();

// ---------- cota zilnică Gemini ----------
function deseneazaCota() {
  const el = $('#cota'); if (setari.furnizor !== 'gemini') { el.textContent = 'Claude: fără cotă gratuită, se plătește pe pagină.'; el.className = 'cota'; return; }
  const c = OCR.cota(setari);
  const necitite = lot.pagini.filter(p => p.stare !== 'citit' && (p.img || p.areImg)).length;
  let cls = 'cota', text;
  if (c.toateEpuizate) { cls += ' gata'; text = `Gemini nu mai primește pagini azi. Se reface la ${c.reset}.`; }
  else if (c.peZi == null) text = `<b>${esc(c.nume)}</b> · azi ${c.folosite} pagini citite · cotă necunoscută`;
  else {
    const proc = Math.min(100, Math.round(100 * c.folosite / c.peZi));
    if (c.ramase <= 10) cls += ' putin';
    text = `<b>${esc(c.nume)}</b> · azi ${c.folosite} din ${c.peZi} pagini <span class="bara-cota"><i style="width:${proc}%"></i></span> mai ai voie <b>${c.ramase}</b>` + (necitite > c.ramase ? ` · ai ${necitite} de citit: restul mâine după ${c.reset}` : '');
  }
  el.className = cls; el.innerHTML = text;
}

// ---------- pași ----------
document.querySelectorAll('.pasi button').forEach(b => b.onclick = () => aratăPas(+b.dataset.pas));
function aratăPas(n) {
  document.querySelectorAll('.pas').forEach(p => p.classList.toggle('ascuns', p.id !== 'pas-' + n));
  document.querySelectorAll('.pasi button').forEach(b => b.classList.toggle('activ', +b.dataset.pas === n));
  if (n === 2) { deseneazaVerificare(); actualizeazaButoaneReaplicare(); }
  if (n === 3) deseneazaFoi();
  window.scrollTo(0, 0);
}

// ---------- pasul 1: încărcare ----------
$('#btn-alege').onclick = () => $('#fisiere').click();
$('#fisiere').onchange = e => { const f = [...e.target.files]; e.target.value = ''; adaugaFisiere(f); };
const zona = $('#zona-incarcare');
zona.ondragover = e => { e.preventDefault(); zona.classList.add('peste'); };
zona.ondragleave = () => zona.classList.remove('peste');
zona.ondrop = e => { e.preventDefault(); zona.classList.remove('peste'); adaugaFisiere([...e.dataTransfer.files]); };

async function adaugaFisiere(fisiere) {
  const erori = [];
  for (const f of fisiere) {
    try {
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) await adaugaPdf(f);
      else if (f.type.startsWith('image/')) await adaugaPagina(await imagineDinFisier(f), f.name);
      else erori.push(`${f.name}: nu e PDF sau poză`);
    } catch (e) { console.error(e); erori.push(`${f.name}: ${e.message}`); }
  }
  $('#progres').textContent = erori.length ? 'Nu s-au putut încărca: ' + erori.join('; ') : '';
  salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(erori.length === 0);
}
async function adaugaPagina(img, sursa) {
  const p = { id: idNou(), img, mini: await miniatura(img), sursa, stare: 'necitit', creat: Date.now(), data: null, dataText: null, dataAlta: null, sectiuni: [], observatii: '' };
  lot.pagini.push(p); await pozaPune(p.id, img); await pozaPune(p.id + '-mini', p.mini); return p;
}
// miniatură mică pentru grila din pasul 1 (lista rămâne ușoară și la 100 de pagini)
function miniatura(img) {
  return new Promise(res => {
    const i = new Image(); i.onload = () => { const sc = 320 / i.height; const c = document.createElement('canvas'); c.width = Math.round(i.width * sc); c.height = 320; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7)); };
    i.onerror = () => res(null); i.src = img;
  });
}
// poza mare a paginii: din memorie dacă e, altfel din IndexedDB (o singură dată)
async function pozaPaginii(p) { if (!p.img && p.areImg) p.img = await pozaIa(p.id); return p.img; }
// paginile mai vechi de 24 h se șterg singure (și pozele lor)
function curataVechi() {
  const acum = Date.now(), vechi = lot.pagini.filter(p => p.creat && acum - p.creat > VIATA_MS);
  if (!vechi.length) return false;
  for (const p of vechi) { pozaSterge(p.id); pozaSterge(p.id + '-mini'); }
  lot.pagini = lot.pagini.filter(p => !vechi.includes(p));
  salveazaLot(); return vechi.length;
}

async function adaugaPdf(f) {
  $('#progres').textContent = `Se deschide ${f.name}…`;
  const pdfjsLib = await import(PDFJS);
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
  for (let i = 1; i <= pdf.numPages; i++) {
    $('#progres').textContent = `Pagina ${i}/${pdf.numPages} din ${f.name}…`;
    const pag = await pdf.getPage(i);
    const vp = pag.getViewport({ scale: DPI / 72 });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await pag.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    await adaugaPagina(c.toDataURL('image/jpeg', 0.85), `${f.name} p.${i}`);
    deseneazaMiniaturi();
  }
}
function imagineDinFisier(f) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const scara = Math.min(1, 1800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * scara); c.height = Math.round(img.height * scara);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); rej(new Error('poza nu poate fi citită de browser (HEIC? fișier stricat?)')); };
    img.src = URL.createObjectURL(f);
  });
}

function deseneazaMiniaturi() {
  const m = $('#miniaturi'); m.innerHTML = '';
  lot.pagini.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'miniatura';
    const stare = { necitit: '— necitit', citire: '⏳ se citește', citit: '✓ citit', eroare: '✗ eroare' }[p.stare];
    const ore = p.creat ? Math.max(0, Math.round((VIATA_MS - (Date.now() - p.creat)) / 3600000)) : null;
    d.innerHTML = `${p.mini || p.img ? `<img alt="pagina ${i + 1}" loading="lazy" decoding="async">` : '<div class="fara-poza">poza lipsește</div>'}<div>${i + 1}. <span class="stare-${p.stare}">${stare}</span></div>
      ${ore != null ? `<div class="mic">dispare în ${ore} h</div>` : ''}
      <button class="secundar" title="șterge pagina">✕</button>${p.stare === 'citit' ? ' <button class="secundar" title="citește din nou">↻</button>' : ''}`;
    const im = d.querySelector('img'); if (im) { im.src = p.mini || p.img; im.onclick = async () => lupa(await pozaPaginii(p) || p.mini); }
    const [bs, br] = d.querySelectorAll('button');
    bs.onclick = () => { lot.pagini.splice(i, 1); pozaSterge(p.id); pozaSterge(p.id + '-mini'); salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); };
    if (br) br.onclick = () => { p.stare = 'necitit'; salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); };
    m.appendChild(d);
  });
}
function lupa(src) { $('#lupa-img').src = src; $('#lupa').showModal(); }
function actualizeazaButoane(stergeMesaj = true) {
  const necitite = lot.pagini.filter(p => p.stare !== 'citit' && (p.img || p.areImg)).length;
  $('#btn-citeste').disabled = !necitite || !setari.cheie;
  $('#btn-citeste').textContent = necitite && necitite < lot.pagini.length ? `🔍 Citește paginile rămase (${necitite})` : '🔍 Citește toate paginile';
  if (lot.pagini.length && !setari.cheie) $('#progres').textContent = 'Pune cheia API în ⚙ ca să poți citi.';
  else if (stergeMesaj) $('#progres').textContent = '';
  deseneazaCota();
}
$('#btn-goleste').onclick = () => { if (confirm('Ștergi tot lotul încărcat?')) { lot = { pagini: [] }; pozeGoleste(); salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); } };

// ---------- citirea ----------
$('#btn-citeste').onclick = async () => {
  const deCitit = lot.pagini.map((p, i) => [p, i]).filter(([p]) => p.stare !== 'citit' && (p.img || p.areImg));
  if (setari.furnizor === 'gemini') {
    const c = OCR.cota(setari);
    if (c.toateEpuizate) { alert(`Gemini nu mai primește pagini azi. Cota se reface la ${c.reset}.`); return; }
    if (c.ramase != null && deCitit.length > c.ramase && !confirm(`Azi mai ai voie ${c.ramase} pagini pe ${c.nume}, dar sunt ${deCitit.length} de citit. Citesc câte se poate, restul rămân pentru mâine după ${c.reset}. Continui?`)) return;
  }
  $('#btn-citeste').disabled = true;
  let n = 0, oprit = false;
  for (const [p, i] of deCitit) {
    p.stare = 'citire'; deseneazaMiniaturi();
    $('#progres').textContent = `Se citește pagina ${i + 1} (${++n}/${deCitit.length})…`;
    try {
      const img = await pozaPaginii(p); if (!img) throw new Error('poza paginii nu mai e în browser');
      const r = await OCR.citestePagina(img, setari);
      aplicaCitirea(p, r); p.stare = 'citit'; p.eroare = '';
    } catch (e) {
      p.stare = e.cotaZi ? 'necitit' : 'eroare'; p.eroare = e.cotaZi ? '' : e.message; console.error(e);
      if (e.cotaZi) { oprit = true; salveazaLot(); deseneazaMiniaturi(); break; }
    }
    salveazaLot(); deseneazaMiniaturi(); deseneazaCota();
  }
  const erori = lot.pagini.filter(p => p.stare === 'eroare').length;
  const ramase = lot.pagini.filter(p => p.stare === 'necitit' && (p.img || p.areImg)).length;
  $('#progres').textContent = oprit ? `Gemini și-a terminat cota pe azi; ${ramase} pagini rămân pentru mâine după 10:00 (ora României).`
    : erori ? `Gata, dar ${erori} pagini cu eroare (apasă din nou ca să reîncerci).` : 'Gata. Treci la pasul 2 · Verifică.';
  actualizeazaButoane(false);
  if (!erori && !oprit) aratăPas(2);
};
// ---------- reaplicarea regulilor noi pe paginile DEJA citite (7.11.2026) ----------
// Regulile noi se aplicau doar la pagini citite după actualizare; paginile încărcate înainte rămâneau cu regulile vechi.
// Aici se refac din răspunsul modelului (păstrat de acum încolo în `p.ocr`) sau, la paginile vechi, din rândurile originale.
// Paginile pe care ai corectat ceva de mână NU se ating (decât dacă alegi „toate"); înainte de aplicare se face o copie, cu „Anulează".
const CHEIE_COPIE = 'pray-names-lot-inainte';
const fd = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't').toLowerCase().replace(/^[jy]/, 'i');
function paginaAtinsa(p) {
  if (p.editata) return true;
  if (p.ocr || p.reaplicata) return false;   // citită după actualizare și nemodificată de tine
  // pagină veche, fără semnul „editată": o ghicim — un nume sigur care nu se află în rândul original, un nume adăugat de mână sau un ctna bifat de tine
  for (const s of p.sectiuni || []) for (const n of s.nume || []) {
    if (!n.original) return true;
    if (n.ctna && !/neam|ctna/i.test(n.original)) return true;
    if (n.sigur && !n.corectat) {
      const orig = new Set(String(n.original).split(/[^\p{L}]+/u).filter(Boolean).map(fd));
      if (String(n.nume).split(/[\s-]+/).filter(t => t && !/\.$/.test(t)).some(t => !orig.has(fd(t)))) return true;
    }
  }
  return false;
}
function brutDinPagina(p) {
  if (p.ocr) return p.ocr;
  return { sectiuni: (p.sectiuni || []).map(s => ({ titlu: '', categorie: s.categorie, cruce: false,
    linii: (s.nume || []).filter(n => n.original && !n.dinRand).map(n => ({ text: n.original, sigur: true })) })), observatii: p.observatii || '' };
}
function reaplicaPagina(p) {
  const vechi = p.sectiuni || [];
  p.sectiuni = (brutDinPagina(p).sectiuni || []).flatMap(s => REGULI.proceseazaSectiuni(s)).filter(s => s.nume.length || (s.scos && s.scos.length));
  INVATAT.aplica(memInv, p.sectiuni);
  if (!p.ocr) for (const s of p.sectiuni) if (vechi.some(v => v.casa && v.categorie === s.categorie)) s.casa = true;   // „cu toată casa lor" bifat înainte
  if (!p.sectiuni.length) p.sectiuni = [{ categorie: 'vii', nume: [], casa: false }];
  p.editata = false; p.reaplicata = true;
}
function reaplicaRegulile(toate) {
  const citite = lot.pagini.filter(p => p.stare === 'citit' && (p.sectiuni || []).length);
  const dePus = citite.filter(p => toate || !paginaAtinsa(p));
  try { localStorage.setItem(CHEIE_COPIE, JSON.stringify({ pagini: lot.pagini.map(p => ({ ...p, img: undefined, mini: undefined, areImg: !!(p.img || p.areImg) })) })); } catch {}
  for (const p of dePus) reaplicaPagina(p);
  salveazaLot(); deseneazaVerificare(); actualizeazaButoaneReaplicare();
  $('#reaplica-stare').textContent = `Gata: regulile noi aplicate pe ${dePus.length} pagini` + (citite.length - dePus.length ? `; ${citite.length - dePus.length} atinse de tine au rămas neschimbate.` : '.') + ' Dacă nu-ți place, apasă „Anulează".';
}
function actualizeazaButoaneReaplicare() {
  const citite = lot.pagini.filter(p => p.stare === 'citit' && (p.sectiuni || []).length);
  const neatinse = citite.filter(p => !paginaAtinsa(p)).length;
  $('#btn-reaplica').textContent = `↻ Aplică regulile noi pe paginile neatinse (${neatinse})`;
  $('#btn-reaplica-toate').textContent = `…pe TOATE (${citite.length}), inclusiv cele corectate de mine`;
  $('#btn-reaplica').disabled = !neatinse; $('#btn-reaplica-toate').disabled = !citite.length;
  let are = false; try { are = !!localStorage.getItem(CHEIE_COPIE); } catch {}
  $('#btn-anuleaza-reaplica').disabled = !are;
}
$('#btn-reaplica').onclick = () => reaplicaRegulile(false);
$('#btn-reaplica-toate').onclick = () => { if (confirm('Pe paginile pe care le-ai corectat de mână, corecturile se pierd (poți apăsa Anulează după). Continui?')) reaplicaRegulile(true); };
$('#btn-anuleaza-reaplica').onclick = async () => {
  try {
    const c = JSON.parse(localStorage.getItem(CHEIE_COPIE) || 'null'); if (!c) return;
    const acum = new Map(lot.pagini.map(p => [p.id, p]));
    lot.pagini = c.pagini.map(p => { const v = acum.get(p.id); return { ...p, img: v && v.img, mini: v && v.mini, areImg: !!(v && (v.img || v.areImg)) || p.areImg }; });
    localStorage.removeItem(CHEIE_COPIE); salveazaLot(); deseneazaVerificare(); actualizeazaButoaneReaplicare();
    $('#reaplica-stare').textContent = 'Am revenit la starea de dinainte.';
  } catch (e) { $('#reaplica-stare').textContent = 'Nu am putut reveni: ' + e.message; }
};

function aplicaCitirea(p, r) {
  p.editata = false;
  p.ocr = r;
  p.dataText = r.data_albastra || null;                       // DOAR data albastră intră pe foaie
  p.dataAlta = (r.alte_date && r.alte_date.length) ? r.alte_date.join(', ') : null;   // se arată ca sugestie
  p.data = REGULI.parseazaData(p.dataText) || null;
  p.observatii = r.observatii || '';
  p.sectiuni = (r.sectiuni || []).flatMap(s => REGULI.proceseazaSectiuni(s)).filter(s => s.nume.length || (s.scos && s.scos.length));   // o secțiune doar cu „scos" rămâne vizibilă la pasul 2
  INVATAT.aplica(memInv, p.sectiuni);   // ce ai corectat tu data trecută se aplică singur
  if (p.sectiuni.length && /\bcu\s+(fii|copii|nepo|toat[ăa]\s+casa)/i.test(p.observatii)) p.sectiuni[0].casa = true;
  if (!p.sectiuni.length) p.sectiuni = [{ categorie: 'vii', nume: [], casa: false }];
}

// ---------- pasul 2: verificare ----------
function deseneazaVerificare() {
  const v = $('#verificare'); v.innerHTML = '';
  lot.pagini.forEach((p, i) => v.appendChild(paginaVerifUI(p, i)));
  actualizeazaContor();
}
// Rândurile „de verificat" = galbene (nesigure sau corectate de dicționar). Contorul, filtrul și „Următorul" te duc direct la ele.
const esteGalben = n => !n.sigur || n.corectat;
function actualizeazaContor() {
  const v = $('#verificare'); if (!v) return;
  const galbene = v.querySelectorAll('.nume-rand.galben-rand').length;
  v.querySelectorAll('.pagina-verif').forEach(el => el.classList.toggle('fara-galben', !el.querySelector('.nume-rand.galben-rand')));
  v.querySelectorAll('.pagina-verif').forEach(el => {   // butonul „Acceptă cele N galbene" arată mereu câte au rămas
    const b = el.querySelector('.accepta-pagina'); if (!b || !el.paginaRef) return;
    const n = el.paginaRef.sectiuni.reduce((a, s) => a + s.nume.filter(x => esteGalben(x) && x.nume && !(x.sugestii && x.sugestii.length)).length, 0);
    b.hidden = !n; b.textContent = `✓ Acceptă galbenele de pe pagină (${n})`;
  });
  const ct = $('#ct-galbene'); if (ct) ct.textContent = galbene ? `${galbene} rânduri de verificat` : '✓ Nimic de verificat';
  const inv = $('#ct-invatat'); if (inv) inv.textContent = INVATAT.numara(memInv) ? `Am învățat ${INVATAT.numara(memInv)} corecturi de la tine` : 'Încă nu am învățat nimic de la tine';
}
function urmatorulGalben(dupa) {
  const toate = [...document.querySelectorAll('#verificare .nume-rand.galben-rand input[type=text]')].filter(i => i.offsetParent);
  const i = dupa ? toate.findIndex(x => x === dupa || (dupa.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING)) : 0;
  const t = toate[i >= 0 ? i : 0]; if (!t) return false;
  t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.focus({ preventScroll: true }); t.select();
  return true;
}
// Ultima căsuță în care a stat cursorul: de la ea pornește „Următorul" (după click pe buton, activeElement e butonul, nu căsuța)
let ultimaCasuta = null;
// Sugestie într-un rând cu două nume („Marin-Ioan"): se schimbă doar numele vizat (cel cu cel mai lung început comun), nu tot rândul.
function aplicaSugestie(nume, sug) {
  const jetoane = String(nume).split('-'); if (jetoane.length < 2) return sug;
  const pref = (a, b) => { a = INVATAT.fd(a); b = INVATAT.fd(b); let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };
  let bun = 0; jetoane.forEach((t, i) => { if (pref(t, sug) > pref(jetoane[bun], sug)) bun = i; });
  jetoane[bun] = sug; return jetoane.join('-');
}
$('#btn-urmator').onclick = () => { if (!urmatorulGalben(ultimaCasuta && document.contains(ultimaCasuta) ? ultimaCasuta : null)) $('#ct-galbene').textContent = '✓ Nimic de verificat'; };
$('#doar-galbene').onchange = e => { $('#verificare').classList.toggle('doar-galbene', e.target.checked); };
$('#btn-uita-invatat').onclick = () => { if (!confirm('Uit tot ce am învățat din corecturile tale? Paginile deja citite nu se schimbă.')) return; memInv = INVATAT.gol(); salveazaInvatat(); REGULI.seteazaExceptii([]); actualizeazaContor(); };
$('#verificare').addEventListener('click', () => setTimeout(actualizeazaContor, 0));
// O schimbare pe o pagină (+ nume, ✕, + secțiune) redesenează DOAR acea pagină. Redesenarea întregii liste golea
// #verificare și pagina sărea la început (bug raportat de ea, 4.11.2026).
function redeseneazaPagina(p) {
  const vechi = [...document.querySelectorAll('#verificare .pagina-verif')].find(el => el.paginaRef === p);
  if (!vechi) { deseneazaVerificare(); return; }
  vechi.replaceWith(paginaVerifUI(p, lot.pagini.indexOf(p)));
}
function paginaVerifUI(p, i) {
  {
    const d = document.createElement('div'); d.className = 'pagina-verif'; d.paginaRef = p;
    const dreapta = document.createElement('div');
    dreapta.innerHTML = `<h3>Pagina ${i + 1} <span class="mic">(${esc(p.sursa)})</span></h3>
      <label>Data pe foaie: <input type="text" data-camp="data" value="${esc(p.data || '')}" placeholder="zz.ll.aaaa" size="10">
        <span class="mic">albastru: „${esc(p.dataText || '—')}"${p.dataAlta ? `; alt pix: „${esc(p.dataAlta)}" (nu se pune singură)` : ''}</span></label>
      <span class="mic eroare" data-camp="data-eroare"></span>
      ${p.stare === 'eroare' ? `<p class="eroare">Eroare la citire: ${esc(p.eroare)}</p>` : ''}
      ${p.stare !== 'citit' && p.stare !== 'eroare' ? `<p class="eroare">Pagina nu a fost citită încă (pasul 1).</p>` : ''}`;
    // „Acceptă galbenele": un singur click pentru rândurile galbene la care nu e de ales între mai multe nume (cele cu „poate: …" rămân, cer decizia ta)
    const deAcceptat = p.sectiuni.reduce((a, s) => a + s.nume.filter(n => esteGalben(n) && n.nume && !(n.sugestii && n.sugestii.length)).length, 0);
    if (deAcceptat) {
      const h = dreapta.querySelector('h3'), b = document.createElement('button'); b.type = 'button'; b.className = 'secundar accepta-pagina';
      b.textContent = `✓ Acceptă galbenele de pe pagină (${deAcceptat})`; b.title = 'Le las așa cum sunt și țin minte, ca data viitoare să nu mai fie galbene. Rândurile cu „poate: …" rămân, pentru că trebuie să alegi tu.';
      b.onclick = () => {
        for (const s of p.sectiuni) for (const n of s.nume) if (esteGalben(n) && n.nume && !(n.sugestii && n.sugestii.length)) { memInv = INVATAT.invata(memInv, n.original || n.nume, n.nume); n.sigur = true; n.corectat = false; n.invatat = false; }
        p.editata = true; salveazaInvatat(); salveazaLot(); redeseneazaPagina(p); actualizeazaContor();
      };
      h.after(b);
    }
    const inpData = dreapta.querySelector('[data-camp=data]');
    inpData.onchange = () => {
      const t = inpData.value.trim(), n = REGULI.parseazaData(t);
      dreapta.querySelector('[data-camp=data-eroare]').textContent = t && !n ? 'Data nu e înțeleasă; scrie zz.ll.aaaa' : '';
      p.data = n; if (n) inpData.value = n; salveazaLot();
    };
    p.sectiuni.forEach((s, k) => dreapta.appendChild(sectiuneUI(p, s, k)));
    const plus = document.createElement('button'); plus.className = 'secundar'; plus.textContent = '+ secțiune (altă categorie pe aceeași foaie)';
    plus.onclick = () => { p.editata = true; p.sectiuni.push({ categorie: 'adormiti', nume: [], casa: false }); salveazaLot(); redeseneazaPagina(p); };
    dreapta.appendChild(plus);
    if (p.observatii) { const o = document.createElement('div'); o.className = 'obs'; o.textContent = 'Altceva pe foaie (nu se tipărește): ' + p.observatii; dreapta.appendChild(o); }
    if (p.mini || p.img || p.areImg) {   // întâi miniatura (instant), apoi poza mare când ajunge din IndexedDB
      const img = document.createElement('img'); img.src = p.mini || p.img; img.alt = `pagina ${i + 1}`; img.loading = 'lazy'; img.decoding = 'async';
      img.onclick = async () => lupa(await pozaPaginii(p) || p.mini);
      pozaPaginii(p).then(src => { if (src) img.src = src; });
      d.appendChild(img);
    }
    else { const g = document.createElement('div'); g.className = 'fara-poza'; g.textContent = 'Poza nu mai e în browser; textul citit a rămas.'; d.appendChild(g); }
    d.appendChild(dreapta);
    return d;
  }
}
function sectiuneUI(p, s, k) {
  const d = document.createElement('div'); d.className = 'sectiune';
  d.innerHTML = `<div class="antet">
      <select data-camp="categorie"><option value="vii">Vii</option><option value="adormiti">✝ Adormiți</option></select>
      <label><input type="checkbox" data-camp="casa"> „cu toată casa lor"</label>
      <button class="secundar" data-camp="adauga">+ nume</button>
      ${p.sectiuni.length > 1 ? '<button class="secundar" data-camp="sterge-sectiune">✕ secțiunea</button>' : ''}
    </div>${s.scos && s.scos.length ? `<div class="scos" title="cuvinte care nu sunt nume: nu se tipăresc">Scos din listă (nu sunt nume): ${s.scos.map(w => /^\p{L}{3,}$/u.test(w) ? `<button type="button" class="chip scos-cuv" data-scos="${esc(w)}" title="Dacă „${esc(w)}" e de fapt un nume, apasă: îl pun în listă și țin minte">${esc(w)} <span aria-hidden="true">↩ e nume</span></button>` : `<b>${esc(w)}</b>`).join(' ')}</div>` : ''}<div class="nume-lista"></div>`;
  d.querySelector('[data-camp=categorie]').value = s.categorie;
  d.querySelector('[data-camp=categorie]').onchange = e => { p.editata = true; s.categorie = e.target.value; salveazaLot(); };
  d.querySelector('[data-camp=casa]').checked = !!s.casa;
  d.querySelector('[data-camp=casa]').onchange = e => { p.editata = true; s.casa = e.target.checked; salveazaLot(); };
  // se redesenează doar secțiunea (pagina nu sare); cursorul intră direct în căsuța nouă
  const redeseneaza = () => { const nou = sectiuneUI(p, s, k); d.replaceWith(nou); return nou; };
  d.querySelector('[data-camp=adauga]').onclick = () => {
    p.editata = true; s.nume.push({ nume: '', sigur: true, original: '' }); salveazaLot();
    const casute = redeseneaza().querySelectorAll('.nume-rand input[type=text]'); const ultima = casute[casute.length - 1];
    if (ultima) ultima.focus({ preventScroll: true });
  };
  // „Scos din listă": un cuvânt care e de fapt nume se pune la loc și aplicația ține minte (nu-l mai scoate niciodată)
  d.querySelectorAll('[data-scos]').forEach(b => { b.onclick = () => {
    const w = b.dataset.scos, nume = w.charAt(0).toUpperCase() + w.slice(1);
    // dacă cuvântul seamănă cu un prenume („castel" ~ Costel), nu-l învăț ca nume: îl pun galben, cu corectura ca sugestie
    const c = REGULI.corecteazaNume(w);
    if (c.corectat && c.nume) s.nume.push({ nume: c.nume, sigur: false, corectat: true, original: w, sugestii: [nume] });
    else {
      memInv = INVATAT.declaraNume(memInv, nume); salveazaInvatat(); REGULI.seteazaExceptii(INVATAT.listaNume(memInv));
      s.nume.push({ nume, sigur: false, original: w, sugestii: c.sugestii || [] });
    }
    const i = s.scos.indexOf(w); if (i >= 0) s.scos.splice(i, 1);
    p.editata = true; salveazaLot();
    redeseneaza(); actualizeazaContor();
  }; });
  const bs = d.querySelector('[data-camp=sterge-sectiune]'); if (bs) bs.onclick = () => { p.editata = true; p.sectiuni.splice(k, 1); salveazaLot(); redeseneazaPagina(p); };
  const lista = d.querySelector('.nume-lista');
  s.nume.forEach((n, j) => {
    const r = document.createElement('div'); r.className = 'nume-rand';
    const nesigur = esteGalben(n);
    r.className = 'nume-rand' + (nesigur ? ' galben-rand' : '');
    const sugestii = (n.sugestii || []).map(x => `<button type="button" class="chip" data-sug="${esc(x)}" title="pune acest nume">${esc(x)}</button>`).join('');
    r.innerHTML = `<span class="mic">${j + 1}.</span><input type="text" class="${nesigur ? 'nesigur' : ''}" value="${esc(n.nume)}">
      <span class="orig" title="cum a citit modelul">${nesigur && n.original ? '„' + esc(n.original) + '"' : ''}${sugestii ? ' poate: ' + sugestii : ''}${n.dinRand ? ' (de pe același rând)' : ''}${n.invatat ? ' <i title="am pus singură, din corecturile tale de data trecută">✓ învățat</i>' : ''}</span>
      ${nesigur ? '<button type="button" class="secundar ok-rand" title="Corect așa (Enter) — țin minte și trec la următorul">✓</button>' : ''}
      <label class="mic" title="cu tot neamul lui cel adormit"><input type="checkbox" data-camp="ctna"> ctna</label><button class="secundar" data-camp="sterge" title="șterge">✕</button>`;
    const inp = r.querySelector('input[type=text]');
    // Un rând galben rezolvat (corectat de tine, ales din sugestii sau doar confirmat) se ține minte: data viitoare nu mai e galben.
    const rezolva = valoare => {
      const eraGalben = esteGalben(n), eraInvatat = !!n.invatat, citit = n.invatatDin || n.original || n.nume;
      if (!valoare && eraGalben) return false;   // un rând galben golit rămâne galben, nu devine „rezolvat" fără nume
      p.editata = true; n.nume = valoare; n.sigur = true; n.corectat = false; delete n.sugestii; n.invatat = false;
      if ((eraGalben || eraInvatat) && valoare) {   // și corectura peste un rând învățat se ține minte (sau se uită, dacă ea revine la ce citise modelul)
        memInv = (eraInvatat && n.original && valoare === String(n.original).trim()) ? INVATAT.uita(memInv, citit) : INVATAT.invata(memInv, citit, valoare);
        salveazaInvatat();
      }
      inp.value = valoare; inp.classList.remove('nesigur'); r.classList.remove('galben-rand');
      r.querySelector('.orig').textContent = ''; const ok = r.querySelector('.ok-rand'); if (ok) ok.remove();
      salveazaLot(); actualizeazaContor();
      return true;
    };
    inp.onfocus = () => { ultimaCasuta = inp; };
    inp.onchange = () => { const v = inp.value.trim(); if (v !== n.nume || esteGalben(n)) rezolva(v); };
    inp.onkeydown = e => {
      if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;   // Enter care doar încheie o compoziție (IME) nu înseamnă „gata"
      e.preventDefault(); const v = inp.value.trim(), eraGalben = esteGalben(n);
      if (v !== n.nume || eraGalben) rezolva(v);
      if (eraGalben) urmatorulGalben(inp);   // pe un rând deja bun (ex. nume nou din „+ nume") Enter nu te mută în altă parte
    };
    const okb = r.querySelector('.ok-rand'); if (okb) okb.onclick = () => { if (rezolva(inp.value.trim())) urmatorulGalben(inp); };
    r.querySelectorAll('[data-sug]').forEach(b => { b.onclick = () => { if (rezolva(aplicaSugestie(n.nume, b.dataset.sug))) urmatorulGalben(inp); }; });
    const cb = r.querySelector('[data-camp=ctna]'); cb.checked = !!n.ctna; cb.onchange = () => { p.editata = true; n.ctna = cb.checked; salveazaLot(); };
    r.querySelector('[data-camp=sterge]').onclick = () => { p.editata = true; s.nume.splice(j, 1); salveazaLot(); redeseneaza(); };
    lista.appendChild(r);
  });
  return d;
}
$('#btn-data-toate').onclick = () => {
  const d = REGULI.parseazaData($('#data-implicita').value.trim()); if (!d) { alert('Scrie data ca zz.ll.aaaa'); return; }
  lot.pagini.forEach(p => { if (!p.data) p.data = d; }); salveazaLot(); deseneazaVerificare();
};

// ---------- pasul 3: foile ----------
function deseneazaFoi() {
  const az = FOAIE.asezare(setari.aspect);
  const peisaj = az.coala === 'landscape', CW = peisaj ? 297 : 210, CH = (peisaj ? 210 : 297) - 0.5;
  let st = document.getElementById('orientare'); if (!st) { st = document.createElement('style'); st.id = 'orientare'; document.head.appendChild(st); }
  st.textContent = `@page { size: A4 ${peisaj ? 'landscape' : 'portrait'}; margin: 0; }`;
  const coala = (cls) => { const a4 = document.createElement('div'); a4.className = 'a4 asz-' + setari.aspect.peCoala + (taiere ? ' taiere' : '') + (peisaj ? ' peisaj' : '') + (cls ? ' ' + cls : '');
    a4.style.width = CW + 'mm'; a4.style.height = CH + 'mm'; a4.style.gridTemplateColumns = `repeat(${az.coloane}, ${az.W}mm)`; a4.style.gridTemplateRows = `repeat(${az.randuri}, ${az.H}mm)`;
    const inv = document.createElement('div'); inv.className = 'coala-inv'; inv.style.setProperty('--w', CW + 'mm'); inv.style.setProperty('--h', CH + 'mm'); inv.appendChild(a4); a4.inv = inv; return a4; };
  const foi = REGULI.construiesteFoi(lot.pagini, az.maxNume);
  const a4uri = REGULI.grupeazaA4(foi, az.coloane * az.randuri);
  const automate = foi.filter(f => f.dataAutomata).length;
  $('#rezumat-foi').textContent = `${foi.length} pomelnice pe ${a4uri.length} coli A4 (câte ${az.coloane * az.randuri}, A4 ${peisaj ? 'peisaj' : 'portret'})` + (automate ? ` · ${automate} foi fără dată au primit ${REGULI.dataTiparirii()} (azi + 7 zile)` : '');
  const cont = $('#foi'); cont.innerHTML = '';
  cont.style.setProperty('--sigur', FOAIE.SIGUR + 'mm');   // același număr cu care se desenează rama (foaie.js)
  const taiere = $('#linii-taiere').checked;
  FOAIE.incarcaFont(setari.aspect.font);
  a4uri.forEach(grup => {
    const a4 = coala('');
    for (let k = 0; k < az.coloane * az.randuri; k++) {
      const f = grup[k]; const d = document.createElement('div'); d.className = 'a6'; d.style.width = az.W + 'mm'; d.style.height = az.H + 'mm';
      if (f) d.innerHTML = FOAIE.html(f, setari.aspect);
      a4.appendChild(d);
    }
    cont.appendChild(a4.inv);
  });
  if (setari.aspect.calendar) {   // coala-calendar, prima din teanc
    const a4 = coala('coala-calendar');
    for (let k = 0; k < az.coloane * az.randuri; k++) { const d = document.createElement('div'); d.className = 'a6'; d.style.width = az.W + 'mm'; d.style.height = az.H + 'mm'; d.innerHTML = FOAIE.calendarHtml(ziProba || new Date(), setari.aspect); a4.appendChild(d); }
    cont.prepend(a4.inv);
  }
  const potriveste = () => { for (const a6 of cont.querySelectorAll('.a6')) FOAIE.potriveste(a6, setari.aspect); };
  scaleazaColile();
  potriveste();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(potriveste);   // după ce vine fontul de pe net, măsurăm din nou
}
// previzualizarea se scalează după lățimea disponibilă (telefon, tabletă, monitor); la tipar scara e 1
function scaleazaColile() {
  const cont = $('#foi'), prima = cont.querySelector('.a4'); if (!prima) return;
  const latimeMm = parseFloat(prima.style.width) || 210, px = latimeMm * 96 / 25.4;
  const disponibil = cont.clientWidth || document.documentElement.clientWidth;
  cont.style.setProperty('--scara', String(Math.min(1, disponibil / px)));
}
window.addEventListener('resize', scaleazaColile);
window.addEventListener('beforeprint', () => $('#foi').style.setProperty('--scara', '1'));
window.addEventListener('afterprint', scaleazaColile);
$('#btn-tipareste').onclick = () => window.print();
$('#linii-taiere').onchange = deseneazaFoi;

// ---------- persistență: textul în localStorage (fără poze), pozele în IndexedDB ----------
function salveazaLot() {
  try { localStorage.setItem(CHEIE_LOT, JSON.stringify({ pagini: lot.pagini.map(p => ({ ...p, img: undefined, mini: undefined, areImg: !!(p.img || p.areImg) })) })); }
  catch (e) { $('#progres').textContent = 'Nu pot salva lotul în browser (spațiu plin?). Nu închide pagina până nu tipărești.'; console.warn(e); }
}
async function incarcaLot() {
  try {
    const l = JSON.parse(localStorage.getItem(CHEIE_LOT) || 'null'); if (!l || !l.pagini) return;
    const acum = Date.now();
    const inainte = l.pagini.length;
    l.pagini = l.pagini.filter(p => !(p.creat && acum - p.creat > VIATA_MS) || (pozaSterge(p.id), pozaSterge(p.id + '-mini'), false));   // 24 h
    const sterse = inainte - l.pagini.length;
    await Promise.all(l.pagini.map(async p => { p.id = p.id || idNou(); p.mini = await pozaIa(p.id + '-mini'); if (!p.mini) p.img = await pozaIa(p.id); p.areImg = !!(p.img || p.areImg || p.mini); if (p.stare === 'citire') p.stare = 'necitit'; }));
    lot = l; if (sterse) salveazaLot();
  } catch (e) { console.warn(e); }
}

// Probă fără cheie, doar local: ?proba=probe/lot.json cu [{img, sursa, raspuns}] unde raspuns = JSON-ul pe care l-ar da modelul.
async function incarcaProba() {
  const u = new URLSearchParams(location.search), proba = u.get('proba'), pdf = u.get('pdf');
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (local && pdf && /^probe\/[\w.-]+\.pdf$/.test(pdf)) {   // probă pentru calea pdf.js: încarcă un PDF din probe/ ca și cum ar fi ales din fereastră
    const b = await (await fetch(pdf)).blob();
    await adaugaFisiere([new File([b], pdf.split('/').pop(), { type: 'application/pdf' })]);
    document.body.dataset.pdfGata = String(lot.pagini.length); return true;
  }
  if (!proba || !local || !/^probe\/[\w.-]+\.json$/.test(proba)) return false;
  if (u.get('peCoala')) setari.aspect.peCoala = u.get('peCoala');   // doar la probă locală
  if (u.get('calendar')) { setari.aspect.calendar = true; ziProba = new Date(u.get('calendar')); }
  const pag = await (await fetch(proba)).json();
  lot = { pagini: pag.map(x => { const p = { id: idNou(), img: x.img, sursa: x.sursa, stare: 'citit', creat: Date.now(), data: null, sectiuni: [], observatii: '' }; aplicaCitirea(p, x.raspuns); return p; }) };
  aratăPas(+(u.get('pas') || 2)); return true;
}

(async () => {
  if (!(await incarcaProba())) await incarcaLot();
  deseneazaMiniaturi(); actualizeazaButoane();
  if (cheiePrimita) $('#progres').textContent = '✓ Cheia API a fost pusă pe acest dispozitiv. O poți schimba din ⚙ Setări.';
  setInterval(() => { if (curataVechi()) { deseneazaMiniaturi(); actualizeazaButoane(); } }, 60000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
