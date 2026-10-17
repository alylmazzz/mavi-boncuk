// Derleme: node tools/derle.js [blog-taslak-klasoru]
// 1) api/_lib/kabuk.json: blog sayfalarının ortak başlık/alt bilgi iskeleti (urun.html'den)
// 2) urun/<id>.html ve urunler.html: taranabilir, içeriği HTML'de hazır ürün sayfaları (Product şeması)
// 3) llms.txt ve robots.txt
// 4) Klasör verilirse: blog taslaklarını takvime dizip api/_lib/yazilar.json yazar (günde 1 yazı, 365 gün)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wr = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); };
const SITE = 'https://maviboncukortaca.vercel.app';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const urunHtml = rd('urun.html');
const ver = (urunHtml.match(/\?v=(\w+)/) || [, '1'])[1];
const header = urunHtml.slice(urunHtml.indexOf('<header'), urunHtml.indexOf('</header>') + 9);
const footer = urunHtml.slice(urunHtml.indexOf('<footer'), urunHtml.indexOf('</footer>') + 9);
const headLinks = urunHtml.slice(urunHtml.indexOf('<link rel="icon"'), urunHtml.indexOf('</head>')).split(/\r?\n/).filter((l) => !/rel="canonical"|property="og:|name="robots"/.test(l)).join('\n').trim();
const scripts = `<script src="/assets/js/dil.js?v=${ver}" defer></script>
<script src="/assets/js/site.js?v=${ver}" defer></script>\n<script src="/assets/js/oyun.js?v=${ver}" defer></script>
<script src="/assets/js/ek.js?v=${ver}" defer></script>`;

// ---------- 1) blog iskeleti ----------
wr('api/_lib/kabuk.json', JSON.stringify({ head: headLinks, header, footer, scripts }));

// ---------- 2) statik ürün sayfaları ----------
const { urunler } = JSON.parse(rd('data/urunler.json'));
const TUR = { abiye: 'Abiye', 'takim-elbise': 'Takım elbise', gunluk: 'Günlük takımlar', okul: 'Okul', bebek: 'Bebek', aksesuar: 'Aksesuar' };
const yasYazi = (u) => (u.yas_araligi ? `${u.yas_tahmini ? 'Yaklaşık ' : ''}${u.yas_araligi[0]}-${u.yas_araligi[1]} yaş` : 'Yazın, bakıp söyleyelim');
const wa = (t) => `https://wa.me/905057458364?text=${encodeURIComponent(t)}`;
const sabitSayfa = ({ baslik, aciklama, yol, govde, jsonld, gorsel }) => `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(baslik)}</title>
<meta name="description" content="${esc(aciklama)}">
<link rel="canonical" href="${SITE}${yol}">
<meta property="og:title" content="${esc(baslik)}">
<meta property="og:description" content="${esc(aciklama)}">
<meta property="og:url" content="${SITE}${yol}">
<meta property="og:locale" content="tr_TR">
<meta property="og:image" content="${gorsel || SITE + '/assets/img/site/og.jpg'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fbfbfb">
${headLinks}
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
${header}
${govde}
${footer}
${scripts}
</body>
</html>
`;
const gorunur = urunler.filter((u) => !u.gizle);
for (const u of gorunur) {
  const yol = `/urun/${u.id}`;
  const satir = (k, v) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
  const fiyat = u.fiyat ? `${u.fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : 'Yazın, bakıp söyleyelim';
  const govde = `<a class="back link" href="/#askidakiler">← Bütün ürünler</a>
<main id="urun" data-id="${u.id}"><div class="product">
  <div class="product__media"><div class="product__main"><img src="${u.gorseller[0]}" alt="${esc(u.ad)}" width="1200" height="1500"></div></div>
  <div class="product__info">
    <h1>${esc(u.ad)}</h1>
    <p class="lead">${esc(u.aciklama)}</p>
    <dl class="facts">
      ${satir('Yaş', yasYazi(u))}<div><dt>Tür</dt><dd><a class="link" href="/kategori/${u.kategori}">${TUR[u.kategori] || ''}</a></dd></div>${satir('Fiyat', fiyat)}${satir('Kumaş', u.kumas || 'Yazın, bakıp söyleyelim')}${satir('Teslim', 'Mağazadan alabilir ya da gönderim için yazabilirsiniz')}
    </dl>
    <div class="product__cta"><a class="button" href="${wa(`Merhaba, “${u.ad}” için yazıyorum (${SITE}${yol}). Fiyatı ve bedenleri nedir?`)}">WhatsApp’tan sor</a></div>
  </div>
</div></main>`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Product', name: u.ad, description: u.aciklama,
    image: u.gorseller.map((g) => SITE + g), category: TUR[u.kategori] || 'Çocuk giyim', url: SITE + yol,
    brand: { '@type': 'Brand', name: 'Mavi Boncuk' },
    ...(u.fiyat ? { offers: { '@type': 'Offer', price: u.fiyat, priceCurrency: 'TRY', availability: 'https://schema.org/InStock', url: SITE + yol, seller: { '@type': 'Organization', name: 'Mavi Boncuk Bebe Mağazası' } } } : {})
  };
  const kirinti = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE }, { '@type': 'ListItem', position: 2, name: TUR[u.kategori] || 'Ürünler', item: `${SITE}/kategori/${u.kategori}` }, { '@type': 'ListItem', position: 3, name: u.ad, item: SITE + yol }] };
  wr(`urun/${u.id}.html`, sabitSayfa({ baslik: `${u.ad} · Mavi Boncuk, Ortaca`, aciklama: `${u.aciklama} ${yasYazi(u)}. Ortaca’daki Mavi Boncuk’ta; fiyat ve beden için WhatsApp’tan sorun.`.slice(0, 300), yol, govde, jsonld: [jsonld, kirinti], gorsel: SITE + u.gorseller[0] }));
}
// ürün listesi
const gruplar = Object.entries(TUR).map(([k, ad]) => [ad, gorunur.filter((u) => u.kategori === k)]).filter(([, l]) => l.length);
wr('urunler.html', sabitSayfa({
  baslik: 'Bütün ürünler · Mavi Boncuk, Ortaca çocuk giyim',
  aciklama: 'Mavi Boncuk’taki çocuk abiyeleri, takım elbiseler, günlük takımlar, okul ve bebek ürünleri. Ortaca, Muğla.',
  yol: '/urunler',
  jsonld: { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: gorunur.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/urun/${u.id}`, name: u.ad })) },
  govde: `<main class="legal">
  <h1>Bütün ürünler</h1>
  <p>Mavi Boncuk, Muğla Ortaca’da 0-16 yaş çocuk giyim mağazasıdır. Askıdaki ürünlerin listesi aşağıda; fiyat ve beden için WhatsApp’tan yazabilirsiniz.</p>
  ${gruplar.map(([ad, l]) => `<h2><a class="link" href="/kategori/${Object.keys(TUR).find((k) => TUR[k] === ad)}">${ad}</a></h2><ul>${l.map((u) => `<li><a class="link" href="/urun/${u.id}">${esc(u.ad)}</a>, ${esc(yasYazi(u).toLocaleLowerCase('tr'))}</li>`).join('')}</ul>`).join('\n  ')}
</main>`
}));

// ---------- 2b) kategori sayfaları ----------
const KATEGORILER = [
  {
    id: 'abiye', ad: 'Çocuk abiyeleri', blog: 'ozel-gun',
    baslik: 'Çocuk abiyeleri, mezuniyet ve düğün elbiseleri · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da 3-15 yaş kız çocuk abiyeleri: mezuniyet, düğün, kına ve doğum günü için tül, saten ve pullu modeller. Beden için WhatsApp’tan sorun.',
    giris: ['Mezuniyet, düğün, kına ve doğum günü için 3-15 yaş kız çocuk abiyeleri Ortaca’daki mağazamızda. Tül, saten ve pullu modeller var; uzun etekli ve önü kısa arkası uzun kesimler askıda.', 'Bedenini bilmiyorsanız çocuğunuzun boyunu ve kilosunu yazın, elbiseyi ölçüp hangi bedenin olacağını söyleyelim.'],
    sss: [['Abiyeyi denemeden alabilir miyim?', 'Ortaca dışındaysanız boy ve kilo ölçüsüyle WhatsApp’tan sorun, elbiseyi ölçüp söyleyelim. Ortaca’daysanız mağazaya gelip deneyebilirsiniz.'],
      ['Mezuniyet abiyesine ne zaman bakmalı?', 'Mezuniyetler haziranda olduğu için mayıs başı iyi bir zaman. Bedeni netleştirmeye ve ayakkabıyı denemeye vakit kalır.']]
  },
  {
    id: 'takim-elbise', ad: 'Çocuk takım elbiseleri', blog: 'erkek-cocuk',
    baslik: 'Çocuk takım elbise, sünnet ve düğün kıyafeti · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da 1-14 yaş erkek çocuk takım elbiseleri: smokin, keten ve yelekli üç parça. Sünnet, düğün, nikâh ve mezuniyet için.',
    giris: ['Sünnet, düğün, nikâh ve mezuniyet için 1-14 yaş erkek çocuk takım elbiseleri. Smokin, keten ve yelekli üç parça modeller var, papyonlu olanlar da.', 'Yaz düğünleri için keten takımlar daha hafif durur. Bebekler için mevlit ve nikâha uygun küçük takımlarımız da var.'],
    sss: [['Takım elbiseyi büyük almalı mıyım?', 'Ceketin kolu bileği geçmesin, pantolon paçası ayakkabının üstüne hafifçe değsin. Bir beden büyük ceket fotoğrafta bol görünür; tam bedenini almak daha iyi olur.'],
      ['Sünnet kıyafetine ne zaman bakmalı?', 'Tarih belli olunca en az iki hafta önceden bakın. Kol ya da paça boyu gerekirse terzide ayarlatmaya vakit kalır.']]
  },
  {
    id: 'gunluk', ad: 'Günlük çocuk takımları', blog: 'kombin',
    baslik: 'Günlük çocuk takımları, eşofman ve kombinler · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da 2-14 yaş kız ve erkek çocuk günlük takımları: eşofman, kot takım, şort etek ve tişört. Yeni sezon ürünler Mavi Boncuk’ta.',
    giris: ['Okula, parka ve eve giyilecek 2-14 yaş kız ve erkek çocuk takımları: eşofmanlar, kot takımlar, şort etekler, sweatshirt ve tişörtler.', 'Yeni sezon ürünler geldikçe Instagram’da paylaşıyoruz; burada askıdakilerin bir kısmını görebilirsiniz.'],
    sss: [['Eşofman takımı kaç beden almalı?', 'Lastikli bel ve manşetli paçalı takımlarda tam beden alın; paça biraz uzunsa manşet tutar. Boy ve kiloyu yazarsanız modele göre söyleyelim.']]
  },
  {
    id: 'okul', ad: 'Okul kıyafetleri', blog: 'okul',
    baslik: 'Okul kıyafetleri, polo tişört ve etek · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da okul kıyafetleri: polo yaka tişört, şort, etek ve pantolon. Okulunuzun istediği renkleri yazın, elimizde olanı söyleyelim.',
    giris: ['Polo yaka tişört, şort, etek ve pantolon gibi okul kıyafetleri mağazamızda. Beyaz, bordo ve yeşil polo tişörtler ile bej şortlar askıda.', 'Okulunuzun istediği rengi ve modeli yazın, elimizde olan bedenleri söyleyelim.'],
    sss: [['Okul kıyafetinden kaç takım almalı?', 'Her gün yıkamak istemiyorsanız üst için üç, alt için iki parça çoğu ailenin işini görür.']]
  },
  {
    id: 'bebek', ad: 'Bebek kıyafetleri ve bebek arabası', blog: 'bebek',
    baslik: 'Bebek kıyafetleri, bebek arabası ve beşik · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da 0-3 yaş bebek kıyafetleri ile bebek arabası, beşik, ana kucağı, yürüteç ve mama sandalyesi. Modeller ve fiyat için WhatsApp’tan yazın.',
    giris: ['0-3 yaş bebek elbiseleri ve takımlarının yanında bebek arabası, beşik, ana kucağı, yürüteç ve mama sandalyesi de satıyoruz.', 'Büyük ürünlerin hepsi sitede yok. Hangisini aradığınızı yazın, elimizdeki modellerin fotoğrafını ve fiyatını gönderelim.'],
    sss: [['Yenidoğan bebek hangi bedeni giyer?', 'Çoğu yenidoğan 0-3 ay, yani 56-62 beden giyer. İri doğan bebekler 3-6 ay bedende daha rahat eder.'],
      ['Bebek arabası fiyatları ne kadar?', 'Fiyat modele göre değişiyor. Elimizdeki modellerin fotoğrafını ve güncel fiyatını WhatsApp’tan gönderiyoruz.']]
  }
];
const kart = (u) => { const g = u.gorseller[0]; const k = g.replace(/\.webp$/, '-400.webp'), o = g.replace(/\.webp$/, '-600.webp');
  return `<a class="tile" href="/urun/${u.id}"><div class="tile__frame"><img src="${o}" srcset="${k} 400w, ${o} 600w" sizes="(min-width: 75em) 22vw, (min-width: 48em) 31vw, 48vw" alt="${esc(u.ad)}" width="600" height="750" loading="lazy" decoding="async"></div><span class="tile__name">${esc(u.ad)}</span><span class="tile__fact">${esc(yasYazi(u))}</span></a>`; };
for (const k of KATEGORILER) {
  const list = gorunur.filter((u) => u.kategori === k.id);
  const yol = `/kategori/${k.id}`;
  const govde = `<main class="blog">
  <nav class="post__crumb" aria-label="Konum"><a href="/">Ana sayfa</a> / <a href="/urunler">Ürünler</a> / ${esc(k.ad)}</nav>
  <h1>${esc(k.ad)}</h1>
  ${k.giris.map((p) => `<p class="blog__lead">${esc(p)}</p>`).join('\n  ')}
  <p style="margin-top:1.25rem"><a class="button" href="${wa(`Merhaba, sitede ${k.ad.toLocaleLowerCase('tr')} sayfasına baktım. Elinizde neler var?`)}">WhatsApp’tan sor</a></p>
  <div class="grid-tiles" style="margin-top:2.5rem">${list.map(kart).join('')}</div>
  <section class="kat__sss"><h2 class="head" style="margin-top:4rem">Sık sorulanlar</h2>${k.sss.map(([s, c]) => `<h3>${esc(s)}</h3><p>${esc(c)}</p>`).join('')}</section>
  <section class="latest" style="padding-inline:0"><div class="latest__head"><h2 class="head">İlgili yazılar</h2><a class="link" href="/blog?kategori=${k.blog}">Hepsi</a></div><ul class="latest__list" id="latest" data-kategori="${k.blog}"></ul></section>
</main>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: k.ad, description: k.aciklama, url: SITE + yol,
      isPartOf: { '@type': 'WebSite', name: 'Mavi Boncuk', url: SITE },
      mainEntity: { '@type': 'ItemList', itemListElement: list.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/urun/${u.id}`, name: u.ad })) } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: k.sss.map(([s, c]) => ({ '@type': 'Question', name: s, acceptedAnswer: { '@type': 'Answer', text: c } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Ürünler', item: `${SITE}/urunler` }, { '@type': 'ListItem', position: 3, name: k.ad, item: SITE + yol }] }
  ];
  wr(`kategori/${k.id}.html`, sabitSayfa({ baslik: k.baslik, aciklama: k.aciklama, yol, govde, jsonld, gorsel: list[0] ? SITE + list[0].gorseller[0] : null }));
}

// ---------- 2b2) özel gün (sezon) sayfaları ----------
// Ürünler kategoriye ve kısa nota göre süzülür; büyük bebek eşyaları (araba, beşik, ana kucağı) giyim sayfalarına girmez.
const ESYA = /arabas|besik|beşik|kucag|kucağ|karyola|yurutec|yürüteç|mama-sandal/;
const giyim = (u) => !ESYA.test(u.id) && u.kategori !== 'aksesuar';
const SEZONLAR = [
  {
    id: 'mezuniyet', ad: 'Mezuniyet kıyafetleri',
    baslik: 'Mezuniyet abiyesi ve takım elbise · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da anaokulu, ilkokul ve lise mezuniyeti için kız çocuk abiyeleri ve erkek çocuk takım elbiseleri. 3-15 yaş modeller.',
    giris: ['Anaokulu, ilkokul ve lise mezuniyetleri için kız çocuk abiyeleri ve erkek çocuk takım elbiseleri. 3 yaştan 15 yaşa kadar modeller askıda.', 'Mezuniyetler çoğunlukla haziranda. Mayıs başında bakarsanız bedeni netleştirmeye, gerekirse kol ve paça boyunu ayarlatmaya vakit kalır.'],
    suz: (u) => ['abiye', 'takim-elbise'].includes(u.kategori) || /Mezuniyet/i.test(u.kisa || ''),
    sss: [['Okul belli bir renk istiyorsa?', 'Rengi yazın, elimizde o renkte hangi bedenler olduğunu fotoğrafla gönderelim.'],
      ['Mezuniyet abiyesine ne zaman bakmalı?', 'Mezuniyetler haziranda olduğu için mayıs başı iyi bir zaman. Bedeni netleştirmeye ve ayakkabıyı denemeye vakit kalır.']]
  },
  {
    id: 'sunnet', ad: 'Sünnet kıyafetleri',
    baslik: 'Sünnet kıyafeti ve çocuk takım elbise · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da sünnet töreni için 1-14 yaş erkek çocuk takım elbiseleri: smokin, keten ve yelekli üç parça modeller.',
    giris: ['Sünnet töreni için 1-14 yaş erkek çocuk takım elbiseleri: smokin, keten ve yelekli üç parça modeller, papyonlu olanlar da var.', 'Tarih belli olunca en az iki hafta önceden bakın. Kol ya da paça boyu gerekirse terzide ayarlatmaya vakit kalır.'],
    suz: (u) => u.kategori === 'takim-elbise',
    sss: [['Pelerinli, şapkalı sünnet kıyafeti var mı?', 'Elimizde olup olmadığını WhatsApp’tan sorun; varsa fotoğrafını ve bedenlerini gönderelim.'],
      ['Takım elbiseyi büyük almalı mıyım?', 'Ceketin kolu bileği geçmesin, pantolon paçası ayakkabının üstüne hafifçe değsin. Bir beden büyük ceket fotoğrafta bol görünür; tam bedenini almak daha iyi olur.']]
  },
  {
    id: 'bayramlik', ad: 'Bayramlık çocuk kıyafetleri',
    baslik: 'Bayramlık çocuk kıyafetleri · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da Ramazan ve Kurban Bayramı için kız ve erkek çocuk bayramlıkları: elbiseler, takımlar, gömlek ve şortlar. 0-16 yaş.',
    giris: ['Ramazan ve Kurban Bayramı için kız ve erkek çocuklara bayramlık: elbiseler, takımlar, gömlek ve şortlar, küçükler için bebek takımları.', 'Bayramdan birkaç hafta önce yazarsanız istediğiniz bedeni bulma şansınız daha yüksek olur.'],
    suz: (u) => giyim(u) && u.kategori !== 'okul',
    sss: [['Kardeşlere aynı renkte bayramlık bulabilir miyim?', 'Çocukların yaşlarını yazın, iki bedende de olan modelleri söyleyelim.']]
  },
  {
    id: 'dugun', ad: 'Düğün ve nişan için çocuk kıyafetleri',
    baslik: 'Düğün ve nişan için çocuk kıyafetleri · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da düğün, nişan, kına ve nikâh için kız çocuk abiyeleri ve erkek çocuk takım elbiseleri.',
    giris: ['Düğün, nişan, kına ve nikâh için kız çocuk abiyeleri ve erkek çocuk takım elbiseleri.', 'Yaz düğünleri için keten takımlar ve tül abiyeler daha hafif durur. Kardeşleri birlikte giydirmek isterseniz yaşlarını yazın, uyumlu parçaları birlikte gösterelim.'],
    suz: (u) => ['abiye', 'takim-elbise'].includes(u.kategori) || /Düğün|Nişan/i.test(u.kisa || ''),
    sss: [['Abiyeyi denemeden alabilir miyim?', 'Ortaca dışındaysanız boy ve kilo ölçüsüyle WhatsApp’tan sorun, elbiseyi ölçüp söyleyelim. Ortaca’daysanız mağazaya gelip deneyebilirsiniz.']]
  },
  {
    id: 'okula-donus', ad: 'Okula dönüş',
    baslik: 'Okula dönüş: okul kıyafetleri ve günlük takımlar · Mavi Boncuk Ortaca',
    aciklama: 'Ortaca’da okul kıyafetleri ve okula giyilecek günlük takımlar: polo tişört, şort, etek, eşofman ve sweatshirt.',
    giris: ['Okul kıyafetleri ve okula giyilecek günlük takımlar: polo tişört, şort, etek, eşofman ve sweatshirt.', 'Okulunuzun istediği rengi ve modeli yazın, elimizde olan bedenleri söyleyelim.'],
    suz: (u) => ['okul', 'gunluk'].includes(u.kategori),
    sss: [['Okul kıyafetinden kaç takım almalı?', 'Her gün yıkamak istemiyorsanız üst için üç, alt için iki parça çoğu ailenin işini görür.']]
  }
];
for (const k of SEZONLAR) {
  const list = gorunur.filter(k.suz);
  const yol = `/sezon/${k.id}`;
  const govde = `<main class="blog">
  <nav class="post__crumb" aria-label="Konum"><a href="/">Ana sayfa</a> / <a href="/urunler">Ürünler</a> / ${esc(k.ad)}</nav>
  <h1>${esc(k.ad)}</h1>
  ${k.giris.map((p) => `<p class="blog__lead">${esc(p)}</p>`).join('\n  ')}
  <p style="margin-top:1.25rem"><a class="button" href="${wa(`Merhaba, sitede ${k.ad.toLocaleLowerCase('tr')} sayfasına baktım. Elinizde neler var?`)}">WhatsApp’tan sor</a></p>
  <div class="grid-tiles" style="margin-top:2.5rem">${list.map(kart).join('')}</div>
  <section class="kat__sss"><h2 class="head" style="margin-top:4rem">Sık sorulanlar</h2>${k.sss.map(([s, c]) => `<h3>${esc(s)}</h3><p>${esc(c)}</p>`).join('')}</section>
  <nav class="blog__kats" aria-label="Özel günler" style="margin-top:3rem">${SEZONLAR.filter((x) => x.id !== k.id).map((x) => `<a class="blog__kat" href="/sezon/${x.id}">${esc(x.ad)}</a>`).join('')}</nav>
</main>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: k.ad, description: k.aciklama, url: SITE + yol,
      isPartOf: { '@type': 'WebSite', name: 'Mavi Boncuk', url: SITE },
      mainEntity: { '@type': 'ItemList', itemListElement: list.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/urun/${u.id}`, name: u.ad })) } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: k.sss.map(([s, c]) => ({ '@type': 'Question', name: s, acceptedAnswer: { '@type': 'Answer', text: c } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Ürünler', item: `${SITE}/urunler` }, { '@type': 'ListItem', position: 3, name: k.ad, item: SITE + yol }] }
  ];
  wr(`sezon/${k.id}.html`, sabitSayfa({ baslik: k.baslik, aciklama: k.aciklama, yol, govde, jsonld, gorsel: list[0] ? SITE + list[0].gorseller[0] : null }));
}
wr('api/_lib/sezonlar.json', JSON.stringify(SEZONLAR.map((k) => k.id)));

// ---------- 2c) 404 sayfası ----------
wr('404.html', sabitSayfa({
  baslik: 'Sayfa bulunamadı · Mavi Boncuk', aciklama: 'Aradığınız sayfa bulunamadı.', yol: '/404',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Sayfa bulunamadı' },
  govde: `<main class="blog"><h1>Bu sayfa askıda yok</h1><p class="blog__lead">Adres değişmiş ya da ürün satılmış olabilir. Şunlara bakabilirsiniz:</p>
  <ul class="blog__kats">${KATEGORILER.map((k) => `<li style="list-style:none"><a class="blog__kat" href="/kategori/${k.id}">${k.ad}</a></li>`).join('')}<li style="list-style:none"><a class="blog__kat" href="/blog">Blog</a></li></ul>
  <p><a class="button" href="${wa('Merhaba, sitede aradığım bir sayfayı bulamadım.')}">WhatsApp’tan sorun</a></p></main>`
}));

// ---------- 2d) canonical ve paylaşım etiketleri (elle yazılan sayfalar) ----------
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html') && x !== '404.html' && x !== 'urun.html')) {
  let h = rd(f);
  const yol = f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, '');
  if (!h.includes('rel="canonical"')) h = h.replace('<meta name="theme-color"', `<link rel="canonical" href="${SITE}${yol}">\n<meta property="og:url" content="${SITE}${yol}">\n<meta name="theme-color"`);
  wr(f, h);
}

// ---------- 3) llms.txt ve robots.txt ----------
wr('llms.txt', `# Mavi Boncuk Bebe Mağazası

> Mavi Boncuk, Muğla’nın Ortaca ilçesinde 0-16 yaş çocuk giyim mağazasıdır. Kız çocuk abiyeleri (mezuniyet, düğün, kına, doğum günü), erkek çocuk takım elbiseleri (smokin, keten, yelekli), bayramlık, okul kıyafetleri, günlük takımlar, bebek kıyafetleri ve bebek arabası, beşik, yürüteç, mama sandalyesi satar. Sipariş ve beden danışmanlığı WhatsApp üzerinden yapılır.

- Adres: Şerifnaz Başoğlu Sokak, Dede Yün karşısı, Ortaca / Muğla
- Telefon: 0252 282 84 63 · WhatsApp: 0505 745 83 64
- Instagram: https://www.instagram.com/maviboncuk_ortaca/
- Pazar günleri 12.00’de açılır.

## Sayfalar
- [Ana sayfa](${SITE}/): ürünler, yaşa göre filtre, beden bulucu
- [Bütün ürünler](${SITE}/urunler): ürün listesi
- [Blog](${SITE}/blog): beden, kumaş bakımı, özel günler, bebek ve okul üzerine günlük yazılar
- [Hakkımızda ve iletişim](${SITE}/iletisim)
- [Teslimat ve kargo](${SITE}/teslimat)
- [İptal, iade ve değişim](${SITE}/iade)
`);
wr('robots.txt', `User-agent: *
Allow: /
Disallow: /api/
Disallow: /yonetim

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);

// ---------- 4) blog takvimi ----------
const kaynak = process.argv[2];
if (kaynak) {
  const parcalar = fs.readdirSync(kaynak).filter((f) => /^p\d-[a-z]\.json$/.test(f)).sort();
  let hepsi = [];
  for (const f of parcalar) hepsi = hepsi.concat(JSON.parse(fs.readFileSync(path.join(kaynak, f), 'utf8')));
  // tekrarları ayıkla
  const gor = new Set(); hepsi = hepsi.filter((y) => y.slug && !gor.has(y.slug) && gor.add(y.slug));
  // yasaklı izler: uzun tire ve emoji temizliği (güvenlik için)
  for (const y of hepsi) {
    for (const k of ['baslik', 'ozet', 'govde']) y[k] = String(y[k]).replace(/\s*[—–]\s*/g, ', ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/<\/?(strong|b|em)>/g, '');
  }
  // 365 gün; her gün için önce o ayın yazıları, sonra her mevsim uygun olanlar; aynı kategori art arda gelmesin
  const BASLA = process.env.BASLA || new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const gun = (i) => { const d = new Date(BASLA + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); };
  // "Her ay" işaretli ama içeriği belli bir mevsime ait yazılara ay ver (adresindeki kelimeden)
  const MEVSIM = [[/plaj|havuz|deniz|yazlik|yaz-|-yaz|gunes|sicak|tatil|sinek|cibinlik|klima|terli/, 7], [/kislik|kis-|-kis|mont|soguk|kar-|yagmurluk|polar|pelus/, 12], [/okul|okula/, 9]];
  for (const y of hepsi) if (!(y.ay >= 1)) for (const [re, ay] of MEVSIM) if (re.test(y.slug)) { y.ay = ay; break; }
  // Belirli güne bağlı yazılar o günden birkaç gün önce çıksın (2026-2027 takvimi)
  const SABIT = [
    [/29-ekim/, '2026-10-22'], [/yilbasi|yeni-yil/, null], [/ramazan-bayram/, '2027-02-27'], [/23-nisan/, '2027-04-14'],
    [/19-mayis/, '2027-05-12'], [/anneler-gunu/, '2027-05-02'], [/kurban-bayram/, '2027-05-07'], [/babalar-gunu/, '2027-06-12'],
    [/yariyil|karne.*ocak|ocak.*karne/, '2027-01-15'], [/karne.*haziran|haziran.*karne/, '2027-06-14']
  ];

  // Aşama 1: mevsimlik yazılar kendi ayına (yoksa bir önceki aya) eşit aralıkla yerleşir.
  // Aşama 2: kalan günler genel yazılarla, aynı konu art arda gelmeyecek şekilde dolar.
  const GUN = Math.min(365, hepsi.length);
  const gunler = Array.from({ length: GUN }, (_, i) => gun(i));
  const slot = new Array(GUN).fill(null);
  const ayGunleri = (ay) => gunler.map((t, i) => (Number(t.slice(5, 7)) === ay ? i : -1)).filter((i) => i >= 0);
  // sabit günlü yazıları önce yerleştir (aynı güne ikincisi gelirse ertesi/önceki boş güne kayar)
  const sabitlenen = new Set();
  for (const [re, tarih] of SABIT) {
    if (!tarih) continue;
    hepsi.filter((y) => re.test(y.slug)).forEach((y, n) => {
      let i = gunler.indexOf(tarih); if (i < 0) return;
      i = Math.max(0, i - n * 2);
      while (i >= 0 && slot[i] !== null) i--;
      if (i < 0) return;
      slot[i] = y; sabitlenen.add(y.slug);
    });
  }
  const mevsimlik = hepsi.filter((y) => !sabitlenen.has(y.slug) && y.ay >= 1 && y.ay <= 12);
  const genel = hepsi.filter((y) => !sabitlenen.has(y.slug) && !(y.ay >= 1 && y.ay <= 12));
  const artan = [];
  for (let ay = 1; ay <= 12; ay++) {
    const liste = mevsimlik.filter((y) => y.ay === ay);
    if (!liste.length) continue;
    // önce kendi ayı, sığmazsa önceki ayın ikinci yarısı, sonra bir sonraki ay
    const onceki = ayGunleri(ay === 1 ? 12 : ay - 1); const oncekiYari = onceki.slice(Math.floor(onceki.length / 2));
    const adaylar = [...ayGunleri(ay), ...oncekiYari, ...ayGunleri((ay % 12) + 1)];
    const bos = () => adaylar.filter((i) => slot[i] === null);
    liste.forEach((y, k) => {
      const b = bos();
      if (!b.length) { artan.push(y); return; }
      // kendi ayı içinde eşit aralık
      const kendi = b.filter((i) => Number(gunler[i].slice(5, 7)) === ay);
      const havuzGun = kendi.length ? kendi : b;
      const sec = havuzGun[Math.min(havuzGun.length - 1, Math.floor((k * havuzGun.length) / liste.length))];
      slot[sec] = y;
    });
  }
  const kalan = [...genel, ...artan];
  // genel yazıları konulara göre sıraya diz (round-robin)
  const kats = {}; for (const y of kalan) (kats[y.kategori] ||= []).push(y);
  const sira = []; let var_ = true;
  while (var_) { var_ = false; for (const k of Object.keys(kats)) if (kats[k].length) { sira.push(kats[k].shift()); var_ = true; } }
  for (let i = 0; i < GUN; i++) if (slot[i] === null && sira.length) {
    // önceki günle aynı konu olmasın
    const onceki = slot[i - 1]?.kategori; let k = sira.findIndex((y) => y.kategori !== onceki); if (k < 0) k = 0;
    slot[i] = sira.splice(k, 1)[0];
  }
  const takvim = slot.map((y, i) => (y ? { ...y, tarih: gunler[i] } : null)).filter(Boolean);
  wr('api/_lib/yazilar.json', JSON.stringify(takvim));
  const ozet = {};
  for (const y of takvim) { const a = y.tarih.slice(0, 7); ozet[a] = (ozet[a] || 0) + 1; }
  console.log(`blog: ${hepsi.length} yazı okundu, ${takvim.length} gün planlandı (${takvim[0]?.tarih} → ${takvim.at(-1)?.tarih})`);
  console.log('aylık dağılım:', JSON.stringify(ozet));
  const yanlisAy = takvim.filter((y) => y.ay && y.ay !== Number(y.tarih.slice(5, 7)) && y.ay !== (Number(y.tarih.slice(5, 7)) % 12) + 1);
  console.log('mevsimi kaymış yazı:', yanlisAy.length, yanlisAy.slice(0, 8).map((y) => `${y.tarih} ay=${y.ay} ${y.slug}`).join(' | '));
}
console.log(`ürün sayfası: ${gorunur.length}, kabuk, llms.txt, robots.txt hazır`);
