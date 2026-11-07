// node test/invatat.test.js — memoria de corecturi (invatat.js) + legătura cu reguli.js
const I = require('../invatat.js'), R = require('../reguli.js');
let ok = 0, rau = 0;
function eq(a, b, t) { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { rau++; console.log('PICA', t, '\n  primit ', JSON.stringify(a), '\n  astept ', JSON.stringify(b)); } }

let m = I.gol();
eq(I.numara(m), 0, 'memorie goală');
m = I.invata(m, 'Marian-Simona', 'Maria-Simona');
eq(I.numara(m), 1, 'a învățat 1');
// fără diacritice / majuscule la cheie
eq(I.fd('Ștefăniță'), 'stefanita', 'fd diacritice');
eq(I.fd('ŞTEFAN'), 'stefan', 'fd sedilă');

// se aplică DOAR pe galbene
const s = [{ nume: [
  { nume: 'Marian-Simona', sigur: false, original: 'Marian-Simona' },
  { nume: 'Marian-Simona', sigur: true, corectat: false, original: 'Marian-Simona' },
  { nume: 'Alt', sigur: false, original: 'Alt' }] }];
eq(I.aplica(m, s), 1, 'rezolvă un rând');
eq(s[0].nume.map(r => r.nume), ['Maria-Simona', 'Marian-Simona', 'Alt'], 'galben corectat, sigur neatins, necunoscut neatins');
eq(s[0].nume[0].sigur && s[0].nume[0].invatat, true, 'marcat învățat');

// confirmat ca atare: un nume necunoscut nu mai e galben
m = I.invata(m, 'Zamfira', 'Zamfira');
const s2 = [{ nume: [{ nume: 'Zamfira', sigur: false, original: 'Zamfira' }] }];
I.aplica(m, s2);
eq([s2[0].nume[0].sigur, s2[0].nume[0].nume], [true, 'Zamfira'], 'confirmat ca atare');

// uită
m = I.uita(m, 'Zamfira'); eq(I.numara(m), 1, 'uitat');

// memorie stricată / date ciudate nu dau crash
eq(I.aplica(null, [{ nume: [{ nume: 'x', sigur: false }] }]), 0, 'memorie null');
eq(I.aplica({ corectii: 5 }, [null, {}, { nume: [null] }]), 0, 'date ciudate');
eq(I.numara(I.invata(I.gol(), '', 'x')), 0, 'gol nu se învață');

// legătura cu reguli: un nume pe care dicționarul îl dă galben, după învățare devine sigur
const brut = R.proceseazaSectiuni({ categorie: 'vii', linii: [{ text: 'Zamfira' }] });
const galben = brut[0].nume.filter(n => !n.sigur);
if (galben.length) {
  const mm = I.invata(I.gol(), galben[0].original || galben[0].nume, galben[0].nume);
  const b2 = R.proceseazaSectiuni({ categorie: 'vii', linii: [{ text: 'Zamfira' }] });
  I.aplica(mm, b2);
  eq(b2[0].nume.every(n => n.sigur), true, 'după învățare nu mai e galben (reguli reale)');
} else ok++;

// auditul 8.11: cheia e ce a CITIT modelul; un nume ajuns la același rezultat din altă greșeală nu primește corectura
{
  const mm = I.invata(I.gol(), 'Marian', 'Maria');
  const rr = [{ nume: [{ nume: 'Marian', sigur: false, corectat: true, original: 'Mariane' }, { nume: 'Marian', sigur: false, original: 'Marian' }] }];
  eq(I.aplica(mm, rr), 1, 'doar rândul cu original „Marian"');
  eq(rr[0].nume.map(x => x.nume), ['Marian', 'Maria'], 'Mariane→Marian nu e atins');
  eq(rr[0].nume[1].invatatDin, 'Marian', 'cheia sub care s-a învățat se păstrează');
}
// memorie stricată: valori ne-șir, array, „constructor"
eq(I.numara({ corectii: { ion: {}, ana: 'Ana', x: '' } }), 1, 'doar perechile șir→șir rămân');
eq(I.numara({ corectii: [1, 2] }), 0, 'array nu e memorie');
{ const sx = [{ nume: [{ nume: 'constructor', sigur: false, original: 'constructor' }] }]; I.aplica(I.gol(), sx); eq(sx[0].nume[0].nume, 'constructor', '„constructor" nu devine funcție'); }
// re-învățarea mută cheia la coadă
{ let q = I.invata(I.invata(I.gol(), 'a1', 'A'), 'b1', 'B'); q = I.invata(q, 'a1', 'A2'); eq(Object.keys(q.corectii), ['b1', 'a1'], 'cheia corectată recent trece la coadă'); }

// cuvinte declarate nume (restaurate din „Scos din listă")
{ let q = I.declaraNume(I.gol(), 'Mărgărit'); q = I.declaraNume(q, 'mărgărit'); q = I.declaraNume(q, ''); eq(I.listaNume(q), ['Mărgărit'], 'fără dubluri, fără goale'); eq(I.listaNume({ nume: 5 }), [], 'listă stricată'); }
// legătura cu limba română: cuvântul declarat nume nu mai e scos
{ R.seteazaExceptii(['Cuminte']); eq(R.proceseazaLinii('Ion Cuminte').map(l => [l.nume, l.sigur]), [['Ion-Cuminte', false]], 'exceptat: rămâne nume (sex necunoscut → legat, galben)');
  R.seteazaExceptii([]); eq(R.proceseazaLinii('Ion Cuminte').map(l => l.nume), ['Ion'], 'fără excepție: cuvânt obișnuit, scos'); }

console.log(`${ok} ok, ${rau} pică`);
process.exit(rau ? 1 : 0);
