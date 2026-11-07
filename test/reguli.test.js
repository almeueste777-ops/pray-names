// Probe pe rândurile reale din cele 9 pomelnice scanate pe 3.11.2026. Rulare: node test/reguli.test.js
const R = require('../reguli.js');
let ok = 0, rau = 0;
function eq(a, b, msg) { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { rau++; console.log('PICA', msg, '\n   primit ', JSON.stringify(a), '\n   asteptat', JSON.stringify(b)); } }
const L = t => { const r = R.proceseazaLinie(t); return r && r.nume; };
var LL = t => R.proceseazaLinii(t).map(l => l.nume);

// Două nume, același sex → primul
eq(L('Ioana - Andreea'), 'Ioana', 'f-f');
eq(L('Georgiana - Andrei'), 'Georgiana', 'f-m = două persoane: prima linie e Georgiana (Andrei coboară dedesubt)');
eq(L('Gheorghe-Adrian pt. soarta lui'), 'Ghe', 'm-m + rugăminte (Gheorghe se tipărește Ghe, 7.11.2026)');
eq(L('Antonia-Ștefan'), 'Antonia', 'f-m: prima linie');
eq(L('Daniel Ciprian'), 'Daniel', 'spațiu, m-m');
eq(L('Mihai Laurențiu'), 'Mihai', 'm-m');
eq(L('Andreea-Iuliana'), 'Andreea', 'f-f');
eq(L('Vlad-Ionuț'), 'Vlad', 'm-m');
eq(L('Maria-Erika'), 'Maria', 'f-f');
eq(L('Matei-Constantin'), 'Matei', 'm-m');
// ctna
const ct = R.proceseazaLinie('Ion cu tot neamul lui cel adormit'); eq([ct.nume, ct.ctna], ['Ion', true], 'ctna lui: numele curat + semn');
eq(L('Victoria cu tot neamul ei cel adormit.'), 'Victoria', 'ctna ei');
// cu fii → casa
const m = R.proceseazaLinie('Marian cu fii');
eq([m.nume, m.casa], ['Marian', true], 'cu fii');
// majuscule / ortografie
eq(L('YOAN'), 'Ioan', 'Yoan');
eq(L('GRAȚIELA'), 'Grațiela', 'majuscule');
eq(L('MIHNEA'), 'Mihnea', 'majuscule 2');
eq(L('Luminița'), 'Luminița', 'diacritice');
eq(L('Neculai'), 'Neculai', 'nume din dicționar');
const c = R.proceseazaLinie('Georgion');
eq([c.nume, c.sigur], ['Georgian', false], 'corecție la 1 literă, nesigur');
// rânduri care nu sunt nume
eq(R.proceseazaLinie('pt. sănătate, înțelegere'), null, 'rugăminte');
eq(R.proceseazaLinie('50 lei'), null, 'sumă');
eq(R.proceseazaLinie(''), null, 'gol');
// categorie
eq(R.categorieDinTitlu('Acatist'), 'vii', 'acatist');
eq(R.categorieDinTitlu(''), 'vii', 'fără titlu');
eq(R.categorieDinTitlu('Morții'), 'adormiti', 'morții');
eq(R.categorieDinTitlu('Vii', true), 'adormiti', 'cruce bate titlul');
eq(R.categorieDinTitlu('Adormiți'), 'adormiti', 'adormiți');
// data
const azi = new Date(2026, 10, 3);
eq(R.parseazaData('20 oct', azi), '20.10.2026', '20 oct');
eq(R.parseazaData('15 nov', azi), '15.11.2026', '15 nov');
eq(R.parseazaData('23 noi', azi), '23.11.2026', '23 noi');
eq(R.parseazaData('4.10', azi), '04.10.2026', '4.10');
eq(R.parseazaData('3-X-2026', azi), '03.10.2026', 'roman');
eq(R.parseazaData('15 ian', azi), '15.01.2027', 'anul următor');
eq(R.parseazaData('ceva', azi), null, 'fără dată');
// secțiune + foi
const sect = R.proceseazaSectiune({ titlu: 'Morții', linii: ['Ion cu tot neamul lui cel adormit', 'Victoria cu tot neamul ei cel adormit'] });
eq([sect.categorie, sect.nume.map(n => n.nume)], ['adormiti', ['Ion', 'Victoria']], 'secțiune morți');
eq(R.construiesteFoi([{ data: 'x', sectiuni: [sect] }])[0].ctna, true, 'foaia poartă ctna o singură dată');
eq(R.construiesteFoi([{ data: 'x', sectiuni: [R.proceseazaSectiune({ titlu: 'Vii', linii: ['Ion'] })] }])[0].ctna, false, 'fără ctna');
const foi = R.construiesteFoi([{ data: '23.11.2026', sectiuni: [
  R.proceseazaSectiune({ titlu: 'Vii', linii: ['Maria-Simona', 'Gheorghe-Adrian', 'Constantin'] }), sect] }]);
eq(foi.map(f => [f.categorie, f.nume.length, f.data]), [['vii', 3, '23.11.2026'], ['adormiti', 2, '23.11.2026']], 'două foi dintr-o pagină');
const multe = R.construiesteFoi([{ data: 'x', sectiuni: [{ categorie: 'vii', casa: true, nume: Array.from({ length: 40 }, (_, i) => ({ nume: 'N' + i })) }] }]);
eq(multe.map(f => [f.nume.length, f.continuare, f.casa]), [[20, false, false], [20, true, true]], 'continuare');
eq(R.grupeazaA4(Array(9).fill({})).map(a => a.length), [4, 4, 1], 'A4 câte 4');

// --- cazurile din auditul Sonnet (3.11.2026) ---
eq(L('Pr. Ioan'), 'Pr. Ioan', 'titlu preot');
eq(L('monahia Teodora'), 'Monahia Teodora', 'titlu monahie');
eq(L('mon. Teodora'), 'Monah Teodora', 'mon. nu devine Ion');
eq(LL('Ion și Maria'), ['Ion', 'Maria'], '„și" nu e nume; Maria sub Ion');
eq(L('Ion și Gheorghe'), 'Ion', '„și" + același sex');
eq(L('Ion 50 de lei'), 'Ion', 'suma după nume');
const mf = R.proceseazaLinie('Maria cu fiica Ana'); eq([mf.nume, mf.casa], ['Maria', true], 'cu fiica → casa, un singur nume');
const inp = R.proceseazaLinie('Ioan cu nepoților'); eq([inp.nume, inp.casa], ['Ioan', true], 'cu nepoților');
const cf = R.proceseazaLinie('cu fii'); eq([cf.nume, cf.casa], ['', true], 'rând doar „cu fii" păstrează casa');
eq(R.proceseazaLinii('Ioan Gheorghe, Maria').map(l => l.nume), ['Ioan', 'Maria'], '3 nume: perechea Ioan+Gheorghe (același sex → Ioan), al 3-lea pe linia lui (7.11.2026)');
eq(L('Ioniță'), 'Ioniță', 'nume nou în dicționar');
eq(L('Mărioara'), 'Mărioara', 'nu mai devine Mariana');
const sc = R.proceseazaLinie('Ana'); eq([sc.nume, sc.sigur], ['Ana', true], 'nume scurt sigur');
const nec = R.proceseazaLinie('Xyzw'); eq([nec.nume, nec.sigur], ['Xyzw', false], 'necunoscut scurt: fără corecție fuzzy');
eq(R.categorieDinTitlu('Acatist + 50 lei'), 'vii', 'plusul din titlu nu înseamnă cruce');
const sv = R.proceseazaSectiuni({ titlu: 'Vii', categorie: 'vii', cruce: false, linii: ['Ion', '+ Maria', 'Gheorghe'] });
eq(sv.map(s => [s.categorie, s.nume.map(n => n.nume)]), [['vii', ['Ion', 'Ghe']], ['adormiti', ['Maria']]], 'crucea pe nume mută numele la adormiți');
const sx = R.proceseazaSectiuni({ titlu: 'Vii', categorie: 'vii', cruce: true, linii: ['Ion'] });
eq(sx[0].categorie, 'adormiti', 'crucea lângă titlu bate categoria modelului');
eq(R.proceseazaSectiuni(null), [], 'secțiune null');
eq(R.proceseazaSectiuni({ linii: [null, 'Ion'] })[0].nume.length, 1, 'linie null ignorată');
eq(R.parseazaData('nov 5', azi), '05.11.2026', 'luna înainte');
eq(R.parseazaData('25 de octombrie', azi), '25.10.2026', 'cu „de"');
eq(R.parseazaData('20oct', azi), '20.10.2026', 'lipit');
eq(R.parseazaData('31.02', azi), null, '31 februarie nu există');
eq(R.parseazaData('05.11.2026', azi), '05.11.2026', 'deja normalizată');
const ech = R.construiesteFoi([{ data: 'x', sectiuni: [{ categorie: 'vii', casa: true, nume: Array.from({ length: 49 }, (_, i) => ({ nume: 'N' + i })) }] }]);
eq(ech.map(f => [f.nume.length, f.continuare, f.casa]), [[17, false, false], [16, true, false], [16, true, true]], 'continuare echilibrată 17+16+16');
eq(R.construiesteFoi([{ data: 'x', sectiuni: [{ categorie: 'vii', nume: Array.from({ length: 16 }, (_, i) => ({ nume: 'N' + i })) }] }]).length, 1, '16 nume = o singură foaie (2 coloane)');
// --- hotărârea ei 3.11.2026: Ana-Maria e un nume întreg; Roxana Gabriela / Marcela Mihaela = doar primul ---
eq(L('Ana-Maria'), 'Ana-Maria', 'Ana-Maria întreg');
eq(L('Ana Maria'), 'Ana-Maria', 'Ana Maria cu spațiu');
eq(L('ANA-MARIA'), 'Ana-Maria', 'majuscule');
eq(L('Ana-Maria Gabriela'), 'Ana-Maria', 'Ana-Maria + alt nume f → doar Ana-Maria');
eq(LL('Ana-Maria și Ion'), ['Ana-Maria', 'Ion'], 'Ana-Maria + bărbat: Ion coboară');
eq(L('Roxana Gabriela'), 'Roxana', 'două nume f → primul');
eq(L('Marcela Mihaela'), 'Marcela', 'două nume f → primul');
eq(L('Maria Ana'), 'Maria', 'ordinea inversă nu e Ana-Maria');
eq(L('Joan'), 'Ioan', 'Joan citit de Gemini → Ioan');
eq(L('Joana'), 'Ioana', 'Joana → Ioana');
eq(L('Jana'), 'Jana', 'Jana rămâne Jana');
// foile fără dată: data tipăririi + 7 zile
eq(R.dataTiparirii(new Date(2026, 10, 4)), '11.11.2026', 'azi + 7');
eq(R.dataTiparirii(new Date(2026, 11, 28)), '04.01.2027', 'peste an');
const fd = R.construiesteFoi([{ data: null, sectiuni: [{ categorie: 'vii', nume: [{ nume: 'Ion' }] }] }, { data: '20.10.2026', sectiuni: [{ categorie: 'vii', nume: [{ nume: 'Ana' }] }] }], null, new Date(2026, 10, 4));
eq(fd.map(f => [f.data, f.dataAutomata]), [['11.11.2026', true], ['20.10.2026', false]], 'fără dată → azi+7; cu dată → neschimbată');

// ======================= 7.11.2026: cele 5 cerințe noi =======================
const NUME = require('../nume.js');
const LEXIC = require('../lexic.js');

// 1. dicționarul mare de pe net
eq(NUME.toate.length >= 1400, true, 'dicționar mare (' + NUME.toate.length + ' nume)');
for (const n of ['Anișoara', 'Floarea', 'Costică', 'Gheorghiță', 'Cleopa', 'Ileana', 'Tudor', 'Mioara', 'Zamfira'])
  eq(NUME.toate.some(x => x.toLowerCase() === n.toLowerCase()), true, 'în dicționar: ' + n);
// orice nume din dicționar trece prin reguli ca nume SIGUR (cu forma scurtă la Constantin/Gheorghe); niciunul nu e luat drept „nu e nume"
{
  const rele = NUME.toate.filter(n => { const l = R.proceseazaLinii(n)[0]; return !l || l.nume !== R.scurteaza(n) || !l.sigur; });
  eq(rele, [], 'toate numele din dicționar sunt recunoscute ca nume sigure');
  const prinse = NUME.toate.filter(n => LEXIC.esteNenume(n));
  console.log('  (nume care seamănă și cu un cuvânt „nu e nume", dar rămân nume: ' + (prinse.join(', ') || '—') + ')');
}

eq(L('Florica'), 'Florica', 'Florica (f) rămâne Florica, nu devine Florică (m) — găsit pe pagina 3 reală');
eq(L('Florică'), 'Florică', 'Florică (m) rămâne Florică');
eq(R.proceseazaLinie('Florica').sigur, true, 'Florica e nume sigur');
eq(L('Ionut'), 'Ionuț', 'fără diacritice → forma cu diacritice');
// 2. abrevieri: părintele = pr., Constantin = Ctin, Gheorghe = Ghe, presbitera = presb, arhimandrit = arhim, arhiereu = arh, protosinghel = protos
eq(L('Părintele Constantin'), 'Pr. Ctin', 'părintele Constantin');
eq(L('Pr. Gheorghe'), 'Pr. Ghe', 'Pr. Gheorghe');
eq(L('Preot Ion'), 'Pr. Ion', 'preot');
eq(L('Presbitera Maria'), 'Presb. Maria', 'presbitera');
eq(L('presb. Elena'), 'Presb. Elena', 'presb. de mână');
eq(L('Arhimandrit Teofil'), 'Arhim. Teofil', 'arhimandrit');
eq(L('arhim Nicodim'), 'Arhim. Nicodim', 'arhim de mână');
eq(L('Arhiereu Ioan'), 'Arh. Ioan', 'arhiereu');
eq(L('Arh. Ioan'), 'Arh. Ioan', 'arh. de mână');
eq(L('Protosinghel Nectarie'), 'Protos. Nectarie', 'protosinghel');
eq(L('Protos Nectarie'), 'Protos. Nectarie', 'protos de mână');
eq(L('Constantin'), 'Ctin', 'Constantin → Ctin');
eq(L('Gheorghe'), 'Ghe', 'Gheorghe → Ghe');
eq(L('Ctin'), 'Ctin', 'Ctin scris de mână rămâne Ctin');
eq(L('Ghe.'), 'Ghe', 'Ghe. cu punct');
eq(L('Gh.'), 'Ghe', 'Gh. = Gheorghe');
eq(L('C-tin'), 'Ctin', 'C-tin');
eq(LL('Ctin Maria'), ['Ctin', 'Maria'], 'Ctin e recunoscut ca bărbat (sex diferit → Maria coboară)');
eq(L('Ghe Ion'), 'Ghe', 'Ghe e bărbat: Ghe + Ion → primul');
eq(L('Ana-Maria'), 'Ana-Maria', 'Ana-Maria neatinsă de abrevieri');
eq(L('Constantina'), 'Constantina', 'Constantina nu se scurtează');
eq(L('Costin'), 'Costin', 'Costin nu se scurtează');
eq(R.scurteaza('Părintele Constantin'), 'Pr. Ctin', 'scurteaza() pe text scris de mână la pasul 2');
eq(R.scurteaza('Pr. Ctin'), 'Pr. Ctin', 'scurteaza idempotent');
eq(R.scurteaza('Constantin-Ion'), 'Ctin-Ion', 'scurteaza pe nume cu cratimă');
eq(R.construiesteFoi([{ data: 'x', sectiuni: [{ categorie: 'vii', nume: [{ nume: 'Părintele Gheorghe' }, { nume: 'Constantin' }] }] }])[0].nume, ['Pr. Ghe', 'Ctin'], 'și numele scrise de mână la pasul 2 se scurtează la tipar');

// 4. cel mult 2 nume orizontal; restul coboară în coloană
eq(LL('Maria Ion Elena Vasile Ana'), ['Maria', 'Ion', 'Elena', 'Vasile', 'Ana'], 'toate pe verticală, în ordinea scrisă (Maria-Ion sunt sexe diferite)');
eq(LL('Maria Elena Ion'), ['Maria', 'Ion'], 'Maria+Elena același sex → Maria; Ion pe linia lui');
eq(LL('Ion Vasile Gheorghe Mihai'), ['Ion', 'Ghe', 'Mihai'], 'perechea Ion+Vasile → Ion; Ghe și Mihai fiecare pe linie');
eq(LL('Ioana Andreea'), ['Ioana'], 'două nume → regula perechii, ca până acum');
eq(LL('Ion'), ['Ion'], 'un nume');
eq(R.proceseazaLinii('Maria Ion Elena Vasile').every(l => l.original), true, 'fiecare linie are textul original');
{
  const s = R.proceseazaSectiuni({ titlu: 'Vii', linii: ['Maria Ion Elena Vasile Ana', 'Petru'] })[0];
  eq(s.nume.map(n => n.nume), ['Maria', 'Ion', 'Elena', 'Vasile', 'Ana', 'Petru'], 'secțiunea primește numele de pe rând pe linii separate, în ordine');
}
eq(R.MAX_ORIZONTAL, 2, 'MAX_ORIZONTAL = 2');

// 3. două coloane: întâi toată prima coloană de sus în jos, apoi a doua
eq(R.ordoneazaLinii([{ text: 'A', coloana: 2 }, { text: 'B', coloana: 1 }, { text: 'C', coloana: 1 }, { text: 'D', coloana: 2 }]).map(l => l.text), ['B', 'C', 'A', 'D'], 'coloana 1 apoi coloana 2');
eq(R.ordoneazaLinii([{ text: 'A' }, { text: 'B' }, 'C']).map(l => l.text || l), ['A', 'B', 'C'], 'fără coloană: ordinea rămâne');
{
  const s = R.proceseazaSectiuni({ titlu: 'Vii', linii: [
    { text: 'Ion', coloana: 1 }, { text: 'Maria', coloana: 2 }, { text: 'Vasile', coloana: 1 }, { text: 'Elena', coloana: 2 }, { text: 'Petru', coloana: 1 }, { text: 'Ana', coloana: 2 }] })[0];
  eq(s.nume.map(n => n.nume), ['Ion', 'Vasile', 'Petru', 'Maria', 'Elena', 'Ana'], 'două coloane nu se amestecă');
}
{
  const s = R.proceseazaSectiuni({ titlu: 'Vii', linii: [{ text: 'Maria', coloana: 2 }, { text: 'Ion', coloana: 1 }] })[0];
  eq(s.nume.map(n => n.nume), ['Ion', 'Maria'], 'rândurile date în altă ordine se pun pe coloane');
}

// 5. ce e nume și ce nu e
{
  const a = R.proceseazaLinii('Maria bolnavă')[0]; eq([a.nume, a.scos], ['Maria', ['bolnavă']], 'bolnavă nu e nume');
  const b = R.proceseazaLinii('Ion se roagă pentru sănătate')[0]; eq([b.nume, b.scos.length], ['Ion', 1], 'se roagă pentru… iese din listă');
  eq(R.proceseazaLinie('bolnavă'), null, 'rând doar „bolnavă" nu e nume');
  eq(R.proceseazaLinii('bolnavă')[0].scos, ['bolnavă'], '…dar se păstrează ca „scos"');
  eq(R.proceseazaLinie('pentru sănătate și ajutor'), null, 'rugăminte');
  eq(L('Elena suferindă'), 'Elena', 'suferindă');
  eq(L('Vasile operat'), 'Vasile', 'operat');
  eq(L('Petru în spital'), 'Petru', 'în spital');
  eq(L('Ioana bolnavi'), 'Ioana', 'bolnavi');
  eq(L('Maria cu examen'), 'Maria', 'examen');
  eq(L('Anca, mulțumire'), 'Anca', 'mulțumire');
  eq(L('Dorin mort'), 'Dorin', 'mort');
  eq(R.proceseazaLinii('Ion 50 lei')[0].nume, 'Ion', 'sumă după nume');
  eq(R.proceseazaLinii('50 lei')[0].nume, '', '50 lei nu e nume');
  eq(R.proceseazaLinie('25 oct'), null, 'dată pe rând');
  eq(LL('Ioan 5 ani'), ['Ioan'], '„5 ani" e vârsta, nu prenumele Ani');
  eq(LL('Ani'), ['Ani'], 'Ani singur rămâne nume');
  for (const cuv of ['bolnav', 'bolnava', 'bolnăvioară', 'suferind', 'sănătate', 'se', 'roagă', 'rugăciune', 'spital', 'examen', 'mulțumire', 'pentru', 'ajutor', 'călătorie', 'nuntă'])
    eq(LEXIC.esteNenume(cuv), true, 'lexic: ' + cuv);
}
// toate la un loc pe același rând
eq(LL('Pr. Constantin bolnav, Maria Elena Vasile pt. sănătate'), ['Pr. Ctin', 'Maria', 'Elena', 'Vasile'], 'titlu + abreviere + bolnav + 3 nume + rugăminte');

// ======================= reparații după auditul Opus (7.11.2026) =======================
// 1. titlul se leagă de numele care îl urmează, nu de cel dinainte
eq(LL('Pr. Ion și preoteasa Maria'), ['Pr. Ion', 'Preoteasa Maria'], 'titlu pe fiecare persoană');
eq(LL('Ion, Pr. Vasile'), ['Ion', 'Pr. Vasile'], 'preotul Vasile nu dispare (alt segment, are titlu)');
eq(LL('Ion și Pr. Vasile'), ['Ion', 'Pr. Vasile'], 'Ion și Pr. Vasile = două persoane');
eq(LL('Maria, Pr. Ion'), ['Maria', 'Pr. Ion'], 'Maria, Pr. Ion');
eq(LL('Pr. Ion, Pr. Vasile, Pr. Gheorghe'), ['Pr. Ion', 'Pr. Vasile', 'Pr. Ghe'], 'trei preoți');
eq(LL('Monahia Teodora și monahia Xenia'), ['Monahia Teodora', 'Monahia Xenia'], 'două monahii');
eq(LL('Ion, Maria, Elena, Pr. Vasile'), ['Ion', 'Maria', 'Elena', 'Pr. Vasile'], 'titlul după al 3-lea nume rămâne la Vasile');
eq(LL('Vasile preotul'), ['Pr. Vasile'], 'titlu după nume, același segment');
eq(LL('Vasile preotul, Ion diaconul'), ['Pr. Vasile', 'Diac. Ion'], 'titlu după nume, două persoane');
// 2. toleranța fuzzy nu depășește ce spune regula
for (const [t, nu] of [['Onisim', 'Anisia'], ['Dumitrache', 'Dumitrana'], ['Glicheria', 'Pulcheria'], ['Stareța', 'Saveta'], ['Iov', 'Ion']])
  eq(L(t) !== nu, true, t + ' nu devine ' + nu);
eq(LL('Onisim Maria'), ['Onisim', 'Maria'], 'Maria nu se pierde');
// 3. nume din calendar / monahale
for (const n of ['Simeon', 'Grigorie', 'Rafail', 'Irineu', 'Isaac', 'Hristofor', 'Macrina', 'Natanael', 'Olimpiada', 'Matrona', 'Varsanufie', 'Policarp', 'Taisia'])
  { const l = R.proceseazaLinii(n)[0]; eq([l.nume, l.sigur], [n, true], n + ' e nume sigur'); }
// 4. fără diacritice: sexul nu se ghicește greșit
eq(LL('Costica Maria'), ['Costica-Maria'], 'Costica Maria: nu pierde Maria');
eq(LL('Ghita Maria').length, 1, 'Ghita Maria: o linie'); eq(LL('Ghita Maria')[0].includes('Maria'), true, 'Ghita Maria: Maria rămâne');
eq(L('Doinița'), 'Doinița', 'diacriticele corecte nu se strică');
eq(L('Rădița'), 'Rădița', 'Rădița');
// 5. rugăminte: nu mai înghite numele de după virgulă / „:"
eq(LL('Ion pt. sănătate, Maria, Elena'), ['Ion', 'Maria', 'Elena'], 'după rugăminte și virgulă numele revin (Ion, Maria, Elena)');
eq(LL('pt. sănătate: Ion, Maria'), ['Ion', 'Maria'], 'după „:" numele se păstrează');
eq(LL('Pentru Ion și Maria'), ['Ion', 'Maria'], 'Pentru Ion și Maria');
eq(LL('Ion - spor, Maria'), ['Ion', 'Maria'], 'Ion - spor, Maria');
eq(LL('Gheorghe-Adrian pt. soarta lui'), ['Ghe'], 'rugămintea după nume taie restul segmentului');
// 6. „cu toată casa lor" la forme frecvente
for (const t of ['Ion și copiii', 'Ion cu fiicele', 'Ion cu nepotul', 'Ion cu copilul', 'Ion cu fam.', 'Ion cu toți ai casei', 'Ion cu cei din casă', 'Ion și fiii'])
  { const l = R.proceseazaLinii(t)[0]; eq([l.nume, l.casa], ['Ion', true], t); }
eq(R.proceseazaLinii('Ion, Maria și copiii').map(l => [l.nume, l.casa]), [['Ion', true], ['Maria', true]], 'Ion, Maria și copiii');
eq(LL('Ion cu fii, Maria, Elena'), ['Ion', 'Maria', 'Elena'], 'după „cu fii," numele de pe alte segmente rămân');
// 7. titlu lipit de nume
eq(L('Pr.Ion'), 'Pr. Ion', 'Pr.Ion'); eq(L('Pr.Constantin'), 'Pr. Ctin', 'Pr.Constantin'); eq(L('Arhim.Teofil'), 'Arhim. Teofil', 'Arhim.Teofil');
// 8. titluri în plus
eq(L('Ierodiac. Ion'), 'Ierod. Ion', 'ierodiac'); eq(L('Schim. Ioan'), 'Schim. Ioan', 'schim'); eq(L('Protoiereu Ion'), 'Protoiereu Ion', 'protoiereu');
// 9. cuvinte care nu sunt nume
for (const t of ['pruncii avortați', 'răposatul', 'ctitorii', 'chimioterapie', 'diabetic', 'divorțată', 'examenul', 'Italia', 'Doamne ajută'])
  eq(LL(t).filter(Boolean), [], t + ' nu e nume');
eq(LL('nora Maria'), ['Maria'], 'nora Maria → Maria'); eq(LL('tanti Maria'), ['Maria'], 'tanti Maria → Maria'); eq(LL('Nora'), ['Nora'], 'Nora singură rămâne nume');
// 10. luni / ordinale după nume
eq(LL('Ion 20 octombrie'), ['Ion'], 'Ion 20 octombrie'); eq(LL('Maria 5 noi'), ['Maria'], 'Maria 5 noi'); eq(LL('Ion al II-lea'), ['Ion'], 'al II-lea');
eq(L('C-tina'), 'Constantina', 'C-tina');
// 13. coloane
eq(R.ordoneazaLinii([{ text: 'a', coloana: 0 }, { text: 'b', coloana: 1 }, { text: 'c', coloana: 0 }, { text: 'd', coloana: 1 }]).map(l => l.text), ['a', 'c', 'b', 'd'], 'coloane numerotate de la 0');
eq(R.ordoneazaLinii([{ text: 'a', coloana: 'dreapta' }, { text: 'b', coloana: 'stânga' }, { text: 'c', coloana: '2' }]).map(l => l.text), ['b', 'a', 'c'], 'coloane ca text');
// 14. nu cade pe date ciudate de la model
for (const urat of [{ text: 123 }, { text: {} }, { text: null }, 42, null, [], { }]) { let ok2 = true; try { R.proceseazaSectiuni({ titlu: 5, categorie: 'necunoscut', linii: [urat] }); } catch (e) { ok2 = false; } eq(ok2, true, 'fără crash: ' + JSON.stringify(urat)); }
{ let ok2 = true; try { R.proceseazaSectiuni({ linii: 'Ion' }); R.proceseazaSectiuni({ linii: { a: 1 } }); R.corecteazaNume(null); } catch (e) { ok2 = false; } eq(ok2, true, 'linii/numele ciudate nu strică'); }
eq(L('Florică'.normalize('NFD')), 'Florică', 'Unicode descompus (NFD) → același nume');
// 16. secțiune doar cu „scos"
eq(R.proceseazaSectiuni({ titlu: 'Vii', linii: ['bolnavă', '50 lei'] })[0].scos.length >= 1, true, 'secțiunea doar cu scos păstrează scos');

// ======================= reparații după auditul Opus, runda 2 =======================
// cuvântul de rudenie la început de segment NU pornește „casa" și nu înghite numele
for (const [t, n] of [['fiica Ioana', ['Ioana']], ['nepotul Andrei', ['Andrei']], ['Ion, fiul Andrei', ['Ion']], ['Fam. Ion și Maria', ['Ion', 'Maria']],
  ['Familia: Ion, Maria', ['Ion', 'Maria']], ['copiii Andrei, Ioana', ['Andrei', 'Ioana']]]) {
  const r = R.proceseazaLinii(t); eq([r.map(l => l.nume).filter(Boolean), r.some(l => l.casa)], [n, false], t + ' (fără casă, numele rămân)');
}
{ const r = R.proceseazaLinii('Maria cu fiica Ana'); eq([r[0].nume, r[0].casa], ['Maria', true], 'cu fiica Ana: casă'); }
// titlul scris întreg după nume e al acelui nume; după „și"/prescurtat e al celui care urmează
eq(LL('Vasile preotul și Maria'), ['Pr. Vasile', 'Maria'], 'Vasile preotul și Maria');
eq(LL('Ion preot Maria'), ['Pr. Ion', 'Maria'], 'Ion preot Maria');
eq(LL('Vasile preotul și preoteasa Maria'), ['Pr. Vasile', 'Preoteasa Maria'], 'preotul și preoteasa');
eq(LL('Ion Pr. Vasile'), ['Ion', 'Pr. Vasile'], 'prescurtarea se leagă de ce urmează');
// sedila și ǎ
eq(L('Ghiţă'), 'Ghiță', 'sedilă → virgulă'); eq(LL('Gheorghiţă Maria'), ['Gheorghiță', 'Maria'], 'Gheorghiţă Maria: Maria rămâne');
eq(LL('Costicǎ Maria'), ['Costică', 'Maria'], 'ǎ → ă');
// numerotare și nume rare + cifre
for (const [t, n] of [['1. Noe', 'Noe'], ['2. Iov', 'Iov'], ['3. Tache', 'Tache'], ['Noe 7 ani', 'Noe'], ['Tuța 50 lei', 'Tuța'], ['3. Ingrid', 'Ingrid'], ['5) Cozma', 'Cozma']]) eq(LL(t), [n], t);
// necunoscut + cifră nu mai dispare: rămâne galben
{ const r = R.proceseazaLinii('4. Mihal')[0]; eq(r.nume !== '', true, '4. Mihal nu dispare'); }
// Ana + Maria cu titlu la a doua = două persoane
eq(LL('monahia Ana, monahia Maria'), ['Monahia Ana', 'Monahia Maria'], 'două monahii Ana și Maria');
eq(LL('Ana Maria'), ['Ana-Maria'], 'Ana Maria rămâne un nume');
// ctna
for (const t of ['Ion și tot neamul lui', 'Ion cu tot neamul celor adormiți', 'Ion cu tot neamul lui cel adormit']) { const l = R.proceseazaLinii(t)[0]; eq([l.nume, l.ctna], ['Ion', true], t); }
// date ciudate
eq(LL('x').length >= 0 && R.proceseazaSectiuni({ linii: [{ text: {} }, true] }).length >= 0, true, 'obiect/true nu devin nume');
eq(R.proceseazaSectiuni({ linii: [{ text: {} }, true] })[0].nume.length, 0, 'Object/True nu sunt nume');
{ let ok2 = true; try { R.construiesteFoi([{ sectiuni: [{ categorie: 'vii' }, null] }, { }]); } catch (e) { ok2 = false; } eq(ok2, true, 'construiesteFoi fără crash pe secțiuni fără nume'); }

// --- 8.11.2026: perechea de sex opus coboară pe linii separate (hotărârea ei: Petru-Lavinia → Lavinia sub Petru) ---
eq(LL('Petru-Lavinia'), ['Petru', 'Lavinia'], 'Petru-Lavinia: Lavinia sub Petru');
eq(LL('Lavinia-Petru'), ['Lavinia', 'Petru'], 'ordinea scrisă se păstrează');
eq(LL('Petru Lavinia'), ['Petru', 'Lavinia'], 'și fără cratimă');
eq(LL('Ioana-Andreea'), ['Ioana'], 'același sex = un singur om cu nume dublu');
eq(R.proceseazaLinii('Petru-Lavinia').map(l => !!l.dinRand), [false, true], 'a doua e marcată „de pe același rând"');
// --- 8.11.2026: limba română întreagă (limba-date.js = LOC 5.0 ∩ frecvență): cuvintele obișnuite nu sunt nume ---
for (const [t, n] of [['Ion soarta lui Maria', ['Ion', 'Maria']], ['Ion frumoasă', ['Ion']], ['Maria pomenire veșnică', ['Maria']], ['Ana bolnavă', ['Ana']], ['Pr. Ion pătimaș', ['Pr. Ion']]]) eq(LL(t), n, 'cuvânt românesc scos: ' + t);
eq(LL('Mărgărit'), ['Mărgărit'], 'un singur cuvânt pe rând rămâne (nume rar posibil)');
eq(LL('Cuminte'), ['Cuminte'], 'cuvânt obișnuit singur pe rând: rămâne');
eq(R.proceseazaLinii('Cuminte')[0].sigur, false, 'iar la verificare e galben');
eq(LL('Ion liniștită'), ['Ion'], 'liniștită = cuvânt, nu nume');
eq(LL('Zamfira'), ['Zamfira'], 'nume necunoscut, nu cuvânt: rămâne');
eq(LL('Gheorghe Maria'), ['Ghe', 'Maria'], 'nume din dicționar au întâietate');
eq(R.proceseazaLinii('Ion soarta lui Maria')[0].scos.includes('soarta'), true, 'cuvântul scos se arată la pasul 2');
// --- auditul Opus 8.11.2026 (limba + perechi) ---
eq(R.proceseazaLinii('Pr. Mira Ion').map(l => l.nume), ['Pr. Mira', 'Ion'], 'titlul rămâne la Mira, nu sare pe Ion');
eq(LL('Maica Mira'), ['Maica Mira'], 'Maica Mira: titlul nu dispare');
eq(LL('Ion la mulți ani'), ['Ion'], '„la mulți ani" nu face o persoană „Ani"');
eq(LL('Maria, Elena la multi ani').includes('Ani'), false, 'fără diacritice la fel');
eq(LL('Ion cununați'), ['Ion'], 'ș/ț cu sedilă în sursa de frecvență (cununați)');
eq(LL('Ion moaștele'), ['Ion'], 'moaștele');
eq(LL('Ion constructor'), ['Ion'], '„constructor" nu strică (obiecte fără prototip)');
eq(typeof R.corecteazaNume('constructor').nume, 'string', 'corecteazaNume(constructor) nu aruncă');
eq(LL('Ion lăuză'), ['Ion'], 'lăuză');
{ const s = R.proceseazaSectiuni({ categorie: 'vii', linii: ['+ Ion Lumina bolnav'] }); eq([s[0].categorie, s[0].scos.includes('Lumina')], ['adormiti', true], 'scosul unui rând cu cruce merge la adormiți'); }
{ const s = R.proceseazaSectiuni({ categorie: 'vii', linii: ['Elena', '+ Ion Lumina'] }); eq([s.length, s[1].categorie, s[1].scos, s[0].scos], [2, 'adormiti', ['Lumina'], []], 'Lumina nu rămâne la vii'); }
R.seteazaExceptii(['Luna']); eq(LL('Ion Luna').length, 1, 'excepția „Luna" scutește și cuvintele din lexicul vechi'); R.seteazaExceptii([]);

console.log(`${ok} ok, ${rau} pică`);
process.exit(rau ? 1 : 0);
