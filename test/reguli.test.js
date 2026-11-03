// Probe pe rândurile reale din cele 9 pomelnice scanate pe 3.11.2026. Rulare: node test/reguli.test.js
const R = require('../reguli.js');
let ok = 0, rau = 0;
function eq(a, b, msg) { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { rau++; console.log('PICA', msg, '\n   primit ', JSON.stringify(a), '\n   asteptat', JSON.stringify(b)); } }
const L = t => { const r = R.proceseazaLinie(t); return r && r.nume; };

// Două nume, același sex → primul
eq(L('Ioana - Andreea'), 'Ioana', 'f-f');
eq(L('Georgiana - Andrei'), 'Georgiana-Andrei', 'f-m rămân amândouă');
eq(L('Gheorghe-Adrian pt. soarta lui'), 'Gheorghe', 'm-m + rugăminte');
eq(L('Antonia-Ștefan'), 'Antonia-Ștefan', 'f-m');
eq(L('Daniel Ciprian'), 'Daniel', 'spațiu, m-m');
eq(L('Mihai Laurențiu'), 'Mihai', 'm-m');
eq(L('Andreea-Iuliana'), 'Andreea', 'f-f');
eq(L('Vlad-Ionuț'), 'Vlad', 'm-m');
eq(L('Maria-Erika'), 'Maria', 'f-f');
eq(L('Matei-Constantin'), 'Matei', 'm-m');
// ctna
eq(L('Ion cu tot neamul lui cel adormit'), 'Ion ctna', 'ctna lui');
eq(L('Victoria cu tot neamul ei cel adormit.'), 'Victoria ctna', 'ctna ei');
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
eq([sect.categorie, sect.nume.map(n => n.nume)], ['adormiti', ['Ion ctna', 'Victoria ctna']], 'secțiune morți');
const foi = R.construiesteFoi([{ data: '23.11.2026', sectiuni: [
  R.proceseazaSectiune({ titlu: 'Vii', linii: ['Maria-Simona', 'Gheorghe-Adrian', 'Constantin'] }), sect] }]);
eq(foi.map(f => [f.categorie, f.nume.length, f.data]), [['vii', 3, '23.11.2026'], ['adormiti', 2, '23.11.2026']], 'două foi dintr-o pagină');
const multe = R.construiesteFoi([{ data: 'x', sectiuni: [{ categorie: 'vii', casa: true, nume: Array.from({ length: 20 }, (_, i) => ({ nume: 'N' + i })) }] }]);
eq(multe.map(f => [f.nume.length, f.continuare, f.casa]), [[10, false, false], [10, true, true]], 'continuare');
eq(R.grupeazaA4(Array(9).fill({})).map(a => a.length), [4, 4, 1], 'A4 câte 4');

// --- cazurile din auditul Sonnet (3.11.2026) ---
eq(L('Pr. Ioan'), 'Pr. Ioan', 'titlu preot');
eq(L('monahia Teodora'), 'Monahia Teodora', 'titlu monahie');
eq(L('mon. Teodora'), 'Monah Teodora', 'mon. nu devine Ion');
eq(L('Ion și Maria'), 'Ion-Maria', '„și" nu e nume');
eq(L('Ion și Gheorghe'), 'Ion', '„și" + același sex');
eq(L('Ion 50 de lei'), 'Ion', 'suma după nume');
const mf = R.proceseazaLinie('Maria cu fiica Ana'); eq([mf.nume, mf.casa], ['Maria', true], 'cu fiica → casa, un singur nume');
const inp = R.proceseazaLinie('Ioan cu nepoților'); eq([inp.nume, inp.casa], ['Ioan', true], 'cu nepoților');
const cf = R.proceseazaLinie('cu fii'); eq([cf.nume, cf.casa], ['', true], 'rând doar „cu fii" păstrează casa');
eq(L('Ioan Gheorghe, Maria'), 'Ioan-Maria', '3 nume amestecate → primul de fiecare sex');
eq(L('Ioniță'), 'Ioniță', 'nume nou în dicționar');
eq(L('Mărioara'), 'Mărioara', 'nu mai devine Mariana');
const sc = R.proceseazaLinie('Ana'); eq([sc.nume, sc.sigur], ['Ana', true], 'nume scurt sigur');
const nec = R.proceseazaLinie('Xyzw'); eq([nec.nume, nec.sigur], ['Xyzw', false], 'necunoscut scurt: fără corecție fuzzy');
eq(R.categorieDinTitlu('Acatist + 50 lei'), 'vii', 'plusul din titlu nu înseamnă cruce');
const sv = R.proceseazaSectiuni({ titlu: 'Vii', categorie: 'vii', cruce: false, linii: ['Ion', '+ Maria', 'Gheorghe'] });
eq(sv.map(s => [s.categorie, s.nume.map(n => n.nume)]), [['vii', ['Ion', 'Gheorghe']], ['adormiti', ['Maria']]], 'crucea pe nume mută numele la adormiți');
const sx = R.proceseazaSectiuni({ titlu: 'Vii', categorie: 'vii', cruce: true, linii: ['Ion'] });
eq(sx[0].categorie, 'adormiti', 'crucea lângă titlu bate categoria modelului');
eq(R.proceseazaSectiuni(null), [], 'secțiune null');
eq(R.proceseazaSectiuni({ linii: [null, 'Ion'] })[0].nume.length, 1, 'linie null ignorată');
eq(R.parseazaData('nov 5', azi), '05.11.2026', 'luna înainte');
eq(R.parseazaData('25 de octombrie', azi), '25.10.2026', 'cu „de"');
eq(R.parseazaData('20oct', azi), '20.10.2026', 'lipit');
eq(R.parseazaData('31.02', azi), null, '31 februarie nu există');
eq(R.parseazaData('05.11.2026', azi), '05.11.2026', 'deja normalizată');
const ech = R.construiesteFoi([{ data: 'x', sectiuni: [{ categorie: 'vii', casa: true, nume: Array.from({ length: 17 }, (_, i) => ({ nume: 'N' + i })) }] }]);
eq(ech.map(f => [f.nume.length, f.continuare, f.casa]), [[9, false, false], [8, true, true]], 'continuare echilibrată 9+8');
console.log(`${ok} ok, ${rau} pică`);
process.exit(rau ? 1 : 0);
