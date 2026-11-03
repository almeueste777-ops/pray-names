# JURNAL – Pray Names

## 2026-11-03 – nașterea proiectului
- Otilia întreabă dacă e realizabil: pomelnice scrise de mână (A4 și A6) → scanare → citire → foi A6 de tipar, 4 pe A4, cu data.
- Răspuns: da; necunoscuta e OCR‑ul pe scris de mână românesc. Pe net (AIMultiple 2026): modelele cu vedere ~90% pe cursiv, nimeni nu a testat nume proprii.
- Ea trimite 9 pomelnice scanate (CamScanner). Le citesc eu din imagine: 7/9 fără ezitare, pag. 7 scrisă foarte urât, pag. 3 nesigură.
- Hotărârile ei: doar categorie + nume + data; cruce/„morți" = adormiți; acatist/nimic = vii; două nume același sex → primul; „cu tot neamul…" → ctna; „cu fii" → „cu toată casa lor" jos; data = cea albastră.
- Construit: `reguli.js` + 38 teste verzi, `nume.js` (197 m / 229 f), `ocr.js` (Gemini/Claude), interfața în 3 pași, PWA. Probă fără cheie cu `?proba=` pe scanările reale, tipărit în PDF prin Edge headless: corect.
- Presupuneri declarate: vii + morți pe aceeași foaie = două A6; anul datei = curent (+1 dacă e trecut de 60 zile); sex necunoscut → păstrez ambele nume, galben.
