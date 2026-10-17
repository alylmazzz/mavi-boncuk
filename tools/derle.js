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
const headLinks = urunHtml.slice(urunHtml.indexOf('<link rel="icon"'), urunHtml.indexOf('</head>')).trim();
const scripts = `<script src="/assets/js/site.js?v=${ver}" defer></script>\n<script src="/assets/js/oyun.js?v=${ver}" defer></script>`;

// ---------- 1) blog iskeleti ----------
wr('api/_lib/kabuk.json', JSON.stringify({ head: headLinks, header, footer, scripts }));

// ---------- 2) statik ürün sayfaları ----------
const { urunler } = JSON.parse(rd('data/urunler.json'));
const TUR = { abiye: 'Abiye', 'takim-elbise': 'Takım elbise', gunluk: 'Günlük takımlar', okul: 'Okul', bebek: 'Bebek', aksesuar: 'Aksesuar' };
const yasYazi = (u) => (u.yas_araligi ? `${u.yas_tahmini ? 'Yaklaşık ' : ''}${u.yas_araligi[0]}-${u.yas_araligi[1]} yaş` : 'Yazın, bakıp söyleyelim');
const wa = (t) => `https://wa.me/905057458364?text=${encodeURIComponent(t)}`;
const sabitSayfa = ({ baslik, aciklama, yol, govde, jsonld }) => `<!doctype html>
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
      ${satir('Yaş', yasYazi(u))}${satir('Tür', TUR[u.kategori] || '')}${satir('Fiyat', fiyat)}${satir('Kumaş', u.kumas || 'Yazın, bakıp söyleyelim')}${satir('Teslim', 'Mağazadan alabilir ya da gönderim için yazabilirsiniz')}
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
  wr(`urun/${u.id}.html`, sabitSayfa({ baslik: `${u.ad} · Mavi Boncuk, Ortaca`, aciklama: `${u.aciklama} ${yasYazi(u)}. Ortaca’daki Mavi Boncuk’ta; fiyat ve beden için WhatsApp’tan sorun.`.slice(0, 300), yol, govde, jsonld }));
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
  ${gruplar.map(([ad, l]) => `<h2>${ad}</h2><ul>${l.map((u) => `<li><a class="link" href="/urun/${u.id}">${esc(u.ad)}</a>, ${esc(yasYazi(u).toLocaleLowerCase('tr'))}</li>`).join('')}</ul>`).join('\n  ')}
</main>`
}));

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
