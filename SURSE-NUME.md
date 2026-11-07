# Sursele dicționarului de prenume (`nume-date.js`)

Descărcate pe 7.11.2026 și îmbinate de `tools/construieste-nume.py` (fiecare prenume își ține grafia exactă: Florica = f, Florică = m;
o grafie fără diacritice se îmbină cu una cu diacritice doar dacă au același sex). Rezultat: 743 masculine, 796 feminine, 25 de sex nesigur.

| Sursă | Ce conține | Licență |
|---|---|---|
| ro.wikipedia.org – „Listă de prenume românești" | ~1000 prenume, feminine/masculine | CC BY-SA 4.0 |
| en.wiktionary.org – Category:Romanian male/female given names | ~280 prenume | CC BY-SA 4.0 |
| Wikidata (SPARQL, prenume cu „limba numelui = română") | ~400 prenume cu sex | CC0 |
| dgep.mai.gov.ro – statisticile pe sărbători (Direcția pentru Evidența Persoanelor, Ministerul de Interne) | ~550 prenume purtate efectiv de români, cu numărul de persoane | informații publice |
| `nam_dict.txt` (Heise c't, coloana România; copie în gender-guesser) | prenume cu frecvență în România (doar grafii românești, frecvență ≥ 3) | GFDL 1.2 |
| tue-mdse/genderComputer – RomaniaMale/FemaleUTF8.csv | ~940 prenume (din Wikipedia + childnamesworld) | vezi depozit |
| lista veche din `nume.js` (hotărârile Otiliei) | ~500 prenume, contează dublu la sex | — |

Nu intră: nume cu cratimă (Ana-Maria, George-Andrei — sunt două nume, le tratează regulile), „Joana/Joan/Yoan" (greșeli de citire pentru Ioana/Ioan).
Sex nesigur (u): sursele se contrazic; la „două nume pe un rând" un nume u nu hotărăște singur, deci rămân ambele, marcate galben.
Cuvintele care NU sunt nume (bolnavă, se roagă…) sunt în `lexic.js`, făcute de mână.

## Limba română (ce NU e nume) – `limba-date.js`, 8.11.2026
Generat de `python -X utf8 -I tools/construieste-limba.py <dosar-surse> limba-date.js 5`. Surse descărcate de pe net:
| Sursă | Ce e | Licență |
|---|---|---|
| dexonline.ro – LOC 5.0 „forme flexionare" (`loc-flexiuni-5.0.zip`) | 679.683 de forme valide ale cuvintelor românești (Lista Oficială de Cuvinte de scrabble: DEX, DOOM, DLRM…) | liberă (dexonline) |
| hermitdave/FrequencyWords – `ro_full.txt` (din subtitrări OpenSubtitles) | 1,2 milioane de forme cu numărul de apariții | CC BY-SA 4.0 |
Se păstrează cuvintele care sunt și în LOC, și cu ≥ 5 apariții, minus prenumele din `nume-date.js`: ~99.000 de cuvinte, ~950 KB (≈ 350 KB comprimat la descărcare). Lista întreagă LOC (679k) nu s-a folosit: un șir de litere oarecare nimerește prea ușor în ea și ar mânca nume rare citite puțin greșit.
