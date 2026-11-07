// Rânduri REALE de pomelnic luate de pe net (7.11.2026), nu inventate de mine:
//  - ghidulfunerar.ro (model pomelnic vii / adormiți), parastas.md, ortodox.md, sfantulandrei.org (Pomelnice.pdf), poruncaiubirii.agaton.ro
// Rulare: node test/net-real.test.js  — arată ce face mecanismul cu fiecare rând; cele cu „ASTEPT" sunt verificate.
const R = require('../reguli.js');
let ok = 0, rau = 0;
const L = t => R.proceseazaLinii(t).map(l => l.nume).filter(Boolean);
function eq(t, asteptat) { const a = L(t); if (JSON.stringify(a) === JSON.stringify(asteptat)) ok++; else { rau++; console.log('PICA „' + t + '"\n   primit  ', JSON.stringify(a), '\n   asteptat', JSON.stringify(asteptat)); } }

// ghidulfunerar.ro – model pomelnic VII
eq('Părintele Marian (duhovnic)', ['Pr. Marian']);
for (const [t, n] of [['Gheorghe', 'Ghe'], ['Ana', 'Ana'], ['Mihai', 'Mihai'], ['Ioana', 'Ioana'], ['Andrei', 'Andrei'], ['Cristina', 'Cristina'], ['Ștefan', 'Ștefan'], ['Maria', 'Maria']]) eq(t, [n]);
// ghidulfunerar.ro – model pomelnic MORȚI (cu + în față)
eq('+ Mihail (cel pomenit)', ['Mihail']);
for (const [t, n] of [['+ Ion', 'Ion'], ['+ Elena', 'Elena'], ['+ Constantin', 'Ctin'], ['+ Elisabeta', 'Elisabeta'], ['+ Ecaterina', 'Ecaterina'], ['+ Vasile', 'Vasile']]) eq(t, [n]);
eq('și pe toți cei adormiți din neamul lor.', []);
// parastas.md – exemplu pe UN singur rând: mai mult de 2 nume orizontal → restul în coloană
eq('Ioan Maria Gheorghe Elena Nicolae', ['Ioan-Maria', 'Ghe', 'Elena', 'Nicolae']);
eq('preotul Nicolae Ioan Maria Alexandru Ecaterina Gheorghe', ['Pr. Nicolae', 'Ioan', 'Maria', 'Alexandru', 'Ecaterina', 'Ghe']);   // preotul e luat singur; nimeni nu se pierde
// ortodox.md / parastas.md – clerici cu treapta ÎNAINTEA numelui
eq('preotul Ioan', ['Pr. Ioan']);
eq('monahia Olimpiada', ['Monahia Olimpiada']);
eq('diaconul Grigore', ['Diac. Grigore']);
eq('ieromonahul Varsanufie', ['Ierom. Varsanufie']);
eq('monahul Serafim', ['Monah Serafim']);
eq('monahia Teodora', ['Monahia Teodora']);
// ortodox.md: „starea" lângă nume
eq('Ioan bolnav', ['Ioan']);
eq('Ion, bolnav', ['Ion']);
eq('Gheorghe, pătimaș', ['Ghe']);
eq('Maria, elevă', ['Maria']);
eq('Elena, însărcinată', ['Elena']);
// sfantulandrei.org – titlul vine DUPĂ nume (obicei vechi)
eq('Vasile preotul', ['Pr. Vasile']);
eq('Teoctist patriarhul', ['Patriarh Teoctist']);
eq('Cleopa arhimandritul', ['Arhim. Cleopa']);
eq('Nestor mitropolitul', ['Mitropolit Nestor']);
eq('Gurie episcopul', ['Ep. Gurie']);
console.log(`${ok} ok, ${rau} pică`);
process.exit(rau ? 1 : 0);
