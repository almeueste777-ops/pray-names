// Pray Names – interfața: încărcare PDF/poze → citire (OCR cu model de vedere) → verificare → foi A6 de tipar, 4 pe A4.
const $ = s => document.querySelector(s);
const CHEIE_LOT = 'pray-names-lot', CHEIE_SET = 'pray-names-setari';
const DPI = 150;   // destul pentru citirea scrisului; poza ~300 KB–1 MB/pagină
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

let lot = { pagini: [] };
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
// aspectul foii (pasul 3)
for (const [id, cheie] of [['#asp-font', 'font'], ['#asp-chenar', 'chenar'], ['#asp-culoare', 'culoare'], ['#asp-pe-coala', 'peCoala']]) {
  const el = $(id); el.value = setari.aspect[cheie];
  el.onchange = () => { setari.aspect[cheie] = el.value; salveazaSetari(); deseneazaFoi(); };
}
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
  const necitite = lot.pagini.filter(p => p.stare !== 'citit' && p.img).length;
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
  if (n === 2) deseneazaVerificare();
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
  const p = { id: idNou(), img, sursa, stare: 'necitit', data: null, dataText: null, dataAlta: null, sectiuni: [], observatii: '' };
  lot.pagini.push(p); await pozaPune(p.id, img); return p;
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
    d.innerHTML = `${p.img ? `<img alt="pagina ${i + 1}">` : '<div class="fara-poza">poza lipsește</div>'}<div>${i + 1}. <span class="stare-${p.stare}">${stare}</span></div>
      <button class="secundar" title="șterge pagina">✕</button>${p.stare === 'citit' ? ' <button class="secundar" title="citește din nou">↻</button>' : ''}`;
    if (p.img) { d.querySelector('img').src = p.img; d.querySelector('img').onclick = () => lupa(p.img); }
    const [bs, br] = d.querySelectorAll('button');
    bs.onclick = () => { lot.pagini.splice(i, 1); pozaSterge(p.id); salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); };
    if (br) br.onclick = () => { p.stare = 'necitit'; salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); };
    m.appendChild(d);
  });
}
function lupa(src) { $('#lupa-img').src = src; $('#lupa').showModal(); }
function actualizeazaButoane(stergeMesaj = true) {
  const necitite = lot.pagini.filter(p => p.stare !== 'citit' && p.img).length;
  $('#btn-citeste').disabled = !necitite || !setari.cheie;
  $('#btn-citeste').textContent = necitite && necitite < lot.pagini.length ? `🔍 Citește paginile rămase (${necitite})` : '🔍 Citește toate paginile';
  if (lot.pagini.length && !setari.cheie) $('#progres').textContent = 'Pune cheia API în ⚙ ca să poți citi.';
  else if (stergeMesaj) $('#progres').textContent = '';
  deseneazaCota();
}
$('#btn-goleste').onclick = () => { if (confirm('Ștergi tot lotul încărcat?')) { lot = { pagini: [] }; pozeGoleste(); salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); } };

// ---------- citirea ----------
$('#btn-citeste').onclick = async () => {
  const deCitit = lot.pagini.map((p, i) => [p, i]).filter(([p]) => p.stare !== 'citit' && p.img);
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
      const r = await OCR.citestePagina(p.img, setari);
      aplicaCitirea(p, r); p.stare = 'citit'; p.eroare = '';
    } catch (e) {
      p.stare = e.cotaZi ? 'necitit' : 'eroare'; p.eroare = e.cotaZi ? '' : e.message; console.error(e);
      if (e.cotaZi) { oprit = true; salveazaLot(); deseneazaMiniaturi(); break; }
    }
    salveazaLot(); deseneazaMiniaturi(); deseneazaCota();
  }
  const erori = lot.pagini.filter(p => p.stare === 'eroare').length;
  const ramase = lot.pagini.filter(p => p.stare === 'necitit' && p.img).length;
  $('#progres').textContent = oprit ? `Gemini și-a terminat cota pe azi; ${ramase} pagini rămân pentru mâine după 10:00 (ora României).`
    : erori ? `Gata, dar ${erori} pagini cu eroare (apasă din nou ca să reîncerci).` : 'Gata. Treci la pasul 2 · Verifică.';
  actualizeazaButoane(false);
  if (!erori && !oprit) aratăPas(2);
};
function aplicaCitirea(p, r) {
  p.ocr = r;
  p.dataText = r.data_albastra || null;                       // DOAR data albastră intră pe foaie
  p.dataAlta = (r.alte_date && r.alte_date.length) ? r.alte_date.join(', ') : null;   // se arată ca sugestie
  p.data = REGULI.parseazaData(p.dataText) || null;
  p.observatii = r.observatii || '';
  p.sectiuni = (r.sectiuni || []).flatMap(s => REGULI.proceseazaSectiuni(s)).filter(s => s.nume.length);
  if (p.sectiuni.length && /\bcu\s+(fii|copii|nepo|toat[ăa]\s+casa)/i.test(p.observatii)) p.sectiuni[0].casa = true;
  if (!p.sectiuni.length) p.sectiuni = [{ categorie: 'vii', nume: [], casa: false }];
}

// ---------- pasul 2: verificare ----------
function deseneazaVerificare() {
  const v = $('#verificare'); v.innerHTML = '';
  lot.pagini.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'pagina-verif';
    const dreapta = document.createElement('div');
    dreapta.innerHTML = `<h3>Pagina ${i + 1} <span class="mic">(${esc(p.sursa)})</span></h3>
      <label>Data pe foaie: <input type="text" data-camp="data" value="${esc(p.data || '')}" placeholder="zz.ll.aaaa" size="10">
        <span class="mic">albastru: „${esc(p.dataText || '—')}"${p.dataAlta ? `; alt pix: „${esc(p.dataAlta)}" (nu se pune singură)` : ''}</span></label>
      <span class="mic eroare" data-camp="data-eroare"></span>
      ${p.stare === 'eroare' ? `<p class="eroare">Eroare la citire: ${esc(p.eroare)}</p>` : ''}
      ${p.stare !== 'citit' && p.stare !== 'eroare' ? `<p class="eroare">Pagina nu a fost citită încă (pasul 1).</p>` : ''}`;
    const inpData = dreapta.querySelector('[data-camp=data]');
    inpData.onchange = () => {
      const t = inpData.value.trim(), n = REGULI.parseazaData(t);
      dreapta.querySelector('[data-camp=data-eroare]').textContent = t && !n ? 'Data nu e înțeleasă; scrie zz.ll.aaaa' : '';
      p.data = n; if (n) inpData.value = n; salveazaLot();
    };
    p.sectiuni.forEach((s, k) => dreapta.appendChild(sectiuneUI(p, s, k)));
    const plus = document.createElement('button'); plus.className = 'secundar'; plus.textContent = '+ secțiune (altă categorie pe aceeași foaie)';
    plus.onclick = () => { p.sectiuni.push({ categorie: 'adormiti', nume: [], casa: false }); salveazaLot(); deseneazaVerificare(); };
    dreapta.appendChild(plus);
    if (p.observatii) { const o = document.createElement('div'); o.className = 'obs'; o.textContent = 'Altceva pe foaie (nu se tipărește): ' + p.observatii; dreapta.appendChild(o); }
    if (p.img) { const img = document.createElement('img'); img.src = p.img; img.alt = `pagina ${i + 1}`; img.onclick = () => lupa(p.img); d.appendChild(img); }
    else { const g = document.createElement('div'); g.className = 'fara-poza'; g.textContent = 'Poza nu mai e în browser; textul citit a rămas.'; d.appendChild(g); }
    d.appendChild(dreapta); v.appendChild(d);
  });
}
function sectiuneUI(p, s, k) {
  const d = document.createElement('div'); d.className = 'sectiune';
  d.innerHTML = `<div class="antet">
      <select data-camp="categorie"><option value="vii">Vii</option><option value="adormiti">✝ Adormiți</option></select>
      <label><input type="checkbox" data-camp="casa"> „cu toată casa lor"</label>
      <button class="secundar" data-camp="adauga">+ nume</button>
      ${p.sectiuni.length > 1 ? '<button class="secundar" data-camp="sterge-sectiune">✕ secțiunea</button>' : ''}
    </div><div class="nume-lista"></div>`;
  d.querySelector('[data-camp=categorie]').value = s.categorie;
  d.querySelector('[data-camp=categorie]').onchange = e => { s.categorie = e.target.value; salveazaLot(); };
  d.querySelector('[data-camp=casa]').checked = !!s.casa;
  d.querySelector('[data-camp=casa]').onchange = e => { s.casa = e.target.checked; salveazaLot(); };
  d.querySelector('[data-camp=adauga]').onclick = () => { s.nume.push({ nume: '', sigur: true, original: '' }); salveazaLot(); deseneazaVerificare(); };
  const bs = d.querySelector('[data-camp=sterge-sectiune]'); if (bs) bs.onclick = () => { p.sectiuni.splice(k, 1); salveazaLot(); deseneazaVerificare(); };
  const lista = d.querySelector('.nume-lista');
  s.nume.forEach((n, j) => {
    const r = document.createElement('div'); r.className = 'nume-rand';
    const nesigur = !n.sigur || n.corectat;
    r.innerHTML = `<span class="mic">${j + 1}.</span><input type="text" class="${nesigur ? 'nesigur' : ''}" value="${esc(n.nume)}">
      <span class="orig" title="cum a citit modelul">${nesigur && n.original ? '„' + esc(n.original) + '"' : ''}</span>
      <label class="mic" title="cu tot neamul lui cel adormit"><input type="checkbox" data-camp="ctna"> ctna</label><button class="secundar" title="șterge">✕</button>`;
    const inp = r.querySelector('input[type=text]');
    inp.onchange = () => { n.nume = inp.value.trim(); n.sigur = true; n.corectat = false; inp.classList.remove('nesigur'); salveazaLot(); };
    const cb = r.querySelector('[data-camp=ctna]'); cb.checked = !!n.ctna; cb.onchange = () => { n.ctna = cb.checked; salveazaLot(); };
    r.querySelector('button').onclick = () => { s.nume.splice(j, 1); salveazaLot(); deseneazaVerificare(); };
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
  const foi = REGULI.construiesteFoi(lot.pagini, az.maxNume);
  const a4uri = REGULI.grupeazaA4(foi, az.coloane * az.randuri);
  const automate = foi.filter(f => f.dataAutomata).length;
  $('#rezumat-foi').textContent = `${foi.length} pomelnice pe ${a4uri.length} coli A4 (câte ${az.coloane * az.randuri})` + (automate ? ` · ${automate} foi fără dată au primit ${REGULI.dataTiparirii()} (azi + 7 zile)` : '');
  const cont = $('#foi'); cont.innerHTML = '';
  const taiere = $('#linii-taiere').checked;
  FOAIE.incarcaFont(setari.aspect.font);
  a4uri.forEach(grup => {
    const a4 = document.createElement('div'); a4.className = 'a4 pe' + (az.coloane * az.randuri) + (taiere ? ' taiere' : '');
    a4.style.gridTemplateColumns = `repeat(${az.coloane}, ${az.W}mm)`; a4.style.gridTemplateRows = `repeat(${az.randuri}, ${az.H}mm)`;
    for (let k = 0; k < az.coloane * az.randuri; k++) {
      const f = grup[k]; const d = document.createElement('div'); d.className = 'a6'; d.style.width = az.W + 'mm'; d.style.height = az.H + 'mm';
      if (f) d.innerHTML = FOAIE.html(f, setari.aspect);
      a4.appendChild(d);
    }
    cont.appendChild(a4);
  });
  const potriveste = () => { for (const a6 of cont.querySelectorAll('.a6')) FOAIE.potriveste(a6, setari.aspect); };
  potriveste();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(potriveste);   // după ce vine fontul de pe net, măsurăm din nou
}
$('#btn-tipareste').onclick = () => window.print();
$('#linii-taiere').onchange = deseneazaFoi;

// ---------- persistență: textul în localStorage (fără poze), pozele în IndexedDB ----------
function salveazaLot() {
  try { localStorage.setItem(CHEIE_LOT, JSON.stringify({ pagini: lot.pagini.map(p => ({ ...p, img: undefined, ocr: undefined })) })); }
  catch (e) { $('#progres').textContent = 'Nu pot salva lotul în browser (spațiu plin?). Nu închide pagina până nu tipărești.'; console.warn(e); }
}
async function incarcaLot() {
  try {
    const l = JSON.parse(localStorage.getItem(CHEIE_LOT) || 'null'); if (!l || !l.pagini) return;
    for (const p of l.pagini) { p.id = p.id || idNou(); p.img = await pozaIa(p.id); if (p.stare === 'citire') p.stare = 'necitit'; }
    lot = l;
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
  if (u.get('peCoala')) setari.aspect.peCoala = +u.get('peCoala');   // doar la probă locală
  const pag = await (await fetch(proba)).json();
  lot = { pagini: pag.map(x => { const p = { id: idNou(), img: x.img, sursa: x.sursa, stare: 'citit', data: null, sectiuni: [], observatii: '' }; aplicaCitirea(p, x.raspuns); return p; }) };
  aratăPas(+(u.get('pas') || 2)); return true;
}

(async () => {
  if (!(await incarcaProba())) await incarcaLot();
  deseneazaMiniaturi(); actualizeazaButoane();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
