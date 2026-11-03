// Regulile de transformare a unui pomelnic citit (OCR) în foi A6 de tipar.
// Funcții pure, fără DOM, ca să poată fi testate în Node. Hotărârile Otiliei (3.11.2026):
//  - pe foaie rămân doar categoria, numele și data; nimic altceva (fără sume, fără rugăminți)
//  - cruce sau „morți" ⇒ adormiți; „acatist", „vii" sau nimic ⇒ vii
//  - două nume pe același rând, același sex ⇒ doar primul; sex diferit ⇒ amândouă
//  - „cu tot neamul lui/ei cel adormit" ⇒ „ctna" după nume
//  - „cu fii(i) (și nepoții)" ⇒ o singură dată, jos: „cu toată casa lor"
//  - data = cea scrisă cu albastru (data când pomelnicul iese)
(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory(require('./nume.js'));
  else root.REGULI = factory(root.NUME);
})(typeof self !== 'undefined' ? self : this, function (NUME) {

  const MAX_NUME_PE_FOAIE = 16;
  const LUNI = { ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6, iul: 7, aug: 8, sep: 9, sept: 9, oct: 10, noi: 11, nov: 11, dec: 12 };
  const ROMANE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };

  function faraDiacritice(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't').toLowerCase();
  }
  function titlu(s) {
    return s.toLowerCase().replace(/(^|[-\s])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
  }
  function levenshtein(a, b) {
    const m = a.length, n = b.length, d = [];
    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  const CANON = new Map(NUME.toate.map(n => [faraDiacritice(n), n]));

  // Un singur prenume → forma canonică din dicționar (dacă există) + sexul.
  function corecteazaNume(token) {
    const cheie = faraDiacritice(token.replace(/^y/i, 'i'));   // „Yoan" → Ioan
    if (CANON.has(cheie)) {
      const n = CANON.get(cheie);
      return { nume: n, sex: NUME.sex.get(n.toLowerCase()), sigur: true, corectat: n !== titlu(token) };
    }
    const toleranta = cheie.length >= 7 ? 2 : 1;
    let best = null, bestD = toleranta + 1;
    for (const [k, n] of CANON) {
      if (Math.abs(k.length - cheie.length) > toleranta) continue;
      const d = levenshtein(k, cheie);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (best) return { nume: best, sex: NUME.sex.get(best.toLowerCase()), sigur: false, corectat: true, original: titlu(token) };
    return { nume: titlu(token), sex: null, sigur: false, corectat: false };
  }

  const RE_CTNA = /cu\s+tot\s+neamul(\s+(lui|ei|lor))?(\s+cel\s+adormit)?|\bc\.?t\.?n\.?a\.?\b/i;
  const RE_CASA = /cu\s+(toat[ăa]\s+casa(\s+lor)?|fii+\b.*|copii+\b.*|nepo[țt]ii?\b.*|familia\b.*)/i;
  const RE_RUGAMINTE = /\b(pt\.?|pentru|se\s+roag[ăa]|s[ăa]n[ăa]tate|spor|succes|amin)\b.*/i;

  // Un rând scris de mână → un nume de tipar (sau null dacă rândul nu e nume).
  function proceseazaLinie(text) {
    let t = (text || '').trim();
    if (!t) return null;
    const ctna = RE_CTNA.test(t); t = t.replace(RE_CTNA, ' ');
    const casa = RE_CASA.test(t); t = t.replace(RE_CASA, ' ');
    t = t.replace(/\(.*?\)/g, ' ').replace(RE_RUGAMINTE, ' ').replace(/\b(lei|ron|euro|eur)\b/gi, ' ');
    const tokens = t.split(/[-–—\/,;+\s]+/).map(x => x.replace(/[^\p{L}]/gu, '')).filter(x => x.length >= 2);
    if (!tokens.length) return null;
    const parti = tokens.map(corecteazaNume);
    if (/\d/.test(text) && parti.every(p => !p.sex)) return null;   // „50 lei", „25 oct": cifre și niciun nume cunoscut
    let alese = parti, sigur = parti.every(p => p.sigur);
    if (parti.length >= 2) {
      const sexe = parti.map(p => p.sex);
      if (sexe.every(s => s) && sexe.every(s => s === sexe[0])) alese = [parti[0]];   // același sex → doar primul
      else if (sexe.some(s => !s)) sigur = false;                                      // sex necunoscut → păstrăm tot, marcăm
    }
    return {
      nume: alese.map(p => p.nume).join('-') + (ctna ? ' ctna' : ''),
      ctna, casa, sigur,
      original: text.trim(),
      corectat: parti.some(p => p.corectat),
    };
  }

  function categorieDinTitlu(titluText, areCruce) {
    const t = faraDiacritice(titluText || '');
    if (areCruce || /adorm|mort|decedat|raposat|\+|†|✝/.test(t)) return 'adormiti';
    return 'vii';   // vii, acatist, liturghie, nimic
  }

  // „20 oct", „15 nov", „4.10", „3-X-2026", „25 octombrie" → dd.mm.yyyy. Anul: cel curent;
  // dacă data ar cădea cu peste 60 de zile în urmă, e anul următor.
  function parseazaData(text, azi) {
    azi = azi || new Date();
    if (!text) return null;
    const t = faraDiacritice(String(text)).replace(/\s+/g, ' ').trim();
    let zi, luna, an;
    let m = t.match(/(\d{1,2})\s*[.\-\/ ]\s*([a-z]{3,})\.?(?:\s*[.\-\/ ]?\s*(\d{4}))?/);
    if (m) { zi = +m[1]; luna = LUNI[m[2].slice(0, 4)] || LUNI[m[2].slice(0, 3)]; an = m[3] && +m[3]; }
    if (!luna) { m = t.match(/(\d{1,2})\s*[.\-\/ ]\s*([ivx]{1,4})\b(?:\s*[.\-\/ ]\s*(\d{4}))?/); if (m) { zi = +m[1]; luna = ROMANE[m[2]]; an = m[3] && +m[3]; } }
    if (!luna) { m = t.match(/(\d{1,2})\s*[.\-\/]\s*(\d{1,2})(?:\s*[.\-\/]\s*(\d{2,4}))?/); if (m) { zi = +m[1]; luna = +m[2]; an = m[3] && (+m[3] < 100 ? 2000 + +m[3] : +m[3]); } }
    if (!zi || !luna || luna < 1 || luna > 12 || zi < 1 || zi > 31) return null;
    if (!an) {
      an = azi.getFullYear();
      const d = new Date(an, luna - 1, zi);
      if ((azi - d) / 86400000 > 60) an++;
    }
    return `${String(zi).padStart(2, '0')}.${String(luna).padStart(2, '0')}.${an}`;
  }

  // O secțiune citită ({titlu, cruce, linii:[{text}]}) → {categorie, nume:[...], casa}
  function proceseazaSectiune(s) {
    const nume = (s.linii || []).map(l => {
      const r = proceseazaLinie(typeof l === 'string' ? l : l.text);
      if (r && typeof l === 'object' && l.sigur === false) r.sigur = false;   // modelul a ezitat la citire
      return r;
    }).filter(Boolean);
    const casa = nume.some(n => n.casa) || RE_CASA.test(s.observatii || '');
    return { categorie: s.categorie === 'adormiti' || s.categorie === 'vii' ? s.categorie : categorieDinTitlu(s.titlu, s.cruce), nume, casa };
  }

  // Paginile verificate → foi A6. O pagină cu vii ȘI adormiți dă două foi. Peste MAX nume → foaie de continuare.
  function construiesteFoi(pagini, max) {
    max = max || MAX_NUME_PE_FOAIE;
    const foi = [];
    pagini.forEach((p, ip) => (p.sectiuni || []).forEach(s => {
      const nume = s.nume.filter(n => n.nume && !n.sters);
      if (!nume.length) return;
      for (let i = 0; i < nume.length; i += max) {
        foi.push({ categorie: s.categorie, nume: nume.slice(i, i + max).map(n => n.nume), casa: !!s.casa && i + max >= nume.length,
          data: p.data, pagina: ip + 1, continuare: i > 0 });
      }
    }));
    return foi;
  }

  function grupeazaA4(foi) { const a4 = []; for (let i = 0; i < foi.length; i += 4) a4.push(foi.slice(i, i + 4)); return a4; }

  return { proceseazaLinie, proceseazaSectiune, categorieDinTitlu, parseazaData, construiesteFoi, grupeazaA4, corecteazaNume, MAX_NUME_PE_FOAIE };
});
