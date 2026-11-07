// Ce NU este nume pe un pomelnic: stări, rugăminți, relații, bani, slujbe (hotărârea ei 7.11.2026: „bolnavă", „se roagă" etc.
// trebuie recunoscute ca altceva decât nume). Cuvintele se compară fără diacritice, cu litere mici.
// Mecanismul din reguli.js: un cuvânt din dicționarul de nume rămâne nume (are întâietate); un cuvânt de aici iese din
// numele de pe foaie și se arată la pasul 2 ca „scos"; ce nu e nici una, nici alta rămâne nume NESIGUR (galben).
(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else root.LEXIC = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // Cuvinte întregi.
  const CUVINTE = new Set(`
    se roaga roaga rog roagati rugam rugaciune rugaciuni rugam rugamintea rugaminte pentru pt pe ptr
    bolnav bolnava bolnavi bolnave bolnavului bolnavei bolnavilor boala boli bolii
    prunc pruncii pruncul prunci avortat avortati nebotezat nebotezati nebotezata raposatul raposata cumnatul ginerele socrul varul nenea tataie mamaie bunicuta fetita baiatul nasii
    ctitorii ctitor binefacatorii binefacator eroii eroul grav accidentat accidentata diabetic diabetica covid chimioterapie interventie chirurgicala chirurgical alcoolic betiv
    patima betiei betia drogat drogata divortat divortata handicapat handicapata somera necajit necajita dr dna doctor doctorul prof profesor ing inginer
    militar soldat armata inchisoare detinut detinuta italia spania germania anglia franta grecia irlanda concurs concursul examenul afaceri afacerea masina odihna odihnei vesnica
    sufletul sufletele luminarea mintii minte sa nasca usor doamne ajuta flia jr sr junior senior
    nastere usoara invatatura iarta ierte zis lucru liceu noroc bine baba
    patimas patimasa patimasi insarcinata insarcinat gravida eleva elev eleva elevi student studenta studenti somer pensionar pensionara
    singur singura necasatorit necasatorita necununat necununata cel cea cei cele pomenit pomenita duhovnic duhovnicul starets staret staretul
    suferind suferinda suferinzi suferinte suferinta suferintelor
    sanatate sanatos sanatoasa sanatosi vindecare vindecari vindec vindecat
    operat operata operati operatie spital spitalizat spitalizata internat internata cancer tumora handicap invalid nevoias nevoiasi
    ajutor ajutorul ocrotire ocrotit ocrotita ocrotiti ocrotirea protectie mila indurare milostivire
    calatorie calatorii drum drumul plecat plecata plecati pribegie strainatate
    examen examene scoala facultate bac admitere licenta serviciu job munca somaj slujba
    casa casei casnic casatorie casatorit casatorita nunta nunti logodna botez botezul cununie
    familie familia familiei familii neam neamul neamului rude ruda rudelor prieteni prieten prietena vecini vecin
    copil copila copii copiii copilul copilasi bebelus nou nascut nascuta nascuti sarcina
    tanar tanara tineri tinerilor batran batrana batrani vaduv vaduva vaduvi orfan orfana orfani
    lipsa lipsurile nevoi nevoie necazuri necaz necazul greutati greutate probleme problema
    pace pacea intelegere intelegerea liniste linistea impacare impacarea unire unirea dragoste iubire
    spor sporul belsug belsugul izbanda izbavire izbavirea mantuire mantuirea pocainta pocaintei
    iertare iertarea pacate pacatelor pacatele pacat binecuvantare binecuvantari binecuvantat milostenie
    multumire multumiri multumim multumesc recunostinta slava lauda
    mortii morti mort moarta decedat decedata decedati decedate raposat raposata raposati raposate adormit adormita adormiti adormite
    vii viu vie viata vietii pomenire pomenirea pomelnic pomelnice pomenit
    acatist acatiste liturghie liturghii parastas parastase sarindar sarindare molifta moliftelnic slujba slujbe taina maslu
    paraclis utrenie vecernie priveghere priveghi litie sfestanie sfestanii agheasma
    manastire manastirea biserica biserici schit parohia parohie preotul calugar calugari calugarita calugarite
    sf sfant sfanta sfintii sfintele sfintilor sfantul sfintei
    domnului domnul dumnezeu dumnezeului hristos hristosului isus iisus maicii maica fecioara nascatoarea
    lei leu ron euro eur bani banii suma sumele dolari lire donatie donatii taxa total totalul plata platit
    pagina pag nr numar numarul tel telefon str strada bloc ap apartament judet jud sat com oras
    data ziua zi zile luna luni an ani saptamana saptamani azi maine ieri dimineata seara
    amin amin domnului
    domnisoara domn doamna doamnei dnei dl dna d-na d-l dl.
    dar alt alta altul altele alti alte unul una unii unele
    si sau ori iar insa dar daca cand unde cum care ce cine cat cata cati cate
    sa sa-i sa-l sa-si nu nici foarte mai tot toata toti toate
    mare mici mic mica mari frumos frumoasa bun buna buni bune rau rea
    anul anului anii ai a al ale ale
    vrea vrem vrut cer cerem cere cerand dorim doresc dorinta
    fii fiul fiica fiice fiilor fiului fiicei nepot nepoti nepoata nepoate nepotii nepotilor nepotul
    ginere nora soacra socru cumnat cumnata cumnati nasul nasa nasi fin fina fini
    frate frati fratii sora surori sorele mama mame tata tati tatal parinti parintii parintilor parintele
    bunic bunica bunici bunicul bunicii strabunic strabunica
    sot sotie sotul sotia sotii sotiei sotului
    verisor verisoara
    unchi unchiul matusa matusi matusa
    lui ei lor sale sau meu mea mei mele nostru noastra nostri noastre vostri
    cu de din la pe in intru catre fata despre dupa pana prin sub peste fara
  `.split(/\s+/).filter(Boolean));

  // Rădăcini: orice cuvânt care începe cu ele (cu cel puțin 3 litere în plus nu e cerut; cuvântul întreg e verificat mai întâi).
  const RADACINI = ['bolnav', 'suferin', 'sanatos', 'sanatat', 'vindec', 'boala', 'spital', 'operat', 'operati', 'nevoias', 'rugaciun', 'rugamin',
    'binecuvant', 'multumir', 'multumes', 'izbavir', 'mantuir', 'pocaint', 'iertar', 'liturghi', 'parastas', 'sarindar', 'pomenir', 'pomelnic',
    'calatori', 'logodn', 'casator', 'imbolnav', 'neputin', 'neputinci', 'paralizat', 'orb', 'surd', 'mut', 'epilep', 'depresi', 'infarct', 'avc'];
  // Rădăcinile scurte (orb, surd, mut, avc) cer potrivire exactă ca să nu mănânce nume.
  const EXACT_SCURTE = new Set(['orb', 'surd', 'mut', 'avc']);

  // Fraze care încep o rugăminte: de aici până la capăt rândul NU mai conține nume (regula veche, păstrată).
  // (\b din JavaScript nu înțelege ă/â/î/ș/ț: „roagă" n-ar avea margine → folosim marginile cu litere Unicode.)
  const RUG_CUV = /(?<![\p{L}\d])(?:pt\.?|ptr\.?|pentru|se\s+roag[ăa]|rog\s+(?:pe\s+)?dumnezeu|s[ăa]n[ăa]tate|spor|succes|amin)(?![\p{L}\d])/iu;
  const RE_RUGAMINTE = new RegExp(RUG_CUV.source + '.*', 'iu');
  // Luni (după o cifră: „Ion 20 octombrie", „Maria 5 noi"): nu sunt prenume.
  const LUNI = new Set('ian ianuarie feb februarie mar martie apr aprilie mai iun iunie iul iulie aug august sep sept septembrie oct octombrie noi nov noiembrie dec decembrie'.split(' '));
  function esteLuna(cuvant) { return LUNI.has(faraDiacritice(cuvant).replace(/\./g, '')); }
  // Cuvinte de rudenie care sunt și prenume rare (Nora, Tanți): rămân nume doar dacă pe rând nu mai e alt nume.
  const PRIORITARE = new Set('nora tanti nasa nasul fina finul mama tata mos mari'.split(' '));
  function prioritar(cuvant) { return PRIORITARE.has(faraDiacritice(cuvant)); }

  function faraDiacritice(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't').toLowerCase();
  }
  function esteNenume(cuvant) {
    const k = faraDiacritice(cuvant).replace(/[.\-]/g, '');
    if (!k) return false;
    if (CUVINTE.has(k)) return true;
    if (EXACT_SCURTE.has(k)) return true;
    return RADACINI.some(r => r.length >= 4 && k.startsWith(r));
  }
  return { CUVINTE, RADACINI, RUG_CUV, RE_RUGAMINTE, esteNenume, esteLuna, prioritar, faraDiacritice };
});
