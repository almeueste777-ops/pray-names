# STARE – Pray Names

**Versiune:** 0.4 (4.11.2026, noaptea) – după corecturile ei: titlul (VII / ✝ ADORMIȚI) centrat ca titlu; data într-o casetă gri deschis cu cifre de tabel, sus-dreapta; mărimea literei scrisă de ea în pt (sau automată); chenarul e o RAMĂ pe marginea foii (4 mm), ornamentele stau pe bandă, interiorul curat; linii de tăiere 0,4 mm; „ctna" și „cu toată casa lor" o singură dată, jos (bifă ctna pe fiecare nume la pasul 2).
**Versiune 0.3:** (4.11.2026) – foaia nouă (chenar SVG, 2 coloane peste 10 nume, data sus-dreapta, font/mărime/chenar/culori la alegere în pasul 3), design iOS (sticlă, auriu pe cerneală), contor de cotă Gemini pe zi (cotele reale din contul ei: Flash Lite 500/zi, Flash 20/zi; reset 10:00 ora României), modelul implicit Gemini 3.5 Flash Lite (la fel de bun la nume ca Flash pe cele 9 pagini, mai slab la data albastră).
**Versiune veche:** 0.2 (3.11.2026) – după auditul Sonnet (2 blocante + 9 importante reparate). Live: https://almeueste777-ops.github.io/pray-names/ . Neprobată încă de Otilia cu mausul și fără cheie API reală.

## Ce merge (verificat)
- Regulile de tipar: 63 de probe (rândurile reale din 9 pomelnice + cazurile auditului: titluri Pr./monahia, „și", cruce pe nume, „cu fii" singur, date „nov 5"/„25 de oct"), toate verzi (`node test/reguli.test.js`).
- Încărcarea PDF prin pdf.js din browser: 9 pagini în 5 s, fără erori în consolă (`node test/cdp.mjs`).
- Pozele stau în IndexedDB, textul citit în localStorage: un refresh nu mai pierde lotul.
- Interfața pe lotul de probă (`?proba=probe/lot.json`): pasul 2 arată poza + numele editabile, nesigurele galbene.
- Tipărirea: Edge headless → PDF cu 3 coli A4 × 4 A6, regulile aplicate (Ioana‑Andreea → Ioana, „Ion ctna", „cu toată casa lor", ✝ ADORMIȚI, data jos‑dreapta).

## Citirea reală cu Gemini (4.11.2026, cheia ei, gemini-3.5-flash)
- 9/9 pagini citite, 0 erori după ce s-a ales modelul (2.5-flash = 404 retras; 3.8/3.7 = 503 supraîncărcate; lista de rezervă în ocr.js).
- Față de citirea mea din imagini: ~75 nume, 2 diferențe (p8 „Marian-Simona" vs „Maria-Simona"; p9 „Maricica" vs „Marian cu fii"), „Joan" → reparat prin regula J→I. Data albastră lipsă pe p8, pe p6 modelul a dat două date. Verificarea la pasul 2 rămâne obligatorie.

## Ce NU e probat
- Claude ca motor (cere cheie plătită de la console.anthropic.com).
- Instalarea ca PWA și tipărirea de pe imprimanta ei.

## Următorii pași
1. Ea tipărește primul teanc real și spune cum arată pe hârtie (chenar, mărime, tăiere).

## Reguli adăugate după 0.4
- 4.11, după-amiaza: **banda imprimantei** — HP LaserJet 400 M401dne nu tipărește 4,23 mm pe fiecare latură (întrebată direct prin IPP; driverul Windows „IPP Class” minte 0 mm). Rama era la 3,3–3,9 mm de marginea colii → ieșea tăiată. Acum rama și textul fiecărui cartonaș sunt retrase 2,5 mm (`SIGUR`/`--sigur`): cel mai apropiat desen la 5,7 mm de margine, pe 4/6/8/6i. Bara de derulare nu mai intră în tipar. Probă: `node test/tipar.mjs` + `python test/zona-moarta.py`. **Neprobat încă pe hârtie** (ea tipărește o coală).
- Foile fără dată primesc, la tipărire, data de azi + 7 zile (4.11.2026).

- 4 / 6 / 8 pomelnice pe coală, la alegere, în pasul 3 (4.11.2026). SPECIFICATIE.md = promptul complet pentru Gemini/Antigravity (copie pe Desktop).

- 4.11, seara: cartonașele sunt mereu portret (6 și 8 pe A4 peisaj: 99×105 și 74×105 = A7; 6 înguste 70×148 pe portret); foaie-calendar opțională la începutul teancului (tot anul, duminici roșii); numele nu se mai rup pe două rânduri.

- Interfață adaptabilă la orice ecran (telefon 320+, peisaj, tabletă, monitor), probată prin CDP la 5 mărimi (4.11.2026).

- Calendar pe 3 luni (luna tipăririi + 2); paginile expiră după 24 h; miniaturi mici + poza mare la nevoie (4.11.2026, seara).

## 7.11.2026 – cele 5 cerințe + cheia pe telefon (v18)
- Dicționar: `nume-date.js` (~1570 prenume, generat de `tools/construieste-nume.py` din 6 surse de pe net, vezi `SURSE-NUME.md`) + EXTRA în `nume.js` (nume din calendar/monahale). Era ~500.
- Abrevieri pe foaie: Pr., Presb., Arhim., Arh., Protos., Ctin, Ghe; la citire ambele forme (`TITLURI`, `NUME_SCURT`, `ALIASE` în reguli.js; `scurteaza()`).
- Coloane: promptul cere `coloana` per rând; `ordoneazaLinii()` pune coloana 1 întreagă, apoi 2 (acceptă 0-based, „dreapta", „2").
- Max 2 nume orizontal (`MAX_ORIZONTAL`), restul pe linii separate; o persoană cu titlu e luată singură.
- Nume vs altceva: `lexic.js` + `proceseazaLinii()` segmentat pe virgule; ce iese apare la pasul 2 ca „Scos din listă".
- Cheia Gemini pe telefon: ⚙ Setări → „Pune cheia și pe telefon" (cod QR, `#cheie=` în link; cheia NU e în depozit). QR decodat cu jsQR: corect.
- Teste: `node test/reguli.test.js` (278) + `node test/net-real.test.js` (35 de rânduri reale de pe net). Două runde de audit Opus; toate găsirile reparate (vezi JURNAL).
- v19: buton ↻ Actualizări (sus): „Actualizează aplicația" (descarcă fișierele de pe net, șterge memoria aplicației, reîncarcă; lotul, pozele și cheia rămân) + „Ce s-a schimbat" din `istoric.js`. **La fiecare publicare: cresc `CACHE` în sw.js ȘI adaug versiunea în `istoric.js`.**
- v20: „Aplică regulile noi" pe paginile deja citite (pasul 2): refac din `p.ocr` (păstrat acum) sau, la paginile vechi, din rândurile `original`; paginile atinse de ea (`p.editata` sau ghicit) rămân; copie + „Anulează". Paginile vechi nu au coloanele: pentru ordinea pe coloane se citesc din nou (↻ pe miniatură). Probat pe un lot în format vechi (p1 editată neatinsă, p8 → Ghe/Ctin, anularea readuce tot).
- v21 (8.11): corectură rapidă la pasul 2. `invatat.js` = memorie de corecturi în localStorage `pray-names-invatat` (cheie = ce a citit modelul, aplicată NUMAI pe rânduri galbene; la pagini noi și la „Aplică regulile noi"). UI: contor, „Următorul de verificat", „doar de verificat", Enter/✓, sugestii cu click (într-o pereche schimbă doar numele vizat), „Acceptă galbenele (N)", „Uită ce am învățat". Teste: `node test/invatat.test.js` (20). Nu există încă „uită o singură cheie" în UI (`INVATAT.uita` e folosit doar când ea revine la ce citise modelul).
- NEPROBAT: citirea reală cu Gemini a unei pagini cu 2 coloane + cuvinte ca „bolnavă" (cere cheia ei; promptul nou e netestat pe model). Dicționarul NU acoperă toate numele rare (necunoscut = galben, nu pierdut).
