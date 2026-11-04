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
- Foile fără dată primesc, la tipărire, data de azi + 7 zile (4.11.2026).

- 4 / 6 / 8 pomelnice pe coală, la alegere, în pasul 3 (4.11.2026). SPECIFICATIE.md = promptul complet pentru Gemini/Antigravity (copie pe Desktop).

- 4.11, seara: cartonașele sunt mereu portret (6 și 8 pe A4 peisaj: 99×105 și 74×105 = A7; 6 înguste 70×148 pe portret); foaie-calendar opțională la începutul teancului (tot anul, duminici roșii); numele nu se mai rup pe două rânduri.

- Interfață adaptabilă la orice ecran (telefon 320+, peisaj, tabletă, monitor), probată prin CDP la 5 mărimi (4.11.2026).

- Calendar pe 3 luni (luna tipăririi + 2); paginile expiră după 24 h; miniaturi mici + poza mare la nevoie (4.11.2026, seara).
