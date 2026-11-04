// Expresie pentru test/tipar.mjs: întoarce, după ce colile sunt gata, cât de aproape (mm) de marginea colii ajunge
// orice desen (rama SVG, data, titlul, numele). Imprimanta ei (HP M401dne) nu tipărește sub 4,23 mm.
(() => {
  const coli = document.querySelectorAll('#foi .a4'); if (coli.length < 2 || document.fonts.status !== 'loaded') return '';
  const px = 96 / 25.4; let min = 1e9, unde = '';
  for (const a4 of [coli[0], coli[1]]) {
    const R = a4.getBoundingClientRect();
    for (const el of a4.querySelectorAll('.chenar path, .chenar rect, .chenar circle, .data, .titlu, .nume li, .jos, .luna-nume, .luna td')) {
      const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
      const d = Math.min(r.left - R.left, r.top - R.top, R.right - r.right, R.bottom - r.bottom) / px;
      if (d < min) { min = d; unde = el.tagName + '.' + (el.getAttribute('class') || el.parentElement.className.baseVal || el.parentElement.className); }
    }
  }
  return JSON.stringify({ coli: coli.length, minMm: +min.toFixed(2), unde });
})()
