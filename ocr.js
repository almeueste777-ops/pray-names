// Citirea unei pagini scanate cu un model cu vedere (Gemini sau Claude), direct din browser.
// Răspunsul e JSON cu structura de mai jos; regulile de tipar se aplică apoi în reguli.js.
(function (root) {
  const PROMPT = `Ești un cititor de pomelnice ortodoxe scrise de mână în limba română. Primești fotografia unei foi.
Transcrie ce e scris, cât mai fidel, și răspunde NUMAI cu JSON de forma:
{
  "sectiuni": [
    {"titlu": "titlul scris deasupra listei (ex. Vii, Adormiți, Morții, Acatist, Sf. Liturghie) sau \\"\\" dacă nu există",
     "categorie": "vii" | "adormiti" | "necunoscut",
     "cruce": true dacă lângă titlu sau înaintea numelor e desenată o cruce (+ sau †), altfel false,
     "linii": [{"text": "un rând de nume exact cum e scris, cu cratime și completări precum 'cu tot neamul lui cel adormit' sau 'cu fii'", "sigur": true|false}]}
  ],
  "data_albastra": "data scrisă cu pix ALBASTRU, de obicei în dreapta sus, exact cum e scrisă (ex. '20 oct', '15 nov', '4.10') sau null",
  "alte_date": ["alte date de pe foaie, cu alt pix"],
  "observatii": "rugăminți (pt. sănătate...), sume (50 lei), orice altceva care nu e nume"
}
Reguli:
- O foaie poate avea mai multe secțiuni (de ex. întâi Vii, apoi Morții). Fiecare listă sub un titlu e o secțiune. Dacă nu e niciun titlu, o singură secțiune cu titlu "".
- categorie: "adormiti" pentru Adormiți/Morți/cruce; "vii" pentru Vii/Acatist/Liturghie sau fără titlu; "necunoscut" doar dacă nu poți hotărî.
- În "linii" pun DOAR rândurile cu nume de persoane, câte un rând scris de mână = un element. Sumele, datele, rugămințile, numele mănăstirii tipărit pe antet NU intră în linii.
- Numele sunt prenume românești (Ioan, Maria, Gheorghe, Elena...). Dacă un nume e greu de citit, scrie varianta cea mai probabilă și pune "sigur": false.
- Păstrează scrierea cu majuscule/minuscule normalizată la Prima-Literă-Mare, cu diacritice românești corecte (ș, ț, ă, â, î).
- Nu inventa nume care nu sunt pe foaie. Nu omite rânduri.`;

  async function gemini(imgBase64, mime, cfg) {
    const model = cfg.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.cheie)}`;
    const body = {
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: imgBase64 } }] }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0 },
    };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return parseJson(text);
  }

  async function claude(imgBase64, mime, cfg) {
    const model = cfg.model || 'claude-sonnet-5-5';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.cheie, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model, max_tokens: 4000, temperature: 0,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: imgBase64 } }, { type: 'text', text: PROMPT }] }],
      }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    return parseJson(j.content?.map(c => c.text || '').join('') || '');
  }

  function parseJson(text) {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error('Modelul nu a răspuns cu JSON: ' + text.slice(0, 200));
    const j = JSON.parse(text.slice(s, e + 1));
    if (!Array.isArray(j.sectiuni)) j.sectiuni = [];
    return j;
  }

  // imgDataUrl: "data:image/jpeg;base64,..."
  async function citestePagina(imgDataUrl, cfg) {
    const [head, data] = imgDataUrl.split(',');
    const mime = head.match(/data:([^;]+)/)[1];
    if (!cfg.cheie) throw new Error('Lipsește cheia API (⚙ Setări).');
    return cfg.furnizor === 'claude' ? claude(data, mime, cfg) : gemini(data, mime, cfg);
  }

  root.OCR = { citestePagina, PROMPT };
})(window);
