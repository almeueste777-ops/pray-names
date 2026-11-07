// Citirea unei pagini scanate cu un model cu vedere (Gemini sau Claude), direct din browser.
// Răspunsul e JSON cu structura de mai jos; regulile de tipar se aplică apoi în reguli.js.
// Cota zilnică: Google numără cererile pe model și pe zi (reset la miezul nopții în California = ora 10:00 în România).
(function (root) {
  const PROMPT = `Ești un cititor de pomelnice ortodoxe scrise de mână în limba română. Primești fotografia unei foi.
Transcrie ce e scris, cât mai fidel, și răspunde NUMAI cu JSON de forma:
{
  "sectiuni": [
    {"titlu": "titlul scris deasupra listei (ex. Vii, Adormiți, Morții, Acatist, Sf. Liturghie) sau \\"\\" dacă nu există",
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
- Nu inventa nume care nu sunt pe foaie. Nu omite rânduri.`;

  // Cotele gratuite citite din contul ei (AI Studio → Rate Limit, 4.11.2026): cereri pe zi, pe model.
  // Lite: 500/zi și la fel de bun la nume (proba pe 9 pagini), puțin mai slab la data albastră. Flash: 20/zi.
  const MODELE_GEMINI = [
    { id: 'gemini-3.5-flash-lite', nume: 'Gemini 3.5 Flash Lite', peZi: 500, peMinut: 15 },
    { id: 'gemini-3.1-flash-lite', nume: 'Gemini 3.1 Flash Lite', peZi: 500, peMinut: 15 },
    { id: 'gemini-3.5-flash', nume: 'Gemini 3.5 Flash', peZi: null, peMinut: null },   // nu apare în tabelul cotelor; a mers
    { id: 'gemini-3.8-flash', nume: 'Gemini 3.8 Flash', peZi: 20, peMinut: 5 },
    { id: 'gemini-3-flash-preview', nume: 'Gemini 3 Flash', peZi: 20, peMinut: 5 },
  ];
  const CHEIE_CONTOR = 'pray-names-contor';

  // Ziua „Google": data calendaristică din California.
  function ziGoogle() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  function contor() {
    let c; try { c = JSON.parse(localStorage.getItem(CHEIE_CONTOR) || 'null'); } catch {}
    if (!c || c.zi !== ziGoogle()) c = { zi: ziGoogle(), modele: {}, epuizate: {} };
    return c;
  }
  function salveazaContor(c) { try { localStorage.setItem(CHEIE_CONTOR, JSON.stringify(c)); } catch {} }
  function noteaza(model, epuizat) {
    const c = contor(); c.modele[model] = (c.modele[model] || 0) + (epuizat ? 0 : 1); if (epuizat) c.epuizate[model] = true; salveazaContor(c);
  }
  function modeleDeIncercat(cfg) {
    if (cfg.model) { const m = MODELE_GEMINI.find(x => x.id === cfg.model); return [m || { id: cfg.model, nume: cfg.model, peZi: null, peMinut: null }]; }
    return MODELE_GEMINI;
  }
  // Situația cotei pentru modelul care ar fi folosit acum.
  function cota(cfg) {
    const c = contor();
    const lista = modeleDeIncercat(cfg);
    const m = lista.find(x => !c.epuizate[x.id]) || lista[0];
    const folosite = c.modele[m.id] || 0;
    return { model: m.id, nume: m.nume, folosite, peZi: m.peZi, ramase: m.peZi == null ? null : Math.max(0, m.peZi - folosite), epuizat: !!c.epuizate[m.id],
      totalAzi: Object.values(c.modele).reduce((a, b) => a + b, 0), toateEpuizate: lista.every(x => c.epuizate[x.id]), reset: '10:00 (ora României)' };
  }

  const PAUZE_MS = [3000, 8000, 15000];   // reîncercări la 503 / 429-pe-minut
  function eroareHttp(cine, r, text) {
    const e = new Error(`${cine} ${r.status}: ${text.slice(0, 300)}`);
    e.status = r.status;
    e.reincearca = r.status === 429 || r.status === 503 || r.status === 529;
    e.cotaZi = r.status === 429 && /per_day|PerDay|daily|RPD|RequestsPerDay/i.test(text);
    return e;
  }

  async function gemini(imgBase64, mime, cfg) {
    const c = contor();
    const lista = modeleDeIncercat(cfg).filter(m => !c.epuizate[m.id]);
    if (!lista.length) { const e = new Error('Toate modelele Gemini și-au terminat cota pe azi. Se reface la 10:00 (ora României).'); e.cotaZi = true; throw e; }
    let ultima;
    for (const m of lista) {
      for (let i = 0; ; i++) {
        try { const r = await geminiModel(m.id, imgBase64, mime, cfg); noteaza(m.id, false); r._model = m.id; return r; }
        catch (e) {
          ultima = e;
          if (e.cotaZi) { noteaza(m.id, true); break; }                         // cota pe zi a acestui model: treci la următorul
          if (e.status === 404) break;                                          // model retras: următorul
          if (!e.reincearca) throw e;
          if (i >= PAUZE_MS.length) break;                                      // tot supraîncărcat: următorul model
          await new Promise(r => setTimeout(r, PAUZE_MS[i]));
        }
      }
    }
    throw ultima;
  }
  async function geminiModel(model, imgBase64, mime, cfg) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ parts: [{ inlineData: { mimeType: mime, data: imgBase64 } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.cheie }, body: JSON.stringify(body) });
    if (!r.ok) throw eroareHttp('Gemini', r, await r.text());
    const j = await r.json();
    if (j.promptFeedback?.blockReason) throw new Error('Gemini a refuzat poza: ' + j.promptFeedback.blockReason);
    const c = j.candidates?.[0];
    if (!c) throw new Error('Gemini nu a dat niciun răspuns.');
    if (c.finishReason && c.finishReason !== 'STOP') throw new Error('Gemini s-a oprit: ' + c.finishReason);
    return parseJson(c.content?.parts?.map(p => p.text).join('') || '');
  }

  async function claude(imgBase64, mime, cfg) {
    const model = cfg.model || 'claude-sonnet-5-5';
    for (let i = 0; ; i++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.cheie, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model, max_tokens: 6000,
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: imgBase64 } }, { type: 'text', text: PROMPT }] }],
        }),
      });
      if (!r.ok) { const e = eroareHttp('Claude', r, await r.text()); if (e.reincearca && i < PAUZE_MS.length) { await new Promise(res => setTimeout(res, PAUZE_MS[i])); continue; } throw e; }
      const j = await r.json();
      if (j.stop_reason === 'max_tokens') throw new Error('Claude: răspuns tăiat (prea multe nume pe o pagină?).');
      noteaza(model, false);
      return parseJson(j.content?.map(c => c.text || '').join('') || '');
    }
  }

  function parseJson(text) {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error('Modelul nu a răspuns cu JSON: ' + text.slice(0, 200));
    const j = JSON.parse(text.slice(s, e + 1));
    j.sectiuni = Array.isArray(j.sectiuni) ? j.sectiuni.filter(x => x && typeof x === 'object') : [];
    return j;
  }

  // imgDataUrl: "data:image/jpeg;base64,..."
  async function citestePagina(imgDataUrl, cfg) {
    const [head, data] = imgDataUrl.split(',');
    const mime = head.match(/data:([^;]+)/)[1];
    if (!cfg.cheie) throw new Error('Lipsește cheia API (⚙ Setări).');
    return cfg.furnizor === 'claude' ? claude(data, mime, cfg) : gemini(data, mime, cfg);
  }

  root.OCR = { citestePagina, PROMPT, MODELE_GEMINI, cota, contor };
})(window);
