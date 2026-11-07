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
