// Foaia A6 de tipar: chenar artistic (SVG), titlu, data sus-dreapta, numele pe 1 sau 2 coloane, font la alegere.
// Principii de citire rapidă (ochiul): litere mari-mici (forma cuvântului se recunoaște dintr-o privire, nu MAJUSCULE),
// margine stângă dreaptă pentru fiecare coloană (ochiul se întoarce mereu în același loc), interlinie 1,4–1,5,
// coloane înguste (≤ 12 nume pe coloană), literă mare cât încape, contrast maxim, nimic altceva pe foaie.
(function (root) {
  const FONTURI = [
    { nume: 'EB Garamond', google: 'EB+Garamond:wght@500;600', fel: 'serif' },
    { nume: 'Cormorant Garamond', google: 'Cormorant+Garamond:wght@600;700', fel: 'serif' },
    { nume: 'Lora', google: 'Lora:wght@500;600', fel: 'serif' },
    { nume: 'Source Serif 4', google: 'Source+Serif+4:wght@500;600', fel: 'serif' },
    { nume: 'Noto Serif', google: 'Noto+Serif:wght@500;600', fel: 'serif' },
    { nume: 'Playfair Display', google: 'Playfair+Display:wght@500;600', fel: 'serif' },
    { nume: 'Atkinson Hyperlegible', google: 'Atkinson+Hyperlegible:wght@400;700', fel: 'sans-serif' },
    { nume: 'Inter', google: 'Inter:wght@500;600', fel: 'sans-serif' },
    { nume: 'Times New Roman', google: null, fel: 'serif' },
    { nume: 'Georgia', google: null, fel: 'serif' },
  ];
  const CHENARE = ['clasic', 'simplu', 'fara'];
  const IMPLICIT = { font: 'EB Garamond', chenar: 'clasic', marime: 'auto', culoare: 'verde-auriu', peCoala: 4 };
  // Așezarea pe coala A4. Cartonașele sunt mereu PORTRET (mai înalte decât late) — hotărârea ei 4.11.2026:
  //  4  = A4 portret, 2×2, 105 × 148,25 mm (A6)
  //  6  = A4 peisaj, 3×2, 99 × 105 mm
  //  8  = A4 peisaj, 4×2, 74,25 × 105 mm (A7)
  //  6i = A4 portret, 3×2, 70 × 148,5 mm (înguste)
  const ASEZARI = {
    '4':  { coala: 'portrait', coloane: 2, randuri: 2, W: 105, H: 148.25, maxNume: 24, pragColoane: 10, calCol: 3 },
    '6':  { coala: 'landscape', coloane: 3, randuri: 2, W: 99, H: 105, maxNume: 16, pragColoane: 8, calCol: 4 },
    '8':  { coala: 'landscape', coloane: 4, randuri: 2, W: 74.25, H: 105, maxNume: 12, pragColoane: 6, calCol: 3 },
    '6i': { coala: 'portrait', coloane: 3, randuri: 2, W: 70, H: 148.5, maxNume: 16, pragColoane: 8, calCol: 2 },
  };
  function asezare(aspect) { return ASEZARI[String(aspect && aspect.peCoala)] || ASEZARI['4']; }
  const PALETE = {
    'verde-auriu': { a: '#6f8a4f', b: '#c9a227', c: '#1f4e9a' },
    'auriu': { a: '#b8962e', b: '#d9bd5c', c: '#8a6d1c' },
    'albastru': { a: '#2b4a8c', b: '#8aa4d6', c: '#c9a227' },
    'negru': { a: '#222', b: '#777', c: '#222' },
  };

  function incarcaFont(nume) {
    const f = FONTURI.find(x => x.nume === nume);
    if (!f || !f.google || document.getElementById('font-' + f.google)) return;
    const l = document.createElement('link'); l.id = 'font-' + f.google; l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
    document.head.appendChild(l);
  }

  // Chenar în mm, pe viewBox 0 0 105 148.25. E o RAMĂ pe marginea foii (hotărârea ei 4.11): ornamentele stau pe bandă
  // (între cele două linii, 4–8 mm de la margine), interiorul rămâne curat pentru nume.
  function chenarClasic(p, W, H) {
    const m = 4, g = 2.2;   // margine exterioară, lățimea benzii dintre linii
    const x1 = m, y1 = m, x2 = W - m, y2 = H - m, c = 9;   // c = raza colțului
    // colț: arc dublu + volută mică ce stă în banda colțului + frunză + diamant albastru, totul în ≤ 9 mm de margine
    const colt = (x, y, sx, sy) => `
      <g transform="translate(${x} ${y}) scale(${sx} ${sy})">
        <path d="M0 ${c} A${c} ${c} 0 0 1 ${c} 0" fill="none" stroke="${p.a}" stroke-width=".5"/>
        <path d="M${g} ${c} A${c - g} ${c - g} 0 0 1 ${c} ${g}" fill="none" stroke="${p.b}" stroke-width=".32"/>
        <path d="M8.2 2.6 C5.2 2.2 2.4 4.6 2.6 7.6 C2.7 9.2 3.9 10.2 5.2 10.1 C6.3 10 7 9.2 6.9 8.2 C6.8 7.5 6.2 7 5.6 7.1" fill="none" stroke="${p.a}" stroke-width=".42" stroke-linecap="round"/>
        <path d="M2.6 8.2 C2.2 5.2 4.6 2.4 7.6 2.6 C9.2 2.7 10.2 3.9 10.1 5.2 C10 6.3 9.2 7 8.2 6.9 C7.5 6.8 7 6.2 7.1 5.6" fill="none" stroke="${p.b}" stroke-width=".32" stroke-linecap="round"/>
        <path d="M4.1 4.1 l1.3-1.3 l1 1 l-1.3 1.3 z" fill="${p.c}"/>
        <path d="M${c + 2} ${g / 2} l1.4-.9 l1.4.9 l-1.4.9 z M${g / 2} ${c + 2} l-.9 1.4 l.9 1.4 l.9-1.4 z" fill="${p.c}"/>
        <circle cx="${c + 5.6}" cy="${g / 2}" r=".38" fill="${p.b}"/><circle cx="${g / 2}" cy="${c + 5.6}" r=".38" fill="${p.b}"/>
      </g>`;
    // fleuron la mijlocul laturii: stă pe bandă, lat, nu intră în foaie
    const fleuron = (x, y, rot) => `
      <g transform="translate(${x} ${y}) rotate(${rot})">
        <path d="M-3.6 0 L0 -1 L3.6 0 L0 1 Z" fill="${p.c}"/>
        <path d="M-9 0 h4.4 M4.6 0 h4.4" stroke="${p.b}" stroke-width=".35"/>
        <circle cx="-10.3" cy="0" r=".38" fill="${p.b}"/><circle cx="10.3" cy="0" r=".38" fill="${p.b}"/>
        <path d="M-6.5 -.9 q2 -.5 4 0 M-6.5 .9 q2 .5 4 0 M2.5 -.9 q2 -.5 4 0 M2.5 .9 q2 .5 4 0" fill="none" stroke="${p.a}" stroke-width=".3" stroke-linecap="round"/>
      </g>`;
    return `<svg class="chenar" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
      <path d="M${x1 + c} ${y1} H${x2 - c} M${x1 + c} ${y2} H${x2 - c} M${x1} ${y1 + c} V${y2 - c} M${x2} ${y1 + c} V${y2 - c}" stroke="${p.a}" stroke-width=".5" fill="none"/>
      <path d="M${x1 + c} ${y1 + g} H${x2 - c} M${x1 + c} ${y2 - g} H${x2 - c} M${x1 + g} ${y1 + c} V${y2 - c} M${x2 - g} ${y1 + c} V${y2 - c}" stroke="${p.b}" stroke-width=".32" fill="none"/>
      ${colt(x1, y1, 1, 1)}${colt(x2, y1, -1, 1)}${colt(x1, y2, 1, -1)}${colt(x2, y2, -1, -1)}
      ${fleuron(W / 2, y1 + g / 2, 0)}${fleuron(W / 2, y2 - g / 2, 0)}${fleuron(x1 + g / 2, H / 2, 90)}${fleuron(x2 - g / 2, H / 2, 90)}
    </svg>`;
  }
  function chenarSimplu(p, W, H) {
    const m = 4;
    return `<svg class="chenar" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
      <rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${p.a}" stroke-width=".5"/>
      <rect x="${m + 1.4}" y="${m + 1.4}" width="${W - 2 * m - 2.8}" height="${H - 2 * m - 2.8}" fill="none" stroke="${p.b}" stroke-width=".3"/>
    </svg>`;
  }
  function chenar(aspect) {
    const p = PALETE[aspect.culoare] || PALETE['verde-auriu'], a = asezare(aspect);
    return aspect.chenar === 'fara' ? '' : aspect.chenar === 'simplu' ? chenarSimplu(p, a.W, a.H) : chenarClasic(p, a.W, a.H);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Împarte numele pe coloane: ≤ 10 → una; altfel două, umplute de sus în jos (prima coloană ia surplusul).
  function coloane(nume, prag) {
    if (nume.length <= (prag || 10)) return [nume];
    const n1 = Math.ceil(nume.length / 2);
    return [nume.slice(0, n1), nume.slice(n1)];
  }

  // HTML-ul unei foi A6. f = {categorie, nume[], casa, data, continuare}
  function html(f, aspect) {
    const col = coloane(f.nume, asezare(aspect).pragColoane);
    const fam = FONTURI.find(x => x.nume === aspect.font) || FONTURI[0];
    const jos = [f.ctna ? 'ctna' : '', f.casa ? 'cu toată casa lor' : ''].filter(Boolean);
    return `${chenar(aspect)}
      <div class="foaie" style="font-family:'${fam.nume}', ${fam.fel}">
        ${f.data ? `<div class="data">${esc(f.data)}</div>` : ''}
        <div class="titlu ${f.categorie}">${f.categorie === 'adormiti' ? '✝ Adormiți' : 'Vii'}</div>
        ${f.continuare ? '<div class="cont">(continuare)</div>' : ''}
        <div class="nume col${col.length} m20">${col.map(c => `<ul>${c.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`).join('')}</div>
        ${jos.length ? `<div class="jos">${jos.map(esc).join(' · ')}</div>` : ''}
      </div>`;
  }

  // Micșorează litera până încape (numele lungi se împachetează, deci măsurăm, nu numărăm). marime='auto' sau pt fix.
  function potriveste(a6, aspect) {
    const n = a6.querySelector('.nume'); if (!n) return;
    const trepte = ['m22', 'm20', 'm18', 'm16', 'm14', 'm13', 'm12', 'm11', 'm10'];
    if (aspect.marime !== 'auto') { n.className = 'nume col' + n.querySelectorAll('ul').length; n.style.fontSize = (+aspect.marime || 16) + 'pt'; return; }
    n.style.fontSize = '';
    const foaie = a6.querySelector('.foaie');
    // .nume e flex:1 cu min-height:0, deci foaia nu „crește"; trebuie măsurat și blocul de nume
    const incape = () => n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1 && foaie.scrollHeight <= foaie.clientHeight + 1;
    for (const m of trepte) {
      n.className = 'nume col' + n.querySelectorAll('ul').length + ' ' + m;
      if (incape()) break;
    }
  }

  // Foaia-calendar de la începutul teancului (hotărârea ei 4.11.2026): DOAR 3 luni — luna tipăririi și următoarele două,
  // una sub alta, cu celule mari, ca să se poată bifa cu pixul. Zilele numerotate, duminicile marcate.
  const LUNI_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  function calendarHtml(azi, aspect) {
    azi = azi || new Date();
    const fam = FONTURI.find(x => x.nume === aspect.font) || FONTURI[0];
    const luni = [0, 1, 2].map(k => {
      const d = new Date(azi.getFullYear(), azi.getMonth() + k, 1), an = d.getFullYear(), m = d.getMonth();
      const prima = (d.getDay() + 6) % 7;   // 0 = luni
      const zile = new Date(an, m + 1, 0).getDate();
      const celule = [];
      for (let i = 0; i < prima; i++) celule.push('<td></td>');
      for (let z = 1; z <= zile; z++) { const dum = (prima + z - 1) % 7 === 6; celule.push(`<td${dum ? ' class="dum"' : ''}>${z}</td>`); }
      while (celule.length % 7) celule.push('<td></td>');
      const randuri = []; for (let i = 0; i < celule.length; i += 7) randuri.push('<tr>' + celule.slice(i, i + 7).join('') + '</tr>');
      return `<div class="luna"><div class="luna-nume">${LUNI_RO[m]} ${an}</div><table><tr class="zs"><th>L</th><th>M</th><th>M</th><th>J</th><th>V</th><th>S</th><th class="dum">D</th></tr>${randuri.join('')}</table></div>`;
    });
    return `${chenar(aspect)}
      <div class="foaie calendar" style="font-family:'${fam.nume}', ${fam.fel}">
        <div class="luni">${luni.join('')}</div>
      </div>`;
  }

  root.FOAIE = { FONTURI, CHENARE, PALETE, IMPLICIT, ASEZARI, asezare, calendarHtml, incarcaFont, html, potriveste, coloane };
})(window);
