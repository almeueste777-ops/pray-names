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
eq(multe.map(f => [f.nume.length, f.continuare, f.casa]), [[16, false, false], [4, true, true]], 'continuare');
eq(R.grupeazaA4(Array(9).fill({})).map(a => a.length), [4, 4, 1], 'A4 câte 4');
console.log(`${ok} ok, ${rau} pică`);
process.exit(rau ? 1 : 0);
