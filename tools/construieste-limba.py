# Construiește limba-date.js: cuvintele FRECVENTE ale limbii române (ca aplicația să știe ce NU e nume).
# Surse (descărcate pe 8.11.2026):
#   - LOC 5.0 „forme flexionare" (Lista Oficială de Cuvinte a scrabble-ului, dexonline.ro): 679.683 de forme valide ale cuvintelor românești
#   - FrequencyWords ro_full (hermitdave, din subtitrări OpenSubtitles): 1,2 milioane de forme cu numărul de apariții (se păstrează cele cu ≥ PRAG apariții)
# Se păstrează doar INTERSECȚIA (frecvent ȘI cuvânt real românesc) fără numele din nume-date.js: un șir oarecare de litere nimerește ușor
# în toată lista LOC (679k), dar rar în cea frecventă; așa nu se pierd nume rare citite puțin greșit.
# Rulare: python -X utf8 -I tools/construieste-limba.py <dosar-cu-surse> limba-date.js
import sys, re, unicodedata, os

def fd(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

src, out = sys.argv[1], sys.argv[2]
loc = set()
with open(os.path.join(src, 'loc-flexiuni-5.0.txt'), encoding='utf-8') as f:
    for l in f:
        w = l.strip()
        if w: loc.add(unicodedata.normalize('NFC', w.lower()))
PRAG = int(sys.argv[3]) if len(sys.argv) > 3 else 5   # de câte ori trebuie să apară în subtitrări (ro_full), ca să fie „frecvent"
# subtitrările scriu ș/ț cu SEDILĂ (ş, ţ), LOC cu VIRGULĂ (ș, ț): fără normalizare se pierdeau ~14% din cuvinte (ostaşii, cununaţi…); frecvențele celor două grafii se adună
ced = lambda s: s.replace('ş', 'ș').replace('ţ', 'ț')
numar = {}
with open(os.path.join(src, 'ro_full.txt'), encoding='utf-8') as f:
    for l in f:
        p = l.split()
        if len(p) == 2:
            w = ced(unicodedata.normalize('NFC', p[0].lower())); numar[w] = numar.get(w, 0) + int(p[1])
frec = [(w, c) for w, c in numar.items() if c >= PRAG]

# nume din dicționarul de prenume (aplicația le recunoaște oricum înaintea cuvintelor obișnuite)
nume = set()
txt = open(os.path.join(os.path.dirname(os.path.abspath(out)), 'nume-date.js'), encoding='utf-8').read()
for m in re.finditer(r'"([^"]+)"', txt): nume.add(fd(m.group(1)))

alese = set()
for w, c in frec:
    if len(w) < 3 or not re.fullmatch(r'[a-zăâîșțşţ]+', w): continue
    if w not in loc: continue
    k = fd(w)
    if k in nume: continue
    alese.add(k)
alese = sorted(alese)
with open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write('// GENERAT de tools/construieste-limba.py (8.11.2026): cuvinte frecvente românești (LOC 5.0 ∩ ro_50k), fără diacritice, fără prenume.\n')
    f.write('// Folosit de lexic.js: un cuvânt de aici, care nu e prenume din dicționar, NU e nume.\n')
    f.write('const LIMBA_DATE = ' + '"' + ' '.join(alese) + '"' + ';\n')
    f.write("if (typeof window !== 'undefined') window.LIMBA_DATE = LIMBA_DATE;\nif (typeof module !== 'undefined') module.exports = LIMBA_DATE;\n")
print(len(loc), 'forme LOC;', len(frec), 'frecvente;', len(alese), 'păstrate;', os.path.getsize(out), 'octeți')
