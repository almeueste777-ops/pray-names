# JURNAL – Pray Names

## 2026-11-03 – nașterea proiectului
- Otilia întreabă dacă e realizabil: pomelnice scrise de mână (A4 și A6) → scanare → citire → foi A6 de tipar, 4 pe A4, cu data.
- Răspuns: da; necunoscuta e OCR‑ul pe scris de mână românesc. Pe net (AIMultiple 2026): modelele cu vedere ~90% pe cursiv, nimeni nu a testat nume proprii.
- Ea trimite 9 pomelnice scanate (CamScanner). Le citesc eu din imagine: 7/9 fără ezitare, pag. 7 scrisă foarte urât, pag. 3 nesigură.
- Hotărârile ei: doar categorie + nume + data; cruce/„morți" = adormiți; acatist/nimic = vii; două nume același sex → primul; „cu tot neamul…" → ctna; „cu fii" → „cu toată casa lor" jos; data = cea albastră.
- Construit: `reguli.js` + 38 teste verzi, `nume.js` (197 m / 229 f), `ocr.js` (Gemini/Claude), interfața în 3 pași, PWA. Probă fără cheie cu `?proba=` pe scanările reale, tipărit în PDF prin Edge headless: corect.
- Presupuneri declarate: vii + morți pe aceeași foaie = două A6; anul datei = curent (+1 dacă e trecut de 60 zile); sex necunoscut → păstrez ambele nume, galben.
- Audit Sonnet: 2 BLOCANTE (lotul se pierdea la refresh pentru că pozele nu încăpeau în localStorage; text din răspunsul modelului pus neescapat în HTML) + importante (Pr./monahia stricate, „și" luat ca nume, crucea pe nume ignorată, data cu alt pix luată automat, sw cache fix, pdf.js import static). Toate reparate; 63 de teste verzi; reprobat în Edge headless (pas 2, tipărire, pdf.js prin CDP).
- Publicat: Otilia a dat voie permanent (`gh repo create*`, `gh api repos/almeueste777-ops/*` în settings.json). Depozit public almeueste777-ops/pray-names + GitHub Pages.
- 4.11 (noaptea): ea a lipit cheia Gemini → toate paginile cu eroare. Am citit eroarea din browserul ei prin Chrome: `gemini-2.5-flash` retras (404) pentru conturi noi; 3.8 și 3.7 dădeau 503; 3.5-flash a mers. Acum ocr.js încearcă modelele pe rând. Citire reală 9/9, ~97% nume corecte față de citirea mea; „Joan"→Ioan adăugat. Ea: Ana-Maria = un nume; Roxana Gabriela → Roxana (regulă + teste). Google Cloud Vision: cere card și dă doar text brut → lăsat ca rezervă.
- Lecție: `--virtual-time-budget` din Edge headless îngheață `import()` dinamic de pe CDN → proba arată fals „blocat"; pentru pași asincroni se folosește CDP (test/cdp.mjs) cu așteptare pe o condiție din pagină.
