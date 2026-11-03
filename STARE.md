# STARE – Pray Names

**Versiune:** 0.2 (3.11.2026) – după auditul Sonnet (2 blocante + 9 importante reparate). Live: https://almeueste777-ops.github.io/pray-names/ . Neprobată încă de Otilia cu mausul și fără cheie API reală.

## Ce merge (verificat)
- Regulile de tipar: 63 de probe (rândurile reale din 9 pomelnice + cazurile auditului: titluri Pr./monahia, „și", cruce pe nume, „cu fii" singur, date „nov 5"/„25 de oct"), toate verzi (`node test/reguli.test.js`).
- Încărcarea PDF prin pdf.js din browser: 9 pagini în 5 s, fără erori în consolă (`node test/cdp.mjs`).
- Pozele stau în IndexedDB, textul citit în localStorage: un refresh nu mai pierde lotul.
- Interfața pe lotul de probă (`?proba=probe/lot.json`): pasul 2 arată poza + numele editabile, nesigurele galbene.
- Tipărirea: Edge headless → PDF cu 3 coli A4 × 4 A6, regulile aplicate (Ioana‑Andreea → Ioana, „Ion ctna", „cu toată casa lor", ✝ ADORMIȚI, data jos‑dreapta).

## Ce NU e probat
- Citirea reală cu Gemini / Claude (lipsește cheia). Promptul și structura JSON sunt scrise, dar netestate pe API.
- Instalarea ca PWA și tipărirea de pe imprimanta ei.

## Următorii pași
1. Otilia face cheia Gemini (gratuit) → probă pe cele 9 pagini reale → numărăm greșelile pe nume.
2. Dacă Gemini greșește mult la scrisul urât (pag. 7), probăm Claude.
3. De întrebat-o: „Ana-Maria" e o persoană (nume compus) sau două? Regula actuală o face „Ana".
