// Regulile de transformare a unui pomelnic citit (OCR) în foi A6 de tipar.
// Funcții pure, fără DOM, ca să poată fi testate în Node. Hotărârile Otiliei (3.11.2026):
//  - pe foaie rămân doar categoria, numele și data; nimic altceva (fără sume, fără rugăminți)
//  - cruce sau „morți" ⇒ adormiți; „acatist", „vii" sau nimic ⇒ vii
//  - două nume pe același rând, același sex ⇒ doar primul; sex diferit ⇒ amândouă
//  - „cu tot neamul lui/ei cel adormit" ⇒ „ctna" după nume
//  - „cu fii(i) (și nepoții)" ⇒ o singură dată, jos: „cu toată casa lor"
//  - data = cea scrisă cu albastru (data când pomelnicul iese)
//  - (7.11.2026) abrevieri pe foaie: Părintele→Pr., Constantin→Ctin, Gheorghe→Ghe, Presbitera→Presb., Arhimandrit→Arhim.,
//    Arhiereu→Arh., Protosinghel→Protos.; la citire se înțeleg ambele forme
//  - (7.11.2026) pe un rând se citesc cel mult 2 nume orizontal; restul numelor de pe rând coboară câte unul pe linie
//  - (7.11.2026) „bolnavă", „se roagă", sume etc. nu sunt nume (lexic.js): ies din listă și se arată la pasul 2 ca „scos"
//  - (7.11.2026) pomelnic pe două coloane: întâi toată prima coloană de sus în jos, apoi a doua (câmpul „coloana" al rândului)
(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory(require('./nume.js'), require('./lexic.js'));
  else root.REGULI = factory(root.NUME, root.LEXIC);
})(typeof self !== 'undefined' ? self : this, function (NUME, LEXIC) {

  const MAX_NUME_PE_FOAIE = 24;   // peste 10 nume foaia trece pe 2 coloane (foaie.js), deci încap 2 × 12
  const LUNI = { ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6, iul: 7, aug: 8, sep: 9, sept: 9, oct: 10, noi: 11, nov: 11, dec: 12 };
  const ROMANE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  const ZILE_IN_LUNA = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Titluri clericale/monahale: rămân în fața numelui, nu sunt nume.
  // Valoarea = forma SCURTĂ care se tipărește pe foaie (hotărârea ei 7.11.2026: părintele = pr., presbitera = presb,
  // arhimandrit = arhim, arhiereu = arh, protosinghel = protos). Cheia = orice formă scrisă pe pomelnic, fără diacritice.
  const TITLURI = { pr: 'Pr.', preot: 'Pr.', preotul: 'Pr.', parinte: 'Pr.', parintele: 'Pr.', ierom: 'Ierom.', ieromonah: 'Ierom.', ierod: 'Ierod.', ierodiacon: 'Ierod.',
    diac: 'Diac.', diacon: 'Diac.', presb: 'Presb.', presbitera: 'Presb.', arhim: 'Arhim.', arhimandrit: 'Arhim.', arh: 'Arh.', arhiereu: 'Arh.', arhiereul: 'Arh.',
    protos: 'Protos.', protosinghel: 'Protos.', protosinghelul: 'Protos.', arhimandritul: 'Arhim.', diaconul: 'Diac.', ieromonahul: 'Ierom.', ierodiaconul: 'Ierod.',
    monahul: 'Monah', episcopul: 'Ep.', preoteasa: 'Preoteasa', patriarh: 'Patriarh', patriarhul: 'Patriarh', mitropolit: 'Mitropolit', mitropolitul: 'Mitropolit',
    arhiepiscop: 'Arhiepiscop', arhiepiscopul: 'Arhiepiscop', protopop: 'Protopop', protopopul: 'Protopop',
    ierodiac: 'Ierod.', arhid: 'Arhid.', arhidiacon: 'Arhid.', prot: 'Prot.', protoiereu: 'Protoiereu', protopresbiter: 'Protopresbiter', iconom: 'Iconom', stavrofor: 'Stavrofor',
    schim: 'Schim.', schimonah: 'Schimonah', schimonahia: 'Schimonahia', ieroschimonah: 'Ieroschim.', pf: 'PF', preafericitul: 'PF', preasfintitul: 'PS', inaltpreasfintitul: 'IPS',
    monah: 'Monah', monahia: 'Monahia', maica: 'Maica', mon: 'Monah', ps: 'PS', ips: 'IPS', ep: 'Ep.', episcop: 'Ep.', sf: 'Sf.' };
  // Titlurile scrise PRESCURTAT (se leagă de numele care urmează: „Ion Pr. Vasile"); celelalte, scrise întreg, pot sta și după nume („Vasile preotul")
  const PRESCURTARI = new Set(['pr', 'ierom', 'ierod', 'diac', 'presb', 'arhim', 'arh', 'protos', 'prot', 'schim', 'ps', 'ips', 'ep', 'mon', 'sf', 'pf', 'arhid']);
  // Prenume prescurtate pe foaie: Constantin = Ctin, Gheorghe = Ghe. ALIASE = cum le poate scrie ea de mână → numele întreg (pentru dicționar/sex).
  const NUME_SCURT = { constantin: 'Ctin', ctin: 'Ctin', ghe: 'Ghe', gheorghe: 'Ghe' };
  const ALIASE = { ctin: 'Constantin', const: 'Constantin', ghe: 'Gheorghe', gh: 'Gheorghe' };
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
  const EXACT = new Map(NUME.toate.map(n => [n.toLowerCase(), n]));
  const GRUPE = new Map();   // cheie fără diacritice → toate numele care o au (Costică / Costica / Costicǎ…)
  for (const n of NUME.toate) { const k = faraDiacritice(n); if (!GRUPE.has(k)) GRUPE.set(k, []); GRUPE.get(k).push(n); }
  const arediacritice = s => /[^\x00-\x7f]/.test(s);

  // Un singur prenume → forma canonică din dicționar (dacă există) + sexul.
  // Corecție fuzzy doar de la 5 litere în sus (1 literă) și de la 8 în sus (2 litere); altfel rămâne cum e, marcat nesigur.
  function corecteazaNume(token) {
    token = String(token == null ? '' : token).normalize('NFC');
    // Un nume scris FĂRĂ diacritice poate fi mai multe nume (Costica f / Costică m, Ghita / Ghiță / Ghița, Florica / Florică): nu hotărâm
    // sexul și nu schimbăm grafia; rămâne cum a venit, cu sexul „necunoscut" (deci „două nume pe rând" nu pierde pe niciunul).
    const grup = GRUPE.get(faraDiacritice(token));
    if (grup && grup.length > 1 && !arediacritice(token)) {
      const ex = EXACT.get(token.toLowerCase());
      return { nume: ex || titlu(token), sex: null, sigur: !!ex, corectat: false, sugestii: ex ? [] : grup.slice(0, 4) };
    }
    // Grafia exactă din dicționar are întâietate (Florica = f, Florică = m sunt nume diferite; nu le amestecăm prin „fără diacritice").
    const exact = EXACT.get(token.toLowerCase());
    if (exact) return { nume: exact, sex: NUME.sex.get(exact.toLowerCase()), sigur: true, corectat: exact !== titlu(token) };
    let cheie = faraDiacritice(token);
    if (!CANON.has(cheie)) cheie = faraDiacritice(token.replace(/^y/i, 'i'));   // „Yoan" → Ioan (dar Yasmina, Yolanda rămân cum sunt)
    if (ALIASE[cheie]) return { nume: ALIASE[cheie], sex: NUME.sex.get(ALIASE[cheie].toLowerCase()), sigur: true, corectat: false };   // „Ctin" → Constantin, „Ghe" → Gheorghe
    if (!CANON.has(cheie) && /^j/.test(cheie) && CANON.has('i' + cheie.slice(1))) cheie = 'i' + cheie.slice(1);   // „Joan" (citit de model) → Ioan
    if (CANON.has(cheie)) {
      let n = CANON.get(cheie);
      if (arediacritice(token) && !arediacritice(n)) n = titlu(token);   // dicționarul are doar forma fără diacritice (Doinita), nu stricăm diacriticele corecte (Doinița)
      return { nume: n, sex: NUME.sex.get(CANON.get(cheie).toLowerCase()), sigur: true, corectat: n !== titlu(token) };
    }
    const toleranta = cheie.length >= 8 ? 2 : cheie.length >= 5 ? 1 : 0;
    let candidati = [], bestD = toleranta + 1;
    for (const [k, n] of CANON) {
      if (Math.abs(k.length - cheie.length) > toleranta) continue;
      const d = levenshtein(k, cheie);
      if (d > toleranta) continue;   // peste toleranță nu corectăm (Onisim ≠ Anisia, Dumitrache ≠ Dumitrana)
      if (d < bestD) { bestD = d; candidati = [n]; } else if (d === bestD) candidati.push(n);
    }
    // Dicționarul mare are nume foarte apropiate între ele: dacă două nume sunt la fel de aproape, NU alegem noi
    // (un nume greșit pe un pomelnic e mai rău decât unul galben): rămâne cum e scris, nesigur, cu variantele alături.
    if (candidati.length === 1) return { nume: candidati[0], sex: NUME.sex.get(candidati[0].toLowerCase()), sigur: false, corectat: true, original: titlu(token) };
    if (candidati.length > 1) return { nume: titlu(token), sex: null, sigur: false, corectat: false, sugestii: candidati.slice(0, 4) };
    return { nume: titlu(token), sex: null, sigur: false, corectat: false };
  }

  // Nume compuse = O SINGURĂ persoană (hotărârea ei 3.11.2026: „Ana-Maria e un nume întreg"); rămân întregi.
  // „Roxana Gabriela", „Marcela Mihaela" sunt două nume → regula „același sex → doar primul".
  const COMPUSE = [['Ana', 'Maria']];
  function lipesteCompuse(parti) {
    const out = [];
    for (let i = 0; i < parti.length; i++) {
      // „Ana, monahia Maria" = două persoane: un nume cu titlu propriu nu se lipește de cel dinainte
      const c = COMPUSE.find(k => k.every((n, j) => parti[i + j] && parti[i + j].nume === n && (j === 0 || !(parti[i + j].titluri && parti[i + j].titluri.length))));
      if (c) { out.push({ nume: c.join('-'), titluri: parti[i].titluri, sex: parti[i].sex, sigur: parti.slice(i, i + c.length).every(p => p.sigur), corectat: parti.slice(i, i + c.length).some(p => p.corectat) }); i += c.length - 1; }
      else out.push(parti[i]);
    }
    return out;
  }

  const RE_CRUCE = /^\s*[+†✝✞☦]\s*/;
  const RE_CTNA = /(?<![\p{L}])(?:(?:cu|[șs]i)\s+)?tot\s+neamul(\s+(?:lui|ei|lor|meu))?(\s+cel(?:or)?\s+adormi[țt]\w*)?|(?<![\p{L}])c\.?t\.?n\.?a\.?(?![\p{L}])/iu;
  // „cu toată casa lor", „și copiii", „cu fiicele", „cu nepotul", „fam." … (7.11.2026: și „și copiii", nu doar „cu fii"). Se aplică pe un SEGMENT (între virgule):
  // ce vine după cuvântul de rudenie în același segment e familia lui (de ex. „Maria cu fiica Ana" → Maria); după virgulă începe alt segment.
  // Cuvântul de rudenie pornește „casa" DOAR după „cu"/„și": „fiica Ioana" sau „Familia: Ion, Maria" la început de segment sunt nume, nu casă.
  const RE_CASA = /(?<![\p{L}\d])(?:toat[ăa]\s+(?:casa|familia)(?:\s+lor)?|to[țt]i\s+ai\s+casei|cei\s+din\s+cas[ăa]|(?:cu|[șs]i)\s+(?:(?:toți|toti|cei)\s+)?(?:fii+|fiul|fiica|fiicele|fiice|fiilor|fiului|copii+|copilul|copiilor|nepo[țt]i\w*|nepoata|nepoate|nepotul|familia|fam|flia)(?![\p{L}\d]).*)/iu;
  const RE_RUGAMINTE = LEXIC.RE_RUGAMINTE;   // „pt.", „pentru", „se roagă", „sănătate"… → restul rândului e rugăminte, nu nume
  const MAX_ORIZONTAL = 2;                   // cel mult 2 nume citite pe același rând (hotărârea ei 7.11.2026)

  // Forma de pe FOAIE: titluri și prenume scurtate (Părintele Constantin → Pr. Ctin). Idempotentă; o folosesc și numele scrise de mână la pasul 2.
  function scurteaza(nume) {
    const cuvinte = String(nume || '').split(/\s+/).filter(Boolean);
    let inceput = true;
    return cuvinte.map(c => {
      const k = faraDiacritice(c.replace(/\.$/, ''));
      if (inceput && TITLURI[k] && cuvinte.length > 1) return TITLURI[k];
      inceput = false;
      return c.split('-').map(p => NUME_SCURT[faraDiacritice(p)] || p).join('-');
    }).join(' ');
  }

  // Un rând scris de mână → UNA SAU MAI MULTE linii de nume pentru tipar.
  //  - primele 2 nume de pe rând sunt „perechea orizontală" (același sex → doar primul; sexe diferite → Nume-Nume);
  //  - numele de după al doilea nu se mai citesc orizontal: fiecare coboară pe linia lui, în coloană;
  //  - cuvintele care nu sunt nume (bolnavă, se roagă, sume…) ies din listă și se păstrează în `scos`.
  // Un rând doar cu „cu fii" / „ctna" întoarce {nume:''} cu semnul respectiv; unul doar cu „altceva" întoarce {nume:'', scos}.
  function proceseazaLinii(text) {
    let t = (typeof text === 'string' ? text : typeof text === 'number' ? String(text) : '').normalize('NFC')
      .replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț').replace(/ǎ/g, 'ă').replace(/Ǎ/g, 'Ă').trim();   // sedila (Ghiţă) și ǎ = aceleași litere
    t = t.replace(/^\s*\d{1,3}\s*[.)]\s+(?=\p{L})/u, '');   // numerotarea rândului: „3. Ion" → „Ion"
    if (!t) return [];
    const original = t;
    const cruce = RE_CRUCE.test(t); t = t.replace(RE_CRUCE, '');
    const ctna = RE_CTNA.test(t); t = t.replace(RE_CTNA, ' ');
    const scos = [];
    t = t.replace(/\(.*?\)/g, m => { scos.push(m); return ' '; });
    t = t.replace(/(?<![\p{L}\d])al\s+[IVX]+\s*-?\s*lea(?![\p{L}])/giu, ' ');            // „Ion al II-lea"
    t = t.replace(/(\p{L}{2,})\.(?=\p{L})/gu, '$1. ');                                      // „Pr.Ion" → „Pr. Ion"
    t = t.replace(/(?<![\p{L}\d])C-tina(?![\p{L}\d])\.?/giu, 'Constantina').replace(/(?<![\p{L}\d])C-tin(?![\p{L}\d])\.?/giu, 'Ctin');
    let casa = false;
    const tokens = [];
    let dupaCifra = false;   // „Ioan 5 ani", „Ion 20 octombrie": cuvântul de după o cifră e vârstă/lună, nu prenume
    for (const seg of t.split(/[;,]/)) {   // fiecare segment (între virgule) are rugămintea, familia și titlurile lui
      let s = seg;
      // rugăminte: la început de segment se scoate doar cuvântul („pentru", „sănătate"); mai încolo taie restul segmentului,
      // dar „pt. sănătate: Ion, Maria" păstrează ce vine după „:" (lista celor pentru care se roagă)
      for (let i = 0; i < 10; i++) {
        const m = s.match(LEXIC.RUG_CUV); if (!m) break;
        if (s.slice(0, m.index).trim() === '') { scos.push(m[0].trim()); s = s.slice(m.index + m[0].length); continue; }
        const rest = s.slice(m.index), col = rest.indexOf(':');
        if (col >= 0) { scos.push(rest.slice(0, col).trim()); s = s.slice(0, m.index) + ' ' + rest.slice(col + 1); continue; }
        scos.push(rest.trim()); s = s.slice(0, m.index); break;
      }
      const cm = s.match(RE_CASA);
      if (cm) { casa = true; const rest = cm[0].replace(/^\s*(?:(?:cu|[șs]i)\s+)?\S+/iu, '').trim(); if (rest) scos.push(rest); s = s.slice(0, cm.index); }
      const brute = s.split(/[-–—\/+&\s]+/).map(x => x.replace(/[^\p{L}\d]/gu, '')).filter(x => x.length >= 2 || /\d/.test(x));
      let asteapta = [], ultimul = null, dupaNume = false;   // titluri care așteaptă numele de după ele; ultimul nume; tokenul dinainte era un nume
      for (const b of brute) {
        const k = faraDiacritice(b);
        if (TITLURI[k]) {
          // „Vasile preotul și Maria": un titlu scris în întregime (nu prescurtat) IMEDIAT după un nume fără titlu e al acelui nume;
          // prescurtările (Pr., Arhim.) și orice titlu după „și"/„cu" se leagă de numele care urmează
          if (dupaNume && ultimul && !ultimul.titluri.length && !PRESCURTARI.has(k)) { ultimul.titluri = [TITLURI[k]]; dupaNume = false; continue; }
          asteapta.push(TITLURI[k]); dupaNume = false; continue;
        }
        if (STOP.has(k)) { dupaNume = false; continue; }
        if (/\d/.test(b)) { scos.push(b); dupaCifra = true; continue; }
        if (dupaCifra && (LEXIC.esteNenume(b) || LEXIC.esteLuna(b))) { scos.push(b); dupaCifra = false; continue; }
        dupaCifra = false;
        // întâi dicționarul de nume (un nume care seamănă cu un cuvânt obișnuit rămâne nume), apoi lexicul „nu e nume"
        const c = corecteazaNume(b);
        if (!c.sigur && LEXIC.esteNenume(b)) { scos.push(b); continue; }
        if (c.sigur && LEXIC.prioritar(b)) c.ambiguu = true;   // „nora", „tanti": mai degrabă rudenie decât prenume, dacă pe rând mai e un nume
        c.titluri = asteapta; asteapta = []; ultimul = c; dupaNume = true; tokens.push(c);
      }
      if (asteapta.length && ultimul && !ultimul.titluri.length) ultimul.titluri = asteapta;   // titlu DUPĂ nume, în același segment: „Cleopa arhimandritul"
    }
    if (tokens.some(c => !c.ambiguu)) { for (const c of tokens.filter(c => c.ambiguu)) scos.push(c.nume); for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].ambiguu) tokens.splice(i, 1); }
    const baza = { ctna, casa, cruce, original, scos };
    if (!tokens.length) return (casa || ctna || scos.length) ? [{ ...baza, nume: '', sigur: true, corectat: false }] : [];
    const parti = lipesteCompuse(tokens);
    const prefix = p => (p.titluri && p.titluri.length ? p.titluri.join(' ') + ' ' : '');
    const linii = [];
    // perechea orizontală = primele 2 nume, dar un nume cu titlu propriu („Ion, Pr. Vasile") e altă persoană: nu se contopește cu cel dinainte
    // și o persoană cu titlu e luată singură („Pr. Vasile" + „Maria" = două persoane, nu un nume dublu Vasile-Maria)
    const pereche = parti[0].titluri && parti[0].titluri.length ? [parti[0]] : parti.slice(0, MAX_ORIZONTAL).filter((p, i) => i === 0 || !(p.titluri && p.titluri.length));
    {
      let alese = pereche, sigur = pereche.every(p => p.sigur);
      if (pereche.length === 2) {
        const [a, b] = pereche;
        if (a.sex && b.sex) { if (a.sex === b.sex) alese = [a]; }   // același sex → doar primul; sexe diferite → rămân amândouă cu cratimă
        else sigur = false;                                          // sex necunoscut → păstrăm ambele, marcăm
      }
      linii.push({ ...baza, nume: prefix(pereche[0]) + alese.map(p => p.nume).join('-'), sigur, corectat: pereche.some(p => p.corectat), sugestii: pereche.flatMap(p => p.sugestii || []) });
    }
    for (const p of parti.slice(pereche.length))   // al 3-lea, al 4-lea… nume de pe rând (și cele cu titlu propriu): fiecare pe linia lui, în coloană
      linii.push({ ...baza, scos: [], nume: prefix(p) + p.nume, sigur: p.sigur, corectat: p.corectat, sugestii: p.sugestii || [], original: p.original || p.nume, dinRand: true });
    return linii.map(l => ({ ...l, nume: scurteaza(l.nume) }));
  }
  // Vechiul API: prima linie de nume a rândului; null = rândul nu are nume și nici „ctna"/„cu fii".
  function proceseazaLinie(text) {
    const l = proceseazaLinii(text)[0];
    return l && (l.nume || l.ctna || l.casa) ? l : null;
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
  // Ordinea de citire a rândurilor unei secțiuni: pe un pomelnic cu DOUĂ COLOANE se citește întâi toată prima coloană
  // de sus în jos, apoi a doua (hotărârea ei 7.11.2026: „să nu se încurce coloanele"). Modelul spune pe ce coloană e fiecare rând
  // (`coloana`, 1 = stânga) și le dă de sus în jos; sortarea e stabilă, deci ordinea de sus în jos din coloană rămâne.
  function numarColoana(v) {
    if (typeof v === 'string') {   // „2", „a doua", „II", „stânga", „dreapta"
      const t = faraDiacritice(v).trim();
      if (/^\d+$/.test(t)) v = +t;
      else if (/stang|prima|^i$|^1/.test(t)) return 1;
      else if (/dreapt|doua|^ii$|^2/.test(t)) return 2;
      else if (/treia|^iii$|^3/.test(t)) return 3;
      else return null;
    }
    return typeof v === 'number' && isFinite(v) ? Math.round(v) : null;
  }
  function ordoneazaLinii(linii) {
    if (!Array.isArray(linii)) return [];
    const arr = linii.map((l, i) => ({ l, i, c: l && typeof l === 'object' ? numarColoana(l.coloana) : null }));
    if (arr.some(x => x.c === 0)) for (const x of arr) if (x.c != null) x.c += 1;   // modelul a numerotat coloanele de la 0
    for (const x of arr) if (x.c == null || x.c < 1) x.c = 1;
    arr.sort((a, b) => a.c - b.c || a.i - b.i);
    return arr.map(x => x.l);
  }
  function proceseazaSectiuni(s) {
    if (!s || typeof s !== 'object') return [];
    let toate = [];
    for (const l of ordoneazaLinii(s.linii)) {
      if (l == null) continue;
      for (const r of proceseazaLinii(typeof l === 'string' ? l : (l && typeof l === 'object' ? l.text : ''))) {
        if (typeof l === 'object' && l.sigur === false) r.sigur = false;   // modelul a ezitat la citire
        toate.push(r);
      }
    }
    const casa = toate.some(n => n.casa) || /(?<![\p{L}])cu\s+(fii+|copii+|nepo[țt]i\w*|toat[ăa]\s+casa|familia)/iu.test(String(s.observatii || ''));
    const scos = toate.flatMap(n => n.scos || []);
    const nume = toate.filter(n => n.nume);
    const categorie = s.cruce ? 'adormiti' : (s.categorie === 'adormiti' || s.categorie === 'vii') ? s.categorie : categorieDinTitlu(String(s.titlu == null ? '' : s.titlu), false);
    const cuCruce = categorie === 'vii' ? nume.filter(n => n.cruce) : [];
    const rezultat = [];
    const principale = nume.filter(n => !cuCruce.includes(n));
    if (principale.length || !cuCruce.length) rezultat.push({ categorie, nume: principale, casa, scos });
    if (cuCruce.length) rezultat.push({ categorie: 'adormiti', nume: cuCruce, casa: false, scos: [] });
    return rezultat;
  }
  function proceseazaSectiune(s) { return proceseazaSectiuni(s)[0] || { categorie: 'vii', nume: [], casa: false }; }

  // Paginile verificate → foi A6. O pagină cu vii ȘI adormiți dă două foi. Peste MAX nume → foi de continuare echilibrate.
  // Foile fără dată primesc data tipăririi + 7 zile (hotărârea ei 4.11.2026).
  function dataTiparirii(azi, zile) {
    const d = new Date(azi || Date.now()); d.setDate(d.getDate() + (zile == null ? 7 : zile));
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }
  function construiesteFoi(pagini, max, azi) {
    max = max || MAX_NUME_PE_FOAIE;
    const implicita = dataTiparirii(azi);
    const foi = [];
    pagini.forEach((p, ip) => (p.sectiuni || []).forEach(s => {
      const nume = (s && Array.isArray(s.nume) ? s.nume : []).filter(n => n && n.nume && !n.sters);
      if (!nume.length) return;
      const bucati = Math.ceil(nume.length / max), baza = Math.floor(nume.length / bucati), rest = nume.length % bucati;
      for (let i = 0, k = 0; k < bucati; k++) {
        const pe = baza + (k < rest ? 1 : 0);   // echilibrat: 49 → 17+16+16
        const bucata = nume.slice(i, i + pe);   // loturile vechi mai au „ctna" lipit de nume: îl scoatem și îl ridicăm pe foaie
        foi.push({ categorie: s.categorie, nume: bucata.map(n => scurteaza(n.nume.replace(/\s+ctna$/i, ''))), casa: !!s.casa && k === bucati - 1, ctna: bucata.some(n => n.ctna || /\sctna$/i.test(n.nume)),
          data: p.data || implicita, dataAutomata: !p.data, pagina: ip + 1, continuare: k > 0 });
        i += pe;
      }
    }));
    return foi;
  }

  function grupeazaA4(foi, peCoala) { peCoala = peCoala || 4; const a4 = []; for (let i = 0; i < foi.length; i += peCoala) a4.push(foi.slice(i, i + peCoala)); return a4; }

  return { dataTiparirii, proceseazaLinie, proceseazaLinii, scurteaza, ordoneazaLinii, MAX_ORIZONTAL, proceseazaSectiune, proceseazaSectiuni, categorieDinTitlu, parseazaData, construiesteFoi, grupeazaA4, corecteazaNume, MAX_NUME_PE_FOAIE };
});
