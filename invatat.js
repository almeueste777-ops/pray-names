// Memoria de corecturi: aplicația învață din ce corectezi tu la pasul 2 și aplică singură data viitoare.
//  - corectii: „cum a ieșit citit" (fără diacritice, litere mici) → „cum l-ai scris tu"
//  - Funcții pure (se testează în Node); stocarea în localStorage o face app.js.
//  Se aplică DOAR rândurilor galbene (nesigure sau corectate de dicționar): un nume sigur nu se atinge niciodată.
(function (rad, factory) {
  if (typeof module !== 'undefined') module.exports = factory(); else rad.INVATAT = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const MAX = 3000;
  const fd = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[șş]/gi, 's').replace(/[țţ]/gi, 't').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const gol = () => ({ corectii: {} });
  // memorie stricată în localStorage: se păstrează doar perechi șir→șir (și nimic moștenit, ex. „constructor")
  const normeaza = m => {
    if (!(m && typeof m === 'object' && m.corectii && typeof m.corectii === 'object' && !Array.isArray(m.corectii))) return gol();
    const curat = {};
    for (const k of Object.keys(m.corectii)) if (typeof m.corectii[k] === 'string' && m.corectii[k]) curat[k] = m.corectii[k];
    m.corectii = curat; if (m.nume !== undefined && !Array.isArray(m.nume)) m.nume = []; return m;
  };

  // Ce a citit aplicația pe rând: textul original al modelului, iar dacă lipsește, valoarea de dinainte de corectură.
  function invata(mem, citit, corect) {
    mem = normeaza(mem);
    const k = fd(citit), v = String(corect == null ? '' : corect).trim();
    if (!k || !v) return mem;
    delete mem.corectii[k]; mem.corectii[k] = v;   // și „confirmat ca atare" se ține minte; delete+set = trece la coada listei (cele mai vechi pleacă primele)
    const chei = Object.keys(mem.corectii);
    if (chei.length > MAX) for (const x of chei.slice(0, chei.length - MAX)) delete mem.corectii[x];   // cele mai vechi pleacă primele
    return mem;
  }
  function uita(mem, citit) { mem = normeaza(mem); delete mem.corectii[fd(citit)]; return mem; }

  // Aplică memoria pe secțiuni (rezultatul lui proceseazaSectiuni). Întoarce câte rânduri a rezolvat.
  function aplica(mem, sectiuni) {
    mem = normeaza(mem); let n = 0;
    for (const s of sectiuni || []) for (const r of (s && s.nume) || []) {
      if (!r || (r.sigur && !r.corectat)) continue;
      // cheia = ce a CITIT modelul. Fără rezervă pe numele corectat de dicționar: altă greșeală de citire care ajunge la același nume nu primește corectura aceasta.
      const k = fd(r.original || r.nume), v = Object.prototype.hasOwnProperty.call(mem.corectii, k) ? mem.corectii[k] : null;   // fără chei moștenite („constructor")
      if (!v || typeof v !== 'string') continue;
      r.invatatDin = r.original || r.nume;   // cheia sub care s-a învățat, ca o corectură ulterioară pe acest rând să o poată înlocui
      r.nume = v; r.sigur = true; r.corectat = false; r.invatat = true; delete r.sugestii; n++;
    }
    return n;
  }
  const numara = mem => Object.keys(normeaza(mem).corectii).length;
  // Cuvinte pe care ea le-a declarat NUME (restaurate din „Scos din listă"): aplicația nu le mai scoate ca „cuvânt obișnuit".
  function declaraNume(mem, cuvant) {
    mem = normeaza(mem); if (!Array.isArray(mem.nume)) mem.nume = [];
    const k = String(cuvant == null ? '' : cuvant).trim(); if (k && !mem.nume.some(x => fd(x) === fd(k))) mem.nume.push(k);
    if (mem.nume.length > MAX) mem.nume.splice(0, mem.nume.length - MAX);
    return mem;
  }
  const listaNume = mem => (mem && Array.isArray(mem.nume) ? mem.nume.filter(x => typeof x === 'string' && x) : []);
  return { fd, gol, invata, uita, aplica, numara, declaraNume, listaNume };
});
