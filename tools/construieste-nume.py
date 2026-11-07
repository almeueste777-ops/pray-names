"""Construiește nume-date.js (dicționarul mare de prenume românești cu sex) din sursele luate de pe net.

Rulare:  python -I tools/construieste-nume.py <dosar-cu-sursele> nume-date.js
Dosarul cu surse (descărcate, vezi SURSE-NUME.md) conține:
  wiki-F.txt, wiki-M.txt      – ro.wikipedia.org „Listă de prenume românești" (CC BY-SA)
  wikt-Romanian_female_given_names.txt, wikt-Romanian_male_given_names.txt – en.wiktionary (CC BY-SA)
  roF.csv, roM.csv            – genderComputer (tue-mdse), din Wikipedia + childnamesworld
  dgep.json                   – dgep.mai.gov.ro: prenumele purtate de români la sărbători, cu numărul de persoane
  wd-ro-lang.json             – Wikidata (CC0): prenume cu limba numelui = română
  nam_dict.txt                – dicționarul Heise c't (coloana România), licență GFDL
  vechi.txt                   – lista veche din nume.js (hotărârile ei), format „m Nume" / „f Nume"
Ieșire: nume-date.js cu {m:[...], f:[...], u:[...]} (u = sex nesigur: surse care se contrazic).
"""
import json, re, sys, os, collections

D = sys.argv[1]
OUT = sys.argv[2]

def cur(s):  # cedilă -> virgulă dedesubt, ã -> ă
    return (s.replace('ş', 'ș').replace('Ş', 'Ș').replace('ţ', 'ț').replace('Ţ', 'Ț').replace('ã', 'ă').replace('Ã', 'Ă'))

RO_OK = re.compile(r"^[A-Za-zĂÂÎȘȚăâîșț\-]{2,24}$")

def norm(n):
    n = cur(n.strip())
    if not RO_OK.match(n) or '-' in n:   # nume cu cratimă (Ana-Maria, George-Andrei) NU intră: sunt două nume, le tratează regulile
        return None
    return '-'.join(p[:1].upper() + p[1:].lower() if not p.isupper() or len(p) == 1 else p[:1] + p[1:].lower() for p in n.split('-'))

def fara(s):
    import unicodedata
    return unicodedata.normalize('NFD', cur(s)).encode('ascii', 'ignore').decode().lower()

voturi = collections.defaultdict(lambda: {'m': 0.0, 'f': 0.0})
forma = {}          # cheie fără diacritice -> forma cu diacritice preferată
surse_de = collections.defaultdict(set)

def adauga(nume, sex, sursa, pondere=1.0):
    n = norm(nume)
    if not n or sex not in ('m', 'f'):
        return
    voturi[n][sex] += pondere   # cheia = grafia exactă: Florica (f) și Florică (m) sunt nume diferite
    surse_de[n].add(sursa)

def linii(fisier):
    p = os.path.join(D, fisier)
    return [l.strip() for l in open(p, encoding='utf-8') if l.strip()] if os.path.exists(p) else []

for n in linii('wiki-F.txt'): adauga(n, 'f', 'wiki')
for n in linii('wiki-M.txt'): adauga(n, 'm', 'wiki')
for n in linii('wikt-Romanian_female_given_names.txt'): adauga(n, 'f', 'wikt')
for n in linii('wikt-Romanian_male_given_names.txt'): adauga(n, 'm', 'wikt')
for n in linii('roF.csv'): adauga(n.lstrip('﻿'), 'f', 'gc')
for n in linii('roM.csv'): adauga(n.lstrip('﻿'), 'm', 'gc')
for l in linii('vechi.txt'):
    sex, n = l.split(None, 1); adauga(n, sex, 'vechi', 2.0)   # hotărârile ei contează dublu

wdp = os.path.join(D, 'wd-ro-lang.json')   # Wikidata: prenume cu „limba numelui = română" (SPARQL, vezi SURSE-NUME.md)
if os.path.exists(wdp):
    for b in json.load(open(wdp, encoding='utf-8'))['results']['bindings']:
        g = b['g']['value'].rsplit('/', 1)[-1]
        adauga(b['l']['value'], {'Q12308941': 'm', 'Q11879590': 'f'}.get(g), 'wikidata')

dg = json.load(open(os.path.join(D, 'dgep.json'), encoding='utf-8')) if os.path.exists(os.path.join(D, 'dgep.json')) else {'f': {}, 'm': {}}
for sex in ('f', 'm'):
    for n, c in dg[sex].items():
        adauga(n, sex, 'dgep', 1.0 + min(2.0, c / 50000))   # un nume purtat de zeci de mii cântărește mai mult

# Heise: coloana 27 = România. Păstrăm doar grafii românești (fără ă/ö/é… ungurești, polone) și frecvență ≥ 3 (sau confirmat de altă sursă).
FREQ = {c: i + 1 for i, c in enumerate('123456789ABCD')}
heise = []
for line in open(os.path.join(D, 'nam_dict.txt'), encoding='latin-1'):
    if line.startswith('#') or len(line) < 40:
        continue
    g = line[0:3].strip(); nume = line[3:29].strip(); fr = line[30:].rstrip('\n$')
    if len(fr) > 27 and fr[27] != ' ' and ' ' not in nume:
        sex = {'M': 'm', '1M': 'm', '?M': 'm', 'F': 'f', '1F': 'f', '?F': 'f'}.get(g)
        if sex and nume.isascii():
            heise.append((nume, sex, FREQ.get(fr[27], 0)))
for nume, sex, f in heise:
    if f >= 3 or any(fara(x) == fara(nume) for x in voturi):
        adauga(nume, sex, 'heise', 0.5)

# Variantele fără diacritice se îmbină într-o variantă cu diacritice (Ionut → Ionuț) DOAR dacă au același sex.
grupuri = collections.defaultdict(list)
for n in voturi:
    grupuri[fara(n)].append(n)
def sex_dominant(n):
    return 'm' if voturi[n]['m'] >= voturi[n]['f'] else 'f'
for vs in grupuri.values():
    cu = [x for x in vs if any(ord(c) > 127 for c in x)]
    for p in [x for x in vs if x not in cu]:
        tinta = next((c for c in cu if sex_dominant(c) == sex_dominant(p)), None)
        if tinta:
            voturi[tinta]['m'] += voturi[p]['m']; voturi[tinta]['f'] += voturi[p]['f']; del voturi[p]

# Suprascrieri manuale (grafia exactă): nume unde sursele se bat cap în cap, hotărâte după uzul din România.
MANUAL = {'Marian': 'm', 'Andrea': 'f', 'Daria': 'f', 'Alexis': 'm', 'Iris': 'f', 'Alex': 'm', 'Mihai': 'm', 'Nicola': 'm', 'Sasha': 'u',
          'Jean': 'm', 'Ilie': 'm', 'Luca': 'm', 'Toma': 'm', 'Sava': 'm', 'Costea': 'm', 'Barbu': 'm', 'Mircea': 'm', 'Petra': 'f',
          'Florica': 'f', 'Florică': 'm', 'Costica': 'f', 'Costică': 'm', 'Vasilica': 'f', 'Vasilică': 'm'}

# Grafii care NU sunt prenume românești, ci greșeli de citire ale modelului (Joana → Ioana, Joan → Ioan): rămân în afara dicționarului.
EXCLUSE = {'joana', 'joan', 'yoan', 'yoana'}
for k in [n for n in voturi if fara(n) in EXCLUSE]:
    del voturi[k]

m, f, u = [], [], []
conflicte = []
for k, v in voturi.items():
    sex = MANUAL.get(k)
    if sex is None:
        if v['m'] and v['f']:
            hi, lo = (('m', 'f') if v['m'] >= v['f'] else ('f', 'm'))
            sex = hi if v[hi] >= 2 * v[lo] else 'u'
            conflicte.append((k, v['m'], v['f'], sex))
        else:
            sex = 'm' if v['m'] else 'f'
    (m if sex == 'm' else f if sex == 'f' else u).append(k)

m.sort(key=fara); f.sort(key=fara); u.sort(key=fara)
with open(OUT, 'w', encoding='utf-8', newline='\n') as o:
    o.write('// Dicționar mare de prenume românești (generat de tools/construieste-nume.py; surse în SURSE-NUME.md). NU se editează de mână.\n')
    o.write('// m = masculin, f = feminin, u = sex nesigur (sursele se contrazic) – la „două nume pe rând” un nume u nu hotărăște singur.\n')
    o.write('const NUME_DATE = ' + json.dumps({'m': m, 'f': f, 'u': u}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    o.write("if (typeof module !== 'undefined') module.exports = NUME_DATE;\nif (typeof window !== 'undefined') window.NUME_DATE = NUME_DATE;\n")
sys.stderr.write(f'masculine {len(m)}  feminine {len(f)}  nesigure {len(u)}  total {len(m)+len(f)+len(u)}\n')
sys.stderr.write('conflicte: ' + ', '.join(f'{n}({a:g}/{b:g}→{s})' for n, a, b, s in sorted(conflicte)) + '\n')
