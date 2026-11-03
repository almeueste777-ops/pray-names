// Citirea unei pagini scanate cu un model cu vedere (Gemini sau Claude), direct din browser.
// Răspunsul e JSON cu structura de mai jos; regulile de tipar se aplică apoi în reguli.js.
(function (root) {
  const PROMPT = `Ești un cititor de pomelnice ortodoxe scrise de mână în limba română. Primești fotografia unei foi.
Transcrie ce e scris, cât mai fidel, și răspunde NUMAI cu JSON de forma:
{
  "sectiuni": [
    {"titlu": "titlul scris deasupra listei (ex. Vii, Adormiți, Morții, Acatist, Sf. Liturghie) sau \\"\\" dacă nu există",
     "categorie": "vii" | "adormiti" | "necunoscut",
     "cruce": true dacă lângă titlu e desenată o cruce (+ sau †), altfel false,
     "linii": [{"text": "un rând de nume exact cum e scris, cu cratime, titluri (Pr., monahia) și completări precum 'cu tot neamul lui cel adormit' sau 'cu fii'; dacă rândul începe cu o cruce desenată, pune '+ ' în față", "sigur": true|false}]}
  ],
  "data_albastra": "data scrisă cu pix ALBASTRU, de obicei în dreapta sus, exact cum e scrisă (ex. '20 oct', '15 nov', '4.10') sau null dacă nu există nimic scris cu albastru",
  "alte_date": ["alte date de pe foaie, scrise cu alt pix"],
  "observatii": "rugăminți (pt. sănătate...), sume (50 lei), orice altceva care nu e nume"
}
Reguli:
- O foaie poate avea mai multe secțiuni (de ex. întâi Vii, apoi Morții). Fiecare listă sub un titlu e o secțiune. Dacă nu e niciun titlu, o singură secțiune cu titlu "".
- categorie: "adormiti" pentru Adormiți/Morți/cruce; "vii" pentru Vii/Acatist/Liturghie sau fără titlu; "necunoscut" doar dacă nu poți hotărî.
- În "linii" pun DOAR rândurile cu nume de persoane, câte un rând scris de mână = un element. Sumele, datele, rugămințile, numele mănăstirii tipărit pe antet NU intră în linii.
- Numele sunt prenume românești (Ioan, Maria, Gheorghe, Elena...). Dacă un nume e greu de citit, scrie varianta cea mai probabilă și pune "sigur": false.
- Scrie numele cu Prima-Literă-Mare și cu diacritice românești corecte (ș, ț, ă, â, î), chiar dacă pe foaie sunt cu majuscule.
- Nu inventa nume care nu sunt pe foaie. Nu omite rânduri.`;

  const PAUZE_MS = [2000, 5000, 12000];   // reîncercări la 429/503 (limita gratuită Gemini)
  async function cuReincercare(fn) {
    for (let i = 0; ; i++) {
      try { return await fn(); }
      catch (e) { if (!e.reincearca || i >= PAUZE_MS.length) throw e; await new Promise(r => setTimeout(r, PAUZE_MS[i])); }
    }
  }
  function eroareHttp(cine, r, text) {
    const e = new Error(`${cine} ${r.status}: ${text.slice(0, 300)}`);
    e.reincearca = r.status === 429 || r.status === 503 || r.status === 529; return e;
  }

  // Google retrage/supraîncarcă modelele des: fără model ales, se încearcă pe rând (3.11.2026: 3.8 și 3.7 dădeau 503, 3.5 mergea).
  const MODELE_GEMINI = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
  async function gemini(imgBase64, mime, cfg) {
    const modele = cfg.model ? [cfg.model] : MODELE_GEMINI;
    let ultima;
    for (const model of modele) {
      try { return await geminiModel(model, imgBase64, mime, cfg); }
      catch (e) { ultima = e; if (!e.reincearca && !/ 404:/.test(e.message)) throw e; }
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
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.cheie, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model, max_tokens: 6000,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: imgBase64 } }, { type: 'text', text: PROMPT }] }],
      }),
    });
    if (!r.ok) throw eroareHttp('Claude', r, await r.text());
    const j = await r.json();
    if (j.stop_reason === 'max_tokens') throw new Error('Claude: răspuns tăiat (prea multe nume pe o pagină?).');
    return parseJson(j.content?.map(c => c.text || '').join('') || '');
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
    return cuReincercare(() => cfg.furnizor === 'claude' ? claude(data, mime, cfg) : gemini(data, mime, cfg));
  }

  root.OCR = { citestePagina, PROMPT };
})(window);
