// Dicționar de prenume românești cu sex (m/f). Folosit la regula „două nume pe un rând, același sex → doar primul"
// și la recunoașterea a ce este NUME și ce nu (lexic.js).
// Baza e nume-date.js, generat din surse de pe net (ro.wikipedia, wiktionary, Wikidata, DGEP – Ministerul de Interne, Heise,
// genderComputer; vezi SURSE-NUME.md și tools/construieste-nume.py). Aici se adaugă DOAR nume puse de mână (EXTRA).
// Export dublu: browser (window.NUME) și Node (module.exports).
const NUME_BAZA = (typeof module !== 'undefined') ? require('./nume-date.js') : window.NUME_DATE;

// Adăugate de mână, când pe un pomelnic real apare un nume care lipsește din dicționar.
// Nume din calendarul ortodox și nume monahale, care lipsesc din sursele de pe net (listate de auditul din 7.11.2026: din 191 de
// nume de sfinți probate, 69 lipseau și unele se „corectau" greșit: Simeon→Simion, Grigorie→Grigore, Rafail→Rafael, Macrina→Marina).
const EXTRA = {
  m: ('Noe Iov Iosua Ilia Cozma Tache Silvan Iona Gurie Simeon Grigorie Rafail Irineu Isaac Hristofor Sergie Trifon Nicanor Averchie Varnava Clement Natanael Nichita Roman Tit Nil Tihon Leontie Lavrentie Varsanufie ' +
    'Policarp Ermolae Agapie Ioanichie Pantelie Zosima Filaret Epifanie Mitrică Ichim Onisim Dumitrache Ambrozie Anastasie Chiriac Climent Damaschin Dosoftei Eftimie ' +
    'Evghenie Gherman Haralambie Ioasaf Isidor Ierotei Meletie Mina Onufrie Pahomie Partenie Porfirie Sozonte Teodosie Vichentie Vitalie Zotic Xenofont Valerian Ghenadie ' +
    'Hrisostom Teodot Teodul Tarasie Arsenie Atanasie Vavila Veniamin Visarion Zenon Ștefănel Ionică Petrică Costică Fănică Gheorghiță Ghiță Gică').split(' '),
  f: ('Zoița Tuța Ruth Ingrid Olimpiada Tecla Matrona Hristina Epraxia Achilina Taisia Macrina Mavra Eudoxia Platonida Sevastița Vetuța Iulica Chirica Glicheria Pulcheria Evghenia Teodosia Xenia ' +
    'Anfisa Antonina Ariadna Evpraxia Eufimia Ermiona Haritina Hrisanta Nonna Rufina Salomia Serafima Sofronia Stavra Susana Teoctista Zinaida Evdochia Pelagia Domnica ' +
    'Teofana Theodora Iustina Paraschiva Parascheva Ecaterina Eftimia Magdalena Mariana Marta Tamara Lidia').split(' '),
};   // „Ctin" și „Ghe" NU sunt aici: sunt scurtături (ABREVIERI în reguli.js), nu prenume
// Sexul hotărât de ea (suprascrie sursele): diminutive care în uz sunt de bărbat.
const SEX_FIX = { 'Costică': 'm', 'Fănică': 'm', 'Vasilică': 'm', 'Paulică': 'm', 'Georgică': 'm', 'Sică': 'm', 'Silică': 'm' };

const NUME = { m: [], f: [], u: [] };
const toate = new Map();   // nume -> sex ('m' | 'f' | 'u')
for (const n of NUME_BAZA.m) toate.set(n, 'm');
for (const n of NUME_BAZA.f) toate.set(n, 'f');
for (const n of NUME_BAZA.u) toate.set(n, 'u');
for (const n of EXTRA.m) toate.set(n, 'm');
for (const n of EXTRA.f) toate.set(n, 'f');
for (const [n, s] of Object.entries(SEX_FIX)) toate.set(n, s);
for (const [n, s] of toate) NUME[s].push(n);
NUME.sex = new Map();   // doar m / f; un nume de sex nesigur (u) NU primește sex: regula „același sex" nu hotărăște pe el
for (const [n, s] of toate) if (s !== 'u') NUME.sex.set(n.toLowerCase(), s);
NUME.toate = [...toate.keys()];
if (typeof module !== 'undefined') module.exports = NUME;
if (typeof window !== 'undefined') window.NUME = NUME;
