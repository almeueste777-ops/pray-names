# Pray Names

PWA care transformă pomelnicele scrise de mână (scanate în PDF sau poze) în foi A6 de tipar, câte 4 pe o coală A4, cu categoria (Vii / ✝ Adormiți), numele și data.

## Cum se folosește
1. **Scanezi** teancul de pomelnice (CamScanner sau orice scanner) într‑un PDF; o pagină = un pomelnic.
2. Deschizi aplicația, pui o singură dată cheia API în ⚙ (Gemini e gratuit, cu limită zilnică).
3. **1 · Încarcă**: alegi PDF‑ul, apeși „Citește toate paginile". Fiecare pagină e trimisă modelului cu vedere, care transcrie scrisul de mână.
4. **2 · Verifică**: poza lângă textul citit; numele galbene sunt nesigure. Corectezi, ștergi, adaugi, schimbi categoria sau data.
5. **3 · Tipărește**: coli A4 cu 4 pomelnice A6, o singură față. Imprimantă sau „Salvează ca PDF", margini „Niciuna", scară 100%. Tai pe liniile punctate.

## Regulile de tipar (hotărâte de Otilia, 3.11.2026)
- Pe foaie rămân doar **categoria, numele și data**. Fără sume, fără rugăminți.
- Cruce sau „Morți(i)" / „Adormiți" ⇒ Adormiți. „Acatist", „Vii", „Sf. Liturghie" sau nimic ⇒ Vii.
- Două nume pe un rând, **același sex ⇒ doar primul**; sex diferit ⇒ amândouă. Sexul vine din `nume.js`.
- „cu tot neamul lui/ei cel adormit" ⇒ `ctna` după nume.
- „cu fii", „cu fiii și nepoții" etc. ⇒ o singură dată, jos: „cu toată casa lor".
- Data de pe foaie = cea scrisă cu pix albastru pe pomelnic (data când iese de la pomenire). Anul: cel curent, sau următorul dacă data a trecut de peste 60 de zile.
- Un pomelnic cu Vii și Adormiți dă două foi A6. Peste 16 nume ⇒ foaie de continuare.

## Fișiere
- `index.html`, `style.css`, `app.js` – interfața (3 pași), tipărirea prin CSS `@page A4`.
- `ocr.js` – apelul la model (Gemini sau Claude) direct din browser, cu promptul de transcriere.
- `reguli.js` – regulile de mai sus, funcții pure; `nume.js` – dicționarul de prenume cu sex.
- `test/reguli.test.js` – probe pe rândurile reale din primele 9 pomelnice: `node test/reguli.test.js`.
- `probe/` (negit) – lot de probă din scanări reale: `python probe/fa-lot.py <pdf>` apoi `index.html?proba=probe/lot.json&pas=3`.
- `sw.js`, `manifest.webmanifest` – PWA, merge offline (mai puțin citirea).

## Probe locale fără mâini
```
python -m http.server 8765 --bind 127.0.0.1
msedge --headless=new --print-to-pdf=foi.pdf "http://127.0.0.1:8765/index.html?proba=probe/lot.json&pas=3"
```
