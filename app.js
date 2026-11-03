// Pray Names – interfața: încărcare PDF/poze → citire (OCR cu model de vedere) → verificare → foi A6 de tipar, 4 pe A4.
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const $ = s => document.querySelector(s);
const CHEIE_LOT = 'pray-names-lot', CHEIE_SET = 'pray-names-setari';
const DPI = 150;   // destul pentru citirea scrisului; poza ~1 MB/pagină

let lot = { pagini: [] };
const setari = incarcaSetari();

// ---------- setări ----------
function incarcaSetari() { try { return Object.assign({ furnizor: 'gemini', cheie: '', model: '' }, JSON.parse(localStorage.getItem(CHEIE_SET) || '{}')); } catch { return { furnizor: 'gemini', cheie: '', model: '' }; } }
function salveazaSetari() { try { localStorage.setItem(CHEIE_SET, JSON.stringify(setari)); } catch {} }
$('#btn-setari').onclick = () => { $('#set-furnizor').value = setari.furnizor; $('#set-cheie').value = setari.cheie; $('#set-model').value = setari.model; $('#setari').showModal(); };
$('#setari').addEventListener('close', () => {
  if ($('#setari').returnValue !== 'ok') return;
  setari.furnizor = $('#set-furnizor').value; setari.cheie = $('#set-cheie').value.trim(); setari.model = $('#set-model').value.trim();
  salveazaSetari(); actualizeazaButoane();
});

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
$('#fisiere').onchange = e => adaugaFisiere([...e.target.files]);
const zona = $('#zona-incarcare');
zona.ondragover = e => { e.preventDefault(); zona.classList.add('peste'); };
zona.ondragleave = () => zona.classList.remove('peste');
zona.ondrop = e => { e.preventDefault(); zona.classList.remove('peste'); adaugaFisiere([...e.dataTransfer.files]); };

async function adaugaFisiere(fisiere) {
  for (const f of fisiere) {
    if (f.type === 'application/pdf') await adaugaPdf(f);
    else if (f.type.startsWith('image/')) lot.pagini.push(paginaNoua(await imagineDinFisier(f), f.name));
  }
  salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane();
}
function paginaNoua(img, sursa) { return { img, sursa, stare: 'necitit', data: null, dataText: null, sectiuni: [], observatii: '' }; }

async function adaugaPdf(f) {
  const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
  for (let i = 1; i <= pdf.numPages; i++) {
    $('#progres').textContent = `Pagina ${i}/${pdf.numPages} din ${f.name}…`;
    const pag = await pdf.getPage(i);
    const vp = pag.getViewport({ scale: DPI / 72 });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await pag.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    lot.pagini.push(paginaNoua(c.toDataURL('image/jpeg', 0.85), `${f.name} p.${i}`));
  }
  $('#progres').textContent = '';
}
function imagineDinFisier(f) {
  return new Promise(res => {
    const img = new Image(); img.onload = () => {
      const scara = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * scara; c.height = img.height * scara;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.85));
    }; img.src = URL.createObjectURL(f);
  });
}

function deseneazaMiniaturi() {
  const m = $('#miniaturi'); m.innerHTML = '';
  lot.pagini.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'miniatura';
    const stare = { necitit: '— necitit', citire: '⏳ se citește', citit: '✓ citit', eroare: '✗ eroare' }[p.stare];
    d.innerHTML = `<img src="${p.img}" alt="pagina ${i + 1}"><div>${i + 1}. <span class="stare-${p.stare}">${stare}</span></div><button class="secundar" data-sterge="${i}">✕</button>`;
    d.querySelector('img').onclick = () => lupa(p.img);
    d.querySelector('button').onclick = () => { lot.pagini.splice(i, 1); salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); };
    m.appendChild(d);
  });
}
function lupa(src) { $('#lupa-img').src = src; $('#lupa').showModal(); }
function actualizeazaButoane() {
  const necitite = lot.pagini.filter(p => p.stare !== 'citit').length;
  $('#btn-citeste').disabled = !necitite || !setari.cheie;
  $('#btn-citeste').textContent = necitite && necitite < lot.pagini.length ? `🔍 Citește paginile rămase (${necitite})` : '🔍 Citește toate paginile';
  $('#progres').textContent = lot.pagini.length && !setari.cheie ? 'Pune cheia API în ⚙ ca să poți citi.' : '';
}
$('#btn-goleste').onclick = () => { if (confirm('Ștergi tot lotul încărcat?')) { lot = { pagini: [] }; salveazaLot(); deseneazaMiniaturi(); actualizeazaButoane(); } };

// ---------- citirea ----------
$('#btn-citeste').onclick = async () => {
  $('#btn-citeste').disabled = true;
  const deCitit = lot.pagini.map((p, i) => [p, i]).filter(([p]) => p.stare !== 'citit');
  let n = 0;
  for (const [p, i] of deCitit) {
    p.stare = 'citire'; deseneazaMiniaturi();
    $('#progres').textContent = `Se citește pagina ${i + 1} (${++n}/${deCitit.length})…`;
    try {
      const r = await OCR.citestePagina(p.img, setari);
      aplicaCitirea(p, r); p.stare = 'citit';
    } catch (e) { p.stare = 'eroare'; p.eroare = e.message; console.error(e); }
    salveazaLot(); deseneazaMiniaturi();
  }
  const erori = lot.pagini.filter(p => p.stare === 'eroare').length;
  $('#progres').textContent = erori ? `Gata, dar ${erori} pagini cu eroare (apasă din nou ca să reîncerci).` : 'Gata. Treci la pasul 2 · Verifică.';
  actualizeazaButoane();
  if (!erori) aratăPas(2);
};
function aplicaCitirea(p, r) {
  p.ocr = r;
  p.dataText = r.data_albastra || (r.alte_date && r.alte_date[0]) || null;
  p.data = REGULI.parseazaData(p.dataText) || p.data;
  p.observatii = r.observatii || '';
  p.sectiuni = r.sectiuni.map(s => {
    const sec = REGULI.proceseazaSectiune(s);
    sec.casa = sec.casa || /cu\s+(fii|copii|nepo|toat[ăa]\s+casa)/i.test(p.observatii);
    return sec;
  }).filter(s => s.nume.length);
  if (!p.sectiuni.length) p.sectiuni = [{ categorie: 'vii', nume: [], casa: false }];
}

// ---------- pasul 2: verificare ----------
function deseneazaVerificare() {
  const v = $('#verificare'); v.innerHTML = '';
  lot.pagini.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'pagina-verif';
    const dreapta = document.createElement('div');
    dreapta.innerHTML = `<h3>Pagina ${i + 1} <span class="mic">(${p.sursa})</span></h3>
      <label>Data pe foaie: <input type="text" data-camp="data" value="${p.data || ''}" placeholder="zz.ll.aaaa" size="10"> <span class="mic">citit: „${p.dataText || '—'}"</span></label>
      ${p.stare === 'eroare' ? `<p class="eroare">Eroare la citire: ${p.eroare}</p>` : ''}
      ${p.stare === 'necitit' ? `<p class="eroare">Pagina nu a fost citită încă (pasul 1).</p>` : ''}`;
    dreapta.querySelector('[data-camp=data]').onchange = e => { p.data = e.target.value.trim() || null; salveazaLot(); };
    p.sectiuni.forEach((s, k) => dreapta.appendChild(sectiuneUI(p, s, k)));
    const plus = document.createElement('button'); plus.className = 'secundar'; plus.textContent = '+ secțiune (altă categorie pe aceeași foaie)';
    plus.onclick = () => { p.sectiuni.push({ categorie: 'adormiti', nume: [], casa: false }); salveazaLot(); deseneazaVerificare(); };
    dreapta.appendChild(plus);
    if (p.observatii) { const o = document.createElement('div'); o.className = 'obs'; o.textContent = 'Altceva pe foaie (nu se tipărește): ' + p.observatii; dreapta.appendChild(o); }
    const img = document.createElement('img'); img.src = p.img; img.alt = `pagina ${i + 1}`; img.onclick = () => lupa(p.img);
    d.appendChild(img); d.appendChild(dreapta); v.appendChild(d);
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
    r.innerHTML = `<span class="mic">${j + 1}.</span><input type="text" class="${nesigur ? 'nesigur' : ''}" value="${(n.nume || '').replace(/"/g, '&quot;')}">
      <span class="orig" title="cum a citit modelul">${nesigur && n.original ? '„' + n.original + '"' : ''}</span><button class="secundar" title="șterge">✕</button>`;
    const inp = r.querySelector('input');
    inp.onchange = () => { n.nume = inp.value.trim(); n.sigur = true; n.corectat = false; inp.classList.remove('nesigur'); salveazaLot(); };
    r.querySelector('button').onclick = () => { s.nume.splice(j, 1); salveazaLot(); deseneazaVerificare(); };
    lista.appendChild(r);
  });
  return d;
}
$('#btn-data-toate').onclick = () => {
  const d = $('#data-implicita').value.trim(); if (!d) return;
  lot.pagini.forEach(p => { if (!p.data) p.data = d; }); salveazaLot(); deseneazaVerificare();
};

// ---------- pasul 3: foile ----------
function deseneazaFoi() {
  const foi = REGULI.construiesteFoi(lot.pagini);
  const a4uri = REGULI.grupeazaA4(foi);
  $('#rezumat-foi').textContent = `${foi.length} foi A6 pe ${a4uri.length} coli A4`;
  const cont = $('#foi'); cont.innerHTML = '';
  const taiere = $('#linii-taiere').checked;
  a4uri.forEach(grup => {
    const a4 = document.createElement('div'); a4.className = 'a4' + (taiere ? ' taiere' : '');
    for (let k = 0; k < 4; k++) {
      const f = grup[k]; const d = document.createElement('div'); d.className = 'a6';
      if (f) {
        const marime = f.nume.length <= 8 ? 20 : f.nume.length <= 12 ? 17 : 14;
        d.innerHTML = `<div class="titlu ${f.categorie}">${f.categorie === 'adormiti' ? 'ADORMIȚI' : 'VII'}</div>
          ${f.continuare ? '<div class="cont">(continuare)</div>' : ''}
          <ol class="lista" style="font-size:${marime}pt">${f.nume.map(n => `<li>${esc(n)}</li>`).join('')}</ol>
          ${f.casa ? '<div class="casa">cu toată casa lor</div>' : ''}
          <div class="data">${esc(f.data || '')}</div>`;
      }
      a4.appendChild(d);
    }
    cont.appendChild(a4);
  });
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
$('#btn-tipareste').onclick = () => window.print();
$('#linii-taiere').onchange = deseneazaFoi;

// ---------- persistență (fără poze, ca să încapă în localStorage) ----------
function salveazaLot() {
  try { localStorage.setItem(CHEIE_LOT, JSON.stringify({ pagini: lot.pagini.map(p => ({ ...p, img: p.img.length < 300000 ? p.img : null })) })); } catch {}
}
(function incarcaLot() {
  try { const l = JSON.parse(localStorage.getItem(CHEIE_LOT) || 'null'); if (l && l.pagini) { l.pagini = l.pagini.filter(p => p.img); lot = l; } } catch {}
})();

// Probă fără cheie: ?proba=probe/lot.json cu [{img, sursa, raspuns}] unde raspuns = JSON-ul pe care l-ar da modelul.
const proba = new URLSearchParams(location.search).get('proba');
if (proba) fetch(proba).then(r => r.json()).then(pag => {
  lot = { pagini: pag.map(x => { const p = paginaNoua(x.img, x.sursa); aplicaCitirea(p, x.raspuns); p.stare = 'citit'; return p; }) };
  deseneazaMiniaturi(); actualizeazaButoane(); aratăPas(+(new URLSearchParams(location.search).get('pas') || 2));
});

deseneazaMiniaturi(); actualizeazaButoane();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
