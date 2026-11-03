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
  const IMPLICIT = { font: 'EB Garamond', chenar: 'clasic', marime: 'auto', culoare: 'verde-auriu' };
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

  // Chenar în mm, pe viewBox 0 0 105 148.25. Colțuri cu volute, linie dublă (verde + auriu), fleuroane albastre la mijloc.
  function chenarClasic(p) {
    const W = 105, H = 148.25, m = 5, g = 1.6;   // margine exterioară, distanța dintre cele două linii
    // colț: arc dublu care leagă laturile, o volută (spirală) spre interior, o frunză și un fleuron albastru
    const colt = (x, y, sx, sy) => `
      <g transform="translate(${x} ${y}) scale(${sx} ${sy})">
        <path d="M0 12 C0 5.4 5.4 0 12 0" fill="none" stroke="${p.a}" stroke-width=".45"/>
        <path d="M${g} 12 C${g} 6.3 6.3 ${g} 12 ${g}" fill="none" stroke="${p.b}" stroke-width=".3"/>
        <path d="M12.5 6.5 C8.5 5.5 5.5 7.5 5.5 10.5 C5.5 12.6 7 14 9 14 C10.4 14 11.4 13 11.4 11.7 C11.4 10.8 10.7 10.1 9.8 10.1" fill="none" stroke="${p.a}" stroke-width=".42" stroke-linecap="round"/>
        <path d="M6.5 12.5 C5.5 8.5 7.5 5.5 10.5 5.5 C12.6 5.5 14 7 14 9 C14 10.4 13 11.4 11.7 11.4 C10.8 11.4 10.1 10.7 10.1 9.8" fill="none" stroke="${p.b}" stroke-width=".32" stroke-linecap="round"/>
        <path d="M3.4 8.6 C3.8 5.6 5.6 3.8 8.6 3.4 C7.4 5.2 5.2 7.4 3.4 8.6 Z" fill="${p.a}" opacity=".85"/>
        <path d="M5.3 5.3 l1.5-1.5 l1 1 l-1.5 1.5 z" fill="${p.c}"/>
        <path d="M12 ${g / 2} l1.6-1 l1.6 1 l-1.6 1 z M${g / 2} 12 l-1 1.6 l1 1.6 l1-1.6 z" fill="${p.c}"/>
        <circle cx="16.2" cy="${g / 2}" r=".4" fill="${p.b}"/><circle cx="${g / 2}" cy="16.2" r=".4" fill="${p.b}"/>
      </g>`;
    const fleuron = (x, y, rot) => `
      <g transform="translate(${x} ${y}) rotate(${rot})">
        <path d="M-4 0 L0 -1.6 L4 0 L0 1.6 Z" fill="${p.c}"/>
        <path d="M-7.5 0 h2.8 M4.7 0 h2.8" stroke="${p.b}" stroke-width=".35"/>
        <circle cx="-9" cy="0" r=".4" fill="${p.b}"/><circle cx="9" cy="0" r=".4" fill="${p.b}"/>
        <path d="M-1.6 -3.2 q1.6-1.4 3.2 0 M-1.6 3.2 q1.6 1.4 3.2 0" fill="none" stroke="${p.a}" stroke-width=".35" stroke-linecap="round"/>
      </g>`;
    const x1 = m, y1 = m, x2 = W - m, y2 = H - m, c = 12;
    return `<svg class="chenar" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
      <path d="M${x1 + c} ${y1} H${x2 - c} M${x1 + c} ${y2} H${x2 - c} M${x1} ${y1 + c} V${y2 - c} M${x2} ${y1 + c} V${y2 - c}" stroke="${p.a}" stroke-width=".45" fill="none"/>
      <path d="M${x1 + c} ${y1 + g} H${x2 - c} M${x1 + c} ${y2 - g} H${x2 - c} M${x1 + g} ${y1 + c} V${y2 - c} M${x2 - g} ${y1 + c} V${y2 - c}" stroke="${p.b}" stroke-width=".3" fill="none"/>
      ${colt(x1, y1, 1, 1)}${colt(x2, y1, -1, 1)}${colt(x1, y2, 1, -1)}${colt(x2, y2, -1, -1)}
      ${fleuron(W / 2, y1 + g / 2, 0)}${fleuron(W / 2, y2 - g / 2, 0)}${fleuron(x1 + g / 2, H / 2, 90)}${fleuron(x2 - g / 2, H / 2, 90)}
    </svg>`;
  }
  function chenarSimplu(p) {
    const W = 105, H = 148.25, m = 5;
    return `<svg class="chenar" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
      <rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${p.a}" stroke-width=".5"/>
      <rect x="${m + 1.4}" y="${m + 1.4}" width="${W - 2 * m - 2.8}" height="${H - 2 * m - 2.8}" fill="none" stroke="${p.b}" stroke-width=".3"/>
    </svg>`;
  }
  function chenar(aspect) {
    const p = PALETE[aspect.culoare] || PALETE['verde-auriu'];
    return aspect.chenar === 'fara' ? '' : aspect.chenar === 'simplu' ? chenarSimplu(p) : chenarClasic(p);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Împarte numele pe coloane: ≤ 10 → una; altfel două, umplute de sus în jos (prima coloană ia surplusul).
  function coloane(nume) {
    if (nume.length <= 10) return [nume];
    const n1 = Math.ceil(nume.length / 2);
    return [nume.slice(0, n1), nume.slice(n1)];
  }

  // HTML-ul unei foi A6. f = {categorie, nume[], casa, data, continuare}
  function html(f, aspect) {
    const col = coloane(f.nume);
    const fam = FONTURI.find(x => x.nume === aspect.font) || FONTURI[0];
    return `${chenar(aspect)}
      <div class="foaie" style="font-family:'${fam.nume}', ${fam.fel}">
        <div class="cap">
          <div class="titlu ${f.categorie}">${f.categorie === 'adormiti' ? '✝ Adormiți' : 'Vii'}</div>
          <div class="data">${esc(f.data || '')}</div>
        </div>
        ${f.continuare ? '<div class="cont">(continuare)</div>' : ''}
        <div class="nume col${col.length} m20">${col.map(c => `<ul>${c.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`).join('')}</div>
        ${f.casa ? '<div class="casa">cu toată casa lor</div>' : ''}
      </div>`;
  }

  // Micșorează litera până încape (numele lungi se împachetează, deci măsurăm, nu numărăm). marime='auto' sau pt fix.
  function potriveste(a6, aspect) {
    const n = a6.querySelector('.nume'); if (!n) return;
    const trepte = ['m22', 'm20', 'm18', 'm16', 'm14', 'm13', 'm12', 'm11', 'm10'];
    if (aspect.marime !== 'auto') { n.className = 'nume col' + n.querySelectorAll('ul').length + ' m' + aspect.marime; return; }
    const foaie = a6.querySelector('.foaie');
    for (const m of trepte) {
      n.className = 'nume col' + n.querySelectorAll('ul').length + ' ' + m;
      if (foaie.scrollHeight <= foaie.clientHeight + 1) break;
    }
  }

  root.FOAIE = { FONTURI, CHENARE, PALETE, IMPLICIT, incarcaFont, html, potriveste, coloane };
})(window);
