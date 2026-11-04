# Pune peste fiecare pagină a PDF-ului de tipar zona pe care imprimanta NU o tipărește (roșu) și scoate PNG-uri.
# HP LaserJet 400 M401dne raportează prin IPP media-*-margin-supported = 423 (4,23 mm) pe toate laturile.
# python -I test/zona-moarta.py <tipar.pdf> <prefix_png> [margine_mm=4.23] [pagini=1,2]
import sys, pymupdf
pdf, prefix = sys.argv[1], sys.argv[2]
m = float(sys.argv[3]) if len(sys.argv) > 3 else 4.23
pag = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else '1,2').split(',')]
d = pymupdf.open(pdf)
print('pagini', d.page_count, '| prima', round(d[0].rect.width / 72 * 25.4, 1), 'x', round(d[0].rect.height / 72 * 25.4, 1), 'mm')
mm = 72 / 25.4
for n in pag:
    if n > d.page_count: continue
    p = d[n - 1]; r = p.rect; k = m * mm
    for z in (pymupdf.Rect(0, 0, r.width, k), pymupdf.Rect(0, r.height - k, r.width, r.height), pymupdf.Rect(0, 0, k, r.height), pymupdf.Rect(r.width - k, 0, r.width, r.height)):
        p.draw_rect(z, color=None, fill=(1, 0, 0), fill_opacity=0.45, overlay=True)
    p.get_pixmap(dpi=110).save(f'{prefix}-{n}.png')
    print('png', f'{prefix}-{n}.png')
