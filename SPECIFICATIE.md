# Pray Names — specificație completă (prompt pentru Gemini / Antigravity)

Dă acest text întreg modelului. Este descrierea exactă a aplicației **Pray Names** (https://almeueste777-ops.github.io/pray-names/ , cod public: https://github.com/almeueste777-ops/pray-names), ca el să poată construi, modifica sau continua aceeași aplicație, în același format. Tot ce e scris aici sunt hotărâri luate și verificate pe pomelnice reale; nu sunt de negociat.

---

## 1. Ce face aplicația

Primesc multe pomelnice (liste de nume de pomenit) scrise de mână, în limba română, pe foi A4 sau A6, într‑un teanc de până la 100 de foi. Le scanez (CamScanner) într‑un singur PDF, o pagină = un pomelnic. Aplicația:

1. încarcă PDF‑ul sau pozele și arată fiecare pagină ca miniatură;
2. trimite fiecare pagină unui model cu vedere (Gemini) care transcrie scrisul de mână într‑o structură JSON;
3. aplică regulile de tipar (secțiunea 4) și îmi arată, pagină cu pagină, poza lângă textul citit, ca să corectez;
4. așază pomelnicele curate pe coli A4, câte 4, 6 sau 8 pe coală, pe o singură față, cu chenar, titlu, nume și dată;
5. tipărește prin dialogul browserului (sau „Salvează ca PDF").

Este o PWA (HTML + CSS + JavaScript, fără server, fără framework), publicată pe GitHub Pages, instalabilă, merge offline cu excepția citirii. Limba interfeței: română, cu diacritice corecte (ș, ț, ă, â, î).

## 2. Tehnic

- Fișiere: `index.html`, `style.css`, `app.js` (interfața, 3 pași), `ocr.js` (apelul la model + cota zilnică), `reguli.js` (regulile de tipar, funcții pure, testate în Node), `nume.js` + `nume-date.js` (dicționar de ~1560 prenume românești cu sex m/f/u, generat de `tools/construieste-nume.py` din ro.wikipedia, Wiktionary, Wikidata, DGEP‑Ministerul de Interne, Heise și genderComputer; surse în `SURSE-NUME.md`), `lexic.js` (ce NU e nume: bolnavă, se roagă, sume…), `foaie.js` (foaia de tipar: chenar SVG, coloane, fonturi), `sw.js` (service worker), `manifest.webmanifest`, `test/reguli.test.js` (278 de teste: `node test/reguli.test.js`) și `test/net-real.test.js` (35 de rânduri reale de pomelnic luate de pe net: ghidulfunerar.ro, parastas.md, ortodox.md, sfantulandrei.org).
- PDF‑ul se citește în browser cu pdf.js 4.10.38 de pe cdnjs, randat la 150 dpi, JPEG 85%.
- Pozele stau în IndexedDB, textul citit în localStorage (cheia `pray-names-lot`), setările în `pray-names-setari`, contorul de cotă în `pray-names-contor`. Un refresh nu pierde nimic.
- Content‑Security‑Policy strictă; orice text venit de la model se escapează înainte de a intra în HTML.
- Service worker: fișierele proprii „rețea întâi" cu `fetch(req, {cache:'no-cache'})` (altfel GitHub Pages ține 10 minute fișierele vechi), cdnjs și Google Fonts „cache întâi".

## 3. Citirea (OCR) cu Gemini

Apel direct din browser la `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key`, corpul: imaginea (`inlineData`) ÎNAINTEA textului, `generationConfig: { responseMimeType: 'application/json', temperature: 0 }`.

Modele, încercate pe rând până răspunde unul (la 404 = model retras, 429 cotă pe zi, 503 supraîncărcat după 3 reîncercări cu pauze 3 s / 8 s / 15 s):
1. `gemini-3.5-flash-lite` — 500 cereri/zi, 15/minut (gratuit) — implicit; la nume e la fel de bun ca Flash, mai slab la data scrisă cu albastru;
2. `gemini-3.1-flash-lite` — 500/zi;
3. `gemini-3.5-flash` — cotă necunoscută;
4. `gemini-3.8-flash`, `gemini-3-flash-preview` — 20/zi, 5/minut.
`gemini-2.5-flash` NU mai merge pentru conturi noi (404). Cotele se numără pe proiect și se refac la miezul nopții în California = 10:00 ora României. Aplicația ține un contor pe model și pe zi, arată „azi X din 500, mai ai voie Y", se face galben sub 10 rămase, roșu la 0, întreabă înainte dacă paginile de citit depășesc cota și se oprește curat la 429 (paginile rămase se citesc a doua zi).

Promptul trimis modelului (exact):

```
Ești un cititor de pomelnice ortodoxe scrise de mână în limba română. Primești fotografia unei foi.
Transcrie ce e scris, cât mai fidel, și răspunde NUMAI cu JSON de forma:
{
  "sectiuni": [
    {"titlu": "titlul scris deasupra listei (ex. Vii, Adormiți, Morții, Acatist, Sf. Liturghie) sau "" dacă nu există",
     "categorie": "vii" | "adormiti" | "necunoscut",
     "cruce": true dacă lângă titlu e desenată o cruce (+ sau †), altfel false,
     "linii": [{"text": "un rând de nume exact cum e scris, cu cratime, titluri (Pr., monahia) și completări precum 'cu tot neamul lui cel adormit' sau 'cu fii'; dacă rândul începe cu o cruce desenată, pune '+ ' în față", "coloana": 1, "sigur": true|false}]}
  ],
  "data_albastra": "data scrisă cu pix ALBASTRU, de obicei în dreapta sus, exact cum e scrisă (ex. '20 oct', '15 nov', '4.10') sau null dacă nu există nimic scris cu albastru",
  "alte_date": ["alte date de pe foaie, scrise cu alt pix"],
  "observatii": "rugăminți (pt. sănătate...), sume (50 lei), orice altceva care nu e nume"
}
Reguli:
- O foaie poate avea mai multe secțiuni (de ex. întâi Vii, apoi Morții). Fiecare listă sub un titlu e o secțiune. Dacă nu e niciun titlu, o singură secțiune cu titlu "".
- categorie: "adormiti" pentru Adormiți/Morți/cruce; "vii" pentru Vii/Acatist/Liturghie sau fără titlu; "necunoscut" doar dacă nu poți hotărî.
- În "linii" pun DOAR rândurile cu nume de persoane, câte un rând scris de mână = un element. Sumele, datele, rugămințile, numele mănăstirii tipărit pe antet NU intră în linii.
- COLOANE: dacă lista are DOUĂ (sau mai multe) coloane de nume, fiecare rând primește în "coloana" numărul coloanei (1 = cea din stânga, 2 = următoarea). Dai rândurile în ordinea de citire: ÎNTÂI toată coloana 1 de sus până jos, ABIA APOI toată coloana 2 de sus până jos. Un nume din coloana 1 și unul din coloana 2 aflate la aceeași înălțime NU se pun pe același rând și nu se amestecă. Dacă lista are o singură coloană, "coloana" este 1 la toate rândurile.
- Într-un rând pot fi scrise unul lângă altul (orizontal) mai multe nume: transcrie rândul întreg exact cum e scris, pe un singur element; aplicația le așază apoi pe verticală.
- Cuvintele care nu sunt nume (bolnavă, bolnav, se roagă, pentru sănătate, mulțumire, vârste, sume) nu sunt nume de persoane. Dacă stau singure pe un rând, pune-le în "observatii", nu în "linii". Dacă stau pe același rând cu un nume, lasă rândul întreg în "linii": aplicația le separă singură.
- Prescurtările scrise de mână le copiezi exact, fără să le dezvolți: Pr., Părintele, Ctin, Ghe, Presb., Arhim., Arh., Protos.
- Numele sunt prenume românești (Ioan, Maria, Gheorghe, Elena...). Dacă un nume e greu de citit, scrie varianta cea mai probabilă și pune "sigur": false.
- Scrie numele cu Prima-Literă-Mare și cu diacritice românești corecte (ș, ț, ă, â, î), chiar dacă pe foaie sunt cu majuscule.
- Nu inventa nume care nu sunt pe foaie. Nu omite rânduri.
```

## 4. Regulile de tipar (hotărârile mele; toate au teste)

1. **Pe foaie rămân DOAR: categoria (titlu), numele, data.** Fără sume, fără rugăminți („pt. sănătate…"), fără antetul mănăstirii.
2. **Categoria:** cruce desenată, „Morți(i)", „Adormiți", „decedați", „răposați" → **✝ ADORMIȚI**. „Vii", „Acatist", „Sf. Liturghie" sau niciun titlu → **VII**. Crucea bate orice titlu. Un nume cu cruce în față („+ Maria") într‑o listă de vii se mută singur la adormiți. O pagină cu vii ȘI adormiți dă două pomelnice separate.
3. **Două nume pe același rând:** dacă au **același sex → rămâne doar primul** („Roxana Gabriela" → Roxana; „Marcela Mihaela" → Marcela; „Ioana‑Andreea" → Ioana; „Ion‑Vasile" → Ion). **(8.11.2026, hotărârea ei) Sexe diferite = DOUĂ persoane** („Petru‑Lavinia": Petru e bărbat, Lavinia e femeie → **Lavinia vine sub Petru, în coloana verticală**; „Antonia‑Ștefan" → „Antonia", apoi „Ștefan" sub ea; ordinea scrisă se păstrează). (Înainte: rămâneau legate cu cratimă; abrogat.) **(7.11.2026) Pe un rând se citesc cel mult 2 nume orizontal**: numele de după al doilea nu se mai citesc orizontal, ci **fiecare coboară pe linia lui, în coloană** („Maria Ion Elena Vasile Ana" → „Maria", „Ion", „Elena", „Vasile", „Ana"; „Maria Elena Ion" → „Maria", „Ion"). Sexul vine din dicționar; nume necunoscut sau de sex nesigur → rămân ambele legate cu cratimă, marcate galben la verificare.
3b. **(7.11.2026) Pomelnic pe două coloane:** se scrie întâi toată prima coloană de sus în jos, abia apoi a doua; coloanele nu se amestecă niciodată (modelul dă fiecărui rând `coloana`, aplicația le sortează stabil după ea).
4. **Excepție:** **„Ana‑Maria" este un singur nume întreg** și rămâne „Ana‑Maria" (scris și „Ana Maria"). Lista numelor compuse: `COMPUSE = [['Ana','Maria']]`, se poate extinde.
5. **„cu tot neamul lui/ei cel adormit"** (sau „ctna") → numele rămâne curat, iar pe foaie se scrie **o singură dată, jos: „ctna"**, oricâte nume o cer.
6. **„cu fii", „cu fiii și nepoții", „cu copiii", „cu familia", „cu toată casa"** → numele rămâne curat, iar pe foaie se scrie **o singură dată, jos: „cu toată casa lor"**.
7. **Titluri** („Pr.", „Preot", „Părintele", „Ierom.", „Presb.", „Monahia", „Maica", „Arhim.", „Arh.", „Protos.", „Diac.", „PS", „IPS", „Sf.") rămân în fața numelui și nu sunt nume. Cuvinte de umplutură („și", „cu", „de", „lui", „cel", „fiul", „soția", „lei", „amin"…) se scot.
7b. **Abrevieri (7.11.2026): pe foaie se scrie forma scurtă; la citire se înțeleg ambele forme.** Părintele = **Pr.**, Presbitera = **Presb.**, Arhimandrit = **Arhim.**, Arhiereu = **Arh.**, Protosinghel = **Protos.**, Constantin = **Ctin**, Gheorghe = **Ghe** (scris de mână și „Ctin", „C‑tin", „Ghe", „Gh." → același nume; „Ctin" și „Ghe" sunt bărbați). Se aplică și numelor corectate de mână la pasul 2. „Constantina", „Costin", „Gheorghița" NU se scurtează.
8. **Normalizare:** Prima‑Literă‑Mare, diacritice; „YOAN"/„Joan" → Ioan, „Joana" → Ioana. Un nume care nu e în dicționar se corectează la cel mai apropiat nume cu 1 literă diferență de la 5 litere în sus (2 de la 8 litere) și se marchează galben; sub 5 litere nu se corectează.
9. **Data de pe foaie = data scrisă cu pix ALBASTRU** pe pomelnic (ziua când pomelnicul iese de la pomenire). Formate acceptate: „20 oct", „15 nov", „nov 5", „25 de octombrie", „4.10", „3‑X‑2026", „20oct". Anul: cel curent; dacă data ar fi cu peste 60 de zile în urmă, anul următor. O dată cu alt pix NU se ia automat (se arată doar ca sugestie). **O foaie fără dată primește, la tipărire, data de azi + 7 zile.** Pe foaie data e în format `zz.ll.aaaa`.
10. **Rânduri care nu sunt nume** („50 lei", „25 oct", „pt. sănătate…") se ignoră.
10b. **Ce e nume și ce nu e (7.11.2026):** fiecare cuvânt de pe un rând e verificat pe rând: (1) prenume exact din dicționar → NUME, sigur; (2) titlu sau abreviere (7, 7b); (3) umplutură („și", „cu"…) → se scoate în tăcere; (4) cuvânt din `lexic.js` — stări și rugăminți (bolnav/bolnavă, suferind, operat, spital, se roagă, pentru sănătate, mulțumire, examen, călătorie…), relații (fiul, nepoții), bani/date/vârste („5 ani") → NU e nume: iese din listă și apare la pasul 2 ca **„Scos din listă (nu sunt nume): …"**; (4b) **(8.11.2026) limba română întreagă:** orice cuvânt frecvent al limbii române din `limba-date.js` (~99.000 de forme: LOC 5.0 de la dexonline ∩ cuvinte frecvente, fără prenumele din dicționar) care NU e prenume din dicționar iese din listă și apare la pasul 2 ca „Scos din listă", cu butonul „↩ e nume" (îl pune la loc și aplicația ține minte că e nume); excepție: dacă pe rând nu rămâne niciun alt nume, cele 1–2 cuvinte rămân, galbene; (5) apropiat de un prenume (1 literă de la 5 litere, 2 de la 8) → corectat, galben; dacă DOUĂ nume sunt la fel de aproape, nu se alege nimic: rămâne cum e scris, galben, cu „poate: A / B"; (6) altfel → nume necunoscut, galben. Un cuvânt care e și prenume și cuvânt obișnuit (Ani, Mari, Mila, Nora) rămâne nume, în afară de „5 ani". „pt.", „pentru", „se roagă", „sănătate", „spor", „succes", „amin": la început de segment (între virgule) se scoate doar cuvântul; după un nume taie restul segmentului (până la virgulă); „pt. sănătate: Ion, Maria" păstrează numele de după „:". **Titlurile** (Pr., preoteasa, monahia…) se leagă de numele care le URMEAZĂ („Pr. Ion și preoteasa Maria" → „Pr. Ion", „Preoteasa Maria"); un titlu după numele din același segment se leagă de acel nume („Vasile preotul" → „Pr. Vasile"); un nume cu titlu propriu e altă persoană și nu se contopește cu cel dinainte. **Nume fără diacritice** care pot fi mai multe nume (Costica f / Costică m, Ghita) își păstrează grafia, au sex necunoscut și nu pierd perechea. „Cu toată casa lor" se pune la „cu/și copiii", „cu fiicele", „cu nepotul", „cu fam.", „cu toți ai casei" (DOAR după „cu"/„și": „fiica Ioana" sau „Familia: Ion, Maria" la început de segment rămân nume); ce urmează după „cu fiica…" în același segment (până la virgulă) e familia lui și nu se mai citește ca nume. Un titlu scris întreg imediat după un nume („Vasile preotul") e al acelui nume; scris prescurtat sau după „și" („Ion și preoteasa Maria", „Ion Pr. Vasile") e al numelui care urmează. O persoană cu titlu se ia singură (nu se lipește cu cratimă de vecin). Sedila (ş, ţ) și ǎ se citesc ca ș, ț, ă. Numerotarea rândului („3. Ion") se ignoră. Cuvinte de rudenie care sunt și prenume rare (nora, tanti) sunt nume doar dacă pe rând nu mai e alt nume.
11. **Cheia API pe telefon (7.11.2026):** în ⚙ Setări, „Pune cheia și pe telefon" arată un cod QR cu `https://almeueste777-ops.github.io/pray-names/#cheie=…&furnizor=gemini`; telefonul îl scanează, aplicația își ia cheia în setări și șterge `#…` din adresă. Cheia NU e niciodată în depozitul public (oricine ar fi putut-o folosi) și nu pleacă pe net: partea de după `#` nu ajunge la server.

## 5. Verificarea (pasul 2)

Fiecare pagină: poza (clic = mărire) în stânga; în dreapta: data (căsuță editabilă, cu „albastru: «15 nov»" și eventual „alt pix: … (nu se pune singură)"), apoi fiecare secțiune cu: select Vii / ✝ Adormiți, bifă „cu toată casa lor", lista numelor editabile (numele nesigure sau corectate sunt pe fundal galben, cu textul original alături), bifă „ctna" pe fiecare nume, ✕ ștergere, „+ nume", „+ secțiune". „Altceva pe foaie (nu se tipărește)" arată observațiile modelului. Buton „Pune data la toate" pentru paginile fără dată.

## 6. Foaia de tipar (pasul 3) — formatul exact

Coală **A4, margini 0, o singură față**, împărțită în celule egale. **Cartonașele sunt întotdeauna PORTRET** (mai înalte decât late):
- **4 pe coală:** A4 **portret**, 2 coloane × 2 rânduri, celule **105 × 148,25 mm** (A6); maximum 24 de nume pe pomelnic; peste **10 nume → două coloane**.
- **6 pe coală:** A4 **peisaj** (297 × 210), 3 × 2, celule **99 × 105 mm**; max 16 nume; peste 8 → două coloane.
- **8 pe coală:** A4 **peisaj**, 4 × 2, celule **74,25 × 105 mm** (A7 portret); max 12 nume; peste 6 → două coloane.
- **6 înguste:** A4 portret, 3 × 2, celule **70 × 148,5 mm**; max 16 nume; peste 8 → două coloane.
Orientarea paginii de tipar (`@page { size: A4 portrait|landscape }`) se schimbă odată cu așezarea. Un nume nu se rupe niciodată pe două rânduri (`white-space: nowrap`): litera scade până încape.
Dacă un pomelnic are mai multe nume decât maximul, se continuă pe foi marcate „(continuare)", împărțite echilibrat (49 → 17 + 16 + 16).

**Linii de tăiere** între celule: punctate, 0,4 mm, gri (#9a9a9a), opționale.

**Banda imprimantei (4.11.2026, obligatoriu):** imprimanta ei (HP LaserJet 400 M401dne) NU tipărește **4,23 mm** pe fiecare latură a colii (spus de imprimantă prin IPP: `media-*-margin-supported = 423`); driverul Windows „IPP Class" raportează fals 0 mm. De aceea rama și tot conținutul fiecărui cartonaș se desenează pe un **cartonaș interior retras 2,5 mm pe toate laturile** (`SIGUR` în foaie.js = `--sigur` în style.css), la fel pe toate cartonașele, ca după tăiere să arate identic. Nimic auriu/text nu ajunge mai aproape de 5,5 mm de marginea colii; doar liniile gri de tăiere merg până la margine. Fiecare coală începe pe pagina ei: `break-after: page` stă pe învelișul colii (`.coala-inv`), nu pe `.a4` (altfel colile de 296,5 mm curg și urcă 0,5 mm pe pagină). Bara de derulare a paginii nu are voie să intre în tipar (`html, body { overflow: visible }` la print). Probă: `node test/tipar.mjs` → PDF, `python test/zona-moarta.py` pune banda moartă cu roșu.

**Chenarul = o ramă pe marginea cartonașului interior, interiorul rămâne curat.** SVG în milimetri, viewBox = dimensiunea celulei minus 2 × 2,5 mm:
- două linii paralele la **4 mm** și **6,2 mm** de marginea cartonașului interior (adică 6,5 mm și 8,7 mm de linia de tăiere): exterioară verde‑oliv `#6f8a4f`, grosime 0,5 mm; interioară aurie `#c9a227`, 0,32 mm;
- colțuri rotunjite cu rază 9 mm, în fiecare colț o volută mică (spirală dublă verde + aurie), o frunză și un romb albastru `#1f4e9a`, totul în ≤ 9 mm de margine;
- la mijlocul fiecărei laturi un fleuron lat (romb albastru 7,2 × 2 mm, cu linii aurii și puncte), așezat PE linie, fără să intre în foaie;
- variante: „simplu" (doar cele două linii), „fără"; palete: verde‑auriu (implicit), auriu, albastru, negru.

**Conținutul celulei** (măsurile de mai jos sunt de la marginea cartonașului interior, retras 2,5 mm; padding 9 mm sus, 10 mm lateral, 8 mm jos):
- **Data** într‑o **casetă mică gri foarte deschis** (fundal `#f1f1f1`, contur `#d6d6d6` 0,25 mm, colțuri 1,3 mm, padding 1,4 × 2,4 mm), poziționată **sus‑dreapta** (8,5 mm de sus, 9 mm de dreapta), font fără serife cu **cifre de aceeași lățime** (Atkinson Hyperlegible / Inter / system‑ui), 10,5 pt, bold, format `zz.ll.aaaa`.
- **Titlul** („VII" sau „✝ ADORMIȚI") **centrat, ca titlu**: 19 pt, semibold, majuscule, spațiere .16em, cu 6,5 mm spațiu deasupra ca să nu atingă caseta datei (la 6/8 pe coală: 14 pt).
- **Numele:** blocul de nume e **centrat pe foaie**, dar în interiorul blocului **fiecare coloană e aliniată la stânga** (ochiul se întoarce mereu în același loc). Litere mari‑mici (NU majuscule: forma cuvântului se recunoaște dintr‑o privire). Interlinie 1,45 (1,35 pe două coloane). Două coloane umplute de sus în jos, prima ia surplusul, cu o linie verticală subțire între ele (0,3 mm, negru 18%). Mărimea literei: **automată** (cea mai mare dintre 22, 20, 18, 16, 14, 13, 12, 11, 10 pt la care totul încape, măsurând blocul de nume, nu numărând numele) **sau scrisă de mine** în puncte (8–48). Font la alegere, memorat: EB Garamond (implicit), Cormorant Garamond, Lora, Source Serif 4, Noto Serif, Playfair Display, Atkinson Hyperlegible, Inter, Times New Roman, Georgia.
- **Jos, centrat, o singură dată:** „ctna" și/sau „cu toată casa lor" (12 pt, semibold; 10 pt la 6/8 pe coală).
- Nimic altceva pe foaie.

## 6b. Foaia‑calendar de la începutul teancului

Opțiune în pasul 3: „foaie‑calendar la început (luna tipăririi + 2 luni)". Pune PRIMA o coală cu aceeași așezare (4/6/8 cartonașe, același chenar). Fiecare cartonaș arată **exact 3 luni: luna în care se tipărește și următoarele două**, una sub alta, fiecare cu numele lunii și anul („Noiembrie 2026"), capul de tabel L M M J V S D (săptămâna începe luni), zilele numerotate în **celule mari** cu contur gri (5,2 mm înălțime la A6; 3,4–3,6 mm la cartonașele mici), ca să se poată bifa cu pixul; **duminicile cu roșu**. Fontul cifrelor: Atkinson Hyperlegible / Inter, cifre tabelare, 8,5 pt la A6.

## 6c. Viața paginilor încărcate și viteza

- Paginile încărcate **dispar singure după 24 de ore** de la încărcare (câmpul `creat`), împreună cu pozele lor din IndexedDB; verificarea se face la pornire și o dată pe minut; fiecare miniatură arată „dispare în N h".
- Pentru fluiditate la 100 de pagini: în grila din pasul 1 se afișează o **miniatură mică** (320 px înălțime, JPEG 70%, ≈ 15 KB) făcută la încărcare și păstrată separat în IndexedDB; **poza mare** (150 dpi) se aduce din IndexedDB doar când e nevoie (mărire, citire, pasul 2, unde întâi apare miniatura, apoi poza mare). localStorage ține doar textul (fără poze). Imaginile au `loading="lazy"` și `decoding="async"`; cardurile folosesc `content-visibility: auto`.

## 7. Date de probă și rezultate așteptate

Pe cele 9 pomelnice reale de probă: o pagină cu „Ioana‑Andreea" → „Ioana"; „Gheorghe‑Adrian pt. soarta lui" → „Gheorghe"; „Ion cu tot neamul lui cel adormit" și „Victoria cu tot neamul ei cel adormit" → pomelnic ✝ ADORMIȚI cu „Ion", „Victoria" și „ctna" jos; „Marian cu fii" → „Marian" și „cu toată casa lor" jos; o pagină cu Vii și Morții → două pomelnice; „YOAN" → Ioan; 15–16 nume → o singură foaie A6 pe două coloane; o pagină fără dată albastră → data de azi + 7.

## 8. Ce NU vreau

- Niciun text în plus pe foaie (sume, rugăminți, antet).
- Nici o schimbare a regulilor de mai sus fără să mă întrebi.
- Nici un serviciu care cere card bancar; Gemini prin cheie de la AI Studio e gratuit.
- Scanările mele conțin nume reale: nu se publică și nu se pun în depozit.
