# STARE – Pray Names

**Versiune:** 0.1 (3.11.2026) – prima construcție, neprobată încă de Otilia cu mausul și fără cheie API reală.

## Ce merge (verificat)
- Regulile de tipar: 38 de probe pe rândurile reale din 9 pomelnice, toate verzi (`node test/reguli.test.js`).
- Interfața pe lotul de probă (`?proba=probe/lot.json`): pasul 2 arată poza + numele editabile, nesigurele galbene.
- Tipărirea: Edge headless → PDF cu 3 coli A4 × 4 A6, regulile aplicate (Ioana‑Andreea → Ioana, „Ion ctna", „cu toată casa lor", ✝ ADORMIȚI, data jos‑dreapta).

## Ce NU e probat
- Citirea reală cu Gemini / Claude (lipsește cheia). Promptul și structura JSON sunt scrise, dar netestate pe API.
- Încărcarea PDF prin pdf.js din browser (testată doar calea cu lot gata făcut).
- Instalarea ca PWA și tipărirea de pe imprimanta ei.

## Următorii pași
1. Otilia face cheia Gemini (gratuit) → probă pe cele 9 pagini reale → numărăm greșelile pe nume.
2. Dacă Gemini greșește mult la scrisul urât (pag. 7), probăm Claude.
3. Publicare pe GitHub Pages.
