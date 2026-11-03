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

  const MAX_NUME_PE_FOAIE = 14;
  const LUNI = { ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6, iul: 7, aug: 8, sep: 9, sept: 9, oct: 10, noi: 11, nov: 11, dec: 12 };
  const ROMANE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  const ZILE_IN_LUNA = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Titluri clericale/monahale: rămân în fața numelui, nu sunt nume.
  const TITLURI = { pr: 'Pr.', preot: 'Pr.', parintele: 'Pr.', ierom: 'Ierom.', ieromonah: 'Ierom.', ierod: 'Ierod.', ierodiacon: 'Ierod.',
    diac: 'Diac.', diacon: 'Diac.', arhim: 'Arhim.', arhimandrit: 'Arhim.', protos: 'Protos.', protosinghel: 'Protos.',
    monah: 'Monah', monahia: 'Monahia', maica: 'Maica', mon: 'Monah', ps: 'PS', ips: 'IPS', ep: 'Ep.', episcop: 'Ep.', sf: 'Sf.' };
  // Cuvinte de umplutură care nu sunt nume și nu schimbă nimic.
  const STOP = new Set(['si', 'sau', 'de', 'cu', 'la', 'lui', 'ei', 'lor', 'cel', 'cea', 'cei', 'tot', 'toata', 'toti', 'toate', 'din', 'pe',
    'fam', 'familia', 'familiei', 'copiii', 'copii', 'copilul', 'fiul', 'fiica', 'fiii', 'fii', 'fiicele', 'nepotii', 'nepotilor', 'nepoti', 'nepotul', 'nepoata',
    'sotul', 'sotia', 'sotii', 'mama', 'tata', 'tatal', 'bunica', 'bunicul', 'fratele', 'sora', 'fratii', 'robul', 'roaba', 'robii', 'ro', 'lei', 'ron', 'euro', 'eur', 'bani', 'amin']);

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
  // Corecție fuzzy doar de la 5 litere în sus (1 literă) și de la 8 în sus (2 litere); altfel rămâne cum e, marcat nesigur.
  function corecteazaNume(token) {
    let cheie = faraDiacritice(token.replace(/^y/i, 'i'));   // „Yoan" → Ioan
    if (!CANON.has(cheie) && /^j/.test(cheie) && CANON.has('i' + cheie.slice(1))) cheie = 'i' + cheie.slice(1);   // „Joan" (citit de model) → Ioan
    if (CANON.has(cheie)) {
      const n = CANON.get(cheie);
      return { nume: n, sex: NUME.sex.get(n.toLowerCase()), sigur: true, corectat: n !== titlu(token) };
    }
    const toleranta = cheie.length >= 8 ? 2 : cheie.length >= 5 ? 1 : 0;
    let best = null, bestD = toleranta + 1;
    for (const [k, n] of CANON) {
      if (Math.abs(k.length - cheie.length) > toleranta) continue;
      const d = levenshtein(k, cheie);
      if (d < bestD) { bestD = d; best = n; }
    }
    if (best) return { nume: best, sex: NUME.sex.get(best.toLowerCase()), sigur: false, corectat: true, original: titlu(token) };
    return { nume: titlu(token), sex: null, sigur: false, corectat: false };
  }

  // Nume compuse = O SINGURĂ persoană (hotărârea ei 3.11.2026: „Ana-Maria e un nume întreg"); rămân întregi.
  // „Roxana Gabriela", „Marcela Mihaela" sunt două nume → regula „același sex → doar primul".
  const COMPUSE = [['Ana', 'Maria']];
  function lipesteCompuse(parti) {
    const out = [];
    for (let i = 0; i < parti.length; i++) {
      const c = COMPUSE.find(k => k.every((n, j) => parti[i + j] && parti[i + j].nume === n));
      if (c) { out.push({ nume: c.join('-'), sex: parti[i].sex, sigur: parti.slice(i, i + c.length).every(p => p.sigur), corectat: parti.slice(i, i + c.length).some(p => p.corectat) }); i += c.length - 1; }
      else out.push(parti[i]);
    }
    return out;
  }

  const RE_CRUCE = /^\s*[+†✝✞☦]\s*/;
  const RE_CTNA = /\bcu\s+tot\s+neamul(\s+(lui|ei|lor))?(\s+cel\s+adormit)?|\bc\.?t\.?n\.?a\.?\b/i;
  const RE_CASA = /\bcu\s+(toat[ăa]\s+casa(\s+lor)?|fii+\b.*|fiul\b.*|fiica\b.*|copii+\b.*|nepo[țt]i\w*\b.*|familia\b.*|toat[ăa]\s+familia\b.*)/i;
  const RE_RUGAMINTE = /\b(pt\.?|pentru|se\s+roag[ăa]|s[ăa]n[ăa]tate|spor|succes|amin)\b.*/i;

  // Un rând scris de mână → un nume de tipar. null = rândul nu e nume și nu spune nimic.
  // Un rând doar cu „cu fii" / „cu toată casa lor" întoarce {nume:'', casa:true} ca secțiunea să afle.
  function proceseazaLinie(text) {
    let t = (text || '').trim();
    if (!t) return null;
    const cruce = RE_CRUCE.test(t); t = t.replace(RE_CRUCE, '');
    const ctna = RE_CTNA.test(t); t = t.replace(RE_CTNA, ' ');
    const casa = RE_CASA.test(t); t = t.replace(RE_CASA, ' ');
    t = t.replace(/\(.*?\)/g, ' ').replace(RE_RUGAMINTE, ' ');
    const brute = t.split(/[-–—\/,;+&\s]+/).map(x => x.replace(/[^\p{L}]/gu, '')).filter(x => x.length >= 2);
    const titluri = [], tokens = [];
    for (const b of brute) {
      const k = faraDiacritice(b);
      if (TITLURI[k]) { if (!tokens.length) titluri.push(TITLURI[k]); continue; }
      if (STOP.has(k)) continue;
      tokens.push(b);
    }
    if (!tokens.length) return (casa || ctna) ? { nume: '', ctna, casa, sigur: true, original: text.trim(), corectat: false, cruce } : null;
    const parti = lipesteCompuse(tokens.map(corecteazaNume));
    if (/\d/.test(text) && parti.every(p => !p.sex)) return null;   // „50 lei", „25 oct": cifre și niciun nume cunoscut
    let alese = parti, sigur = parti.every(p => p.sigur);
    if (parti.length >= 2) {
      const sexe = parti.map(p => p.sex);
      if (sexe.every(s => s)) {
        // același sex → doar primul; sexe amestecate → primul de fiecare sex (Ion-Maria-Gheorghe → Ion-Maria)
        const vazute = new Set(); alese = parti.filter(p => !vazute.has(p.sex) && vazute.add(p.sex));
      } else sigur = false;                                      // sex necunoscut → păstrăm tot, marcăm
    }
    const prefix = titluri.length ? titluri.join(' ') + ' ' : '';
    return {
      nume: prefix + alese.map(p => p.nume).join('-') + (ctna ? ' ctna' : ''),
      ctna, casa, sigur, cruce,
      original: text.trim(),
      corectat: parti.some(p => p.corectat),
    };
  }

  function categorieDinTitlu(titluText, areCruce) {
    const t = faraDiacritice(titluText || '');
    if (areCruce || /adorm|mort|decedat|raposat|†|✝/.test(t)) return 'adormiti';
    return 'vii';   // vii, acatist, liturghie, nimic
  }

  // „20 oct", „15 nov", „4.10", „3-X-2026", „25 octombrie", „25 de oct", „nov 5", „20oct" → dd.mm.yyyy.
  // Anul: cel curent; dacă data ar cădea cu peste 60 de zile în urmă, e anul următor.
  function parseazaData(text, azi) {
    azi = azi || new Date();
    if (!text) return null;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(text).trim())) { const [z, l, a] = text.trim().split('.').map(Number); return valida(z, l, a) ? text.trim() : null; }
    const t = faraDiacritice(String(text)).replace(/\bde\b/g, ' ').replace(/\s+/g, ' ').trim();
    let zi, luna, an, m;
    const luni = s => LUNI[s.slice(0, 4)] || LUNI[s.slice(0, 3)];
    if ((m = t.match(/(\d{1,2})\s*[.\-\/ ]?\s*([a-z]{3,})\.?(?:\s*[.\-\/ ]?\s*(\d{4}))?/))) { zi = +m[1]; luna = luni(m[2]); an = m[3] && +m[3]; }
    if (!luna && (m = t.match(/([a-z]{3,})\.?\s*(\d{1,2})\b(?:\s*[.\-\/ ]?\s*(\d{4}))?/))) { zi = +m[2]; luna = luni(m[1]); an = m[3] && +m[3]; }
    if (!luna && (m = t.match(/(\d{1,2})\s*[.\-\/ ]\s*([ivx]{1,4})\b(?:\s*[.\-\/ ]\s*(\d{4}))?/))) { zi = +m[1]; luna = ROMANE[m[2]]; an = m[3] && +m[3]; }
    if (!luna && (m = t.match(/(\d{1,2})\s*[.\-\/]\s*(\d{1,2})(?:\s*[.\-\/]\s*(\d{2,4}))?/))) { zi = +m[1]; luna = +m[2]; an = m[3] && (+m[3] < 100 ? 2000 + +m[3] : +m[3]); }
    if (!zi || !luna) return null;
    if (!an) {
      an = azi.getFullYear();
      const d = new Date(an, luna - 1, zi);
      if ((azi - d) / 86400000 > 60) an++;
    }
    if (!valida(zi, luna, an)) return null;
    return `${String(zi).padStart(2, '0')}.${String(luna).padStart(2, '0')}.${an}`;
  }
  function valida(zi, luna, an) {
    if (luna < 1 || luna > 12 || zi < 1) return false;
    const max = luna === 2 && !(an % 4 === 0 && (an % 100 !== 0 || an % 400 === 0)) ? 28 : ZILE_IN_LUNA[luna - 1];
    return zi <= max;
  }

  // O secțiune citită ({titlu, categorie, cruce, linii:[{text,sigur}]}) → 1 sau 2 secțiuni de tipar:
  // numele cu cruce în față se mută singure la adormiți.
  function proceseazaSectiuni(s) {
    if (!s || typeof s !== 'object') return [];
    const toate = (s.linii || []).map(l => {
      if (l == null) return null;
      const r = proceseazaLinie(typeof l === 'string' ? l : l.text);
      if (r && typeof l === 'object' && l.sigur === false) r.sigur = false;   // modelul a ezitat la citire
      return r;
    }).filter(Boolean);
    const casa = toate.some(n => n.casa) || RE_CASA.test(s.observatii || '');
    const nume = toate.filter(n => n.nume);
    const categorie = s.cruce ? 'adormiti' : (s.categorie === 'adormiti' || s.categorie === 'vii') ? s.categorie : categorieDinTitlu(s.titlu, false);
    const cuCruce = categorie === 'vii' ? nume.filter(n => n.cruce) : [];
    const rezultat = [];
    const principale = nume.filter(n => !cuCruce.includes(n));
    if (principale.length || !cuCruce.length) rezultat.push({ categorie, nume: principale, casa });
    if (cuCruce.length) rezultat.push({ categorie: 'adormiti', nume: cuCruce, casa: false });
    return rezultat;
  }
  function proceseazaSectiune(s) { return proceseazaSectiuni(s)[0] || { categorie: 'vii', nume: [], casa: false }; }

  // Paginile verificate → foi A6. O pagină cu vii ȘI adormiți dă două foi. Peste MAX nume → foi de continuare echilibrate.
  function construiesteFoi(pagini, max) {
    max = max || MAX_NUME_PE_FOAIE;
    const foi = [];
    pagini.forEach((p, ip) => (p.sectiuni || []).forEach(s => {
      const nume = s.nume.filter(n => n.nume && !n.sters);
      if (!nume.length) return;
      const bucati = Math.ceil(nume.length / max), pe = Math.ceil(nume.length / bucati);
      for (let i = 0, k = 0; i < nume.length; i += pe, k++) {
        foi.push({ categorie: s.categorie, nume: nume.slice(i, i + pe).map(n => n.nume), casa: !!s.casa && i + pe >= nume.length,
          data: p.data, pagina: ip + 1, continuare: k > 0 });
      }
    }));
    return foi;
  }

  function grupeazaA4(foi) { const a4 = []; for (let i = 0; i < foi.length; i += 4) a4.push(foi.slice(i, i + 4)); return a4; }

  return { proceseazaLinie, proceseazaSectiune, proceseazaSectiuni, categorieDinTitlu, parseazaData, construiesteFoi, grupeazaA4, corecteazaNume, MAX_NUME_PE_FOAIE };
});
