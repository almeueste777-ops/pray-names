// Istoricul versiunilor: se arată la ↻ Actualizări → „Ce s-a schimbat". Cea mai nouă e prima.
// `versiune` = numărul din sw.js (CACHE = 'pray-names-vNN'); la fiecare publicare cresc ambele și adaug aici ce s-a schimbat, pe înțelesul ei.
const ISTORIC = [
  { versiune: 22, data: '8.11.2026', puncte: [
    'Două nume de sex opus pe același rând (Petru-Lavinia) sunt acum DOUĂ persoane: Lavinia vine sub Petru, în coloana verticală. Același sex (Ioana-Andreea) rămâne un singur om cu nume dublu.',
    'Aplicația știe limba română: un dicționar de ~99.000 de cuvinte românești (luat de pe dexonline) hotărăște ce NU e nume („soarta", „pomenire", „liniștită"…). Ce a scos se vede la pasul 2; „↩ e nume" pune cuvântul la loc și aplicația ține minte.',
  ] },
  { versiune: 21, data: '8.11.2026', puncte: [
    'Corectură mai rapidă la pasul 2: sus ai „N rânduri de verificat", butonul „Următorul de verificat" și opțiunea „arată doar ce e de verificat" (restul paginii dispare).',
    'La un rând galben: Enter sau ✓ înseamnă „e bine așa" și cursorul sare la următorul galben. Un nume din „poate: …" se alege cu un click.',
    'Aplicația ÎNVAȚĂ din corecturile tale: ce ai corectat sau confirmat o dată nu mai apare galben data viitoare (la pagini noi și la „Aplică regulile noi"). „Uită ce am învățat" șterge memoria.',
    'Pe fiecare pagină: „Acceptă galbenele (N)" dintr-un click (rândurile cu „poate: …" rămân, le alegi tu).',
  ] },
  { versiune: 20, data: '7.11.2026', puncte: [
    'Regulile noi se aplică acum și pe paginile DEJA citite: la pasul 2, caseta „Regulile noi pe paginile deja citite" → „Aplică regulile noi". Paginile pe care le-ai corectat de mână nu se ating; „Anulează" readuce starea de dinainte.',
    'De acum răspunsul modelului se păstrează pe pagină, deci regulile viitoare se pot reaplica oricând fără să mai citești pagina din nou.',
  ] },
  { versiune: 19, data: '7.11.2026', puncte: [
    'Buton nou ↻ Actualizări (sus, lângă ⚙): actualizează aplicația și arată ce s-a schimbat.',
  ] },
  { versiune: 18, data: '7.11.2026', puncte: [
    'Dicționar mare de prenume românești (~1650, luate de pe net): verifică ce e nume, corectează greșelile de citire și hotărăște sexul pentru regula „două nume pe rând".',
    'Abrevieri pe foaie: Părintele = Pr., Presbitera = Presb., Arhimandrit = Arhim., Arhiereu = Arh., Protosinghel = Protos., Constantin = Ctin, Gheorghe = Ghe. Scrise de mână în oricare formă, se înțeleg la citire.',
    'Pomelnic pe două coloane: se scrie întâi toată prima coloană de sus în jos, apoi a doua, fără să se încurce.',
    'Pe un rând se citesc cel mult 2 nume orizontal; al 3-lea, al 4-lea… coboară fiecare pe linia lui, în coloană. O persoană cu titlu (Pr., Monahia…) e luată singură.',
    '„Bolnavă", „se roagă", „pentru sănătate", sume, vârste, luni nu mai sunt luate drept nume. La pasul 2 se vede ce s-a scos („Scos din listă").',
    'Cheia Gemini și pe telefon: ⚙ Setări → „Pune cheia și pe telefon" (cod QR). Cheia nu e pusă nicăieri pe internet.',
  ] },
  { versiune: null, data: '4.11.2026', puncte: [
    'Foaie-calendar pe 3 luni (luna tipăririi + 2), cu celule mari. Paginile încărcate dispar singure după 24 de ore. Miniaturi mici: merge repede și la 100 de pagini.',
    'Rama și textul sunt retrase 2,5 mm de marginea colii, ca imprimanta HP să nu mai taie chenarul.',
    '„+ nume", ✕ și „+ secțiune" nu mai fac pagina să sară la început.',
    'Fiecare coală începe pe pagina ei la tipar: imaginea nu mai urcă în sus de la o coală la alta.',
    'Cartonașe mereu portret; 4, 6 sau 8 pe coală; chenar, font și mărimea literei la alegere; cotă Gemini pe zi vizibilă.',
  ] },
  { versiune: null, data: '3.11.2026', puncte: [
    'Prima versiune: pomelnice scrise de mână (PDF sau poze) → citite de Gemini → verificate de tine → foi A6, câte 4 pe o coală A4, cu categoria, numele și data.',
  ] },
];
if (typeof window !== 'undefined') window.ISTORIC = ISTORIC;
if (typeof module !== 'undefined') module.exports = ISTORIC;
