// Blog ortak kodu: yazılar, yayın tarihi kontrolü ve sayfa iskeleti.
// Yazılar api/_lib/yazilar.json içinde; her biri "tarih" (YYYY-AA-GG, Türkiye saatiyle) gelince yayına girer.
// Bu dosyalar statik olarak sunulmaz; yalnızca fonksiyonlar okur, böylece ileri tarihli yazılar önceden görünmez.
const YAZILAR = require('./yazilar.json');
const KABUK = require('./kabuk.json');

const SITE = 'https://maviboncukortaca.vercel.app';
const INDEXNOW_KEY = '06b3d050733d23c440f20a359b9f455c';

// Türkiye saatiyle bugünün tarihi (UTC+3, yaz saati yok)
function bugun() {
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
// Bir sonraki Türkiye gece yarısına kalan saniye (önbellek süresi)
function geceYarisinaSaniye() {
  const simdi = Date.now() + 3 * 3600 * 1000;
  const yarin = Math.floor(simdi / 86400000 + 1) * 86400000;
  return Math.max(60, Math.floor((yarin - simdi) / 1000));
}
function yayindakiler() {
  const t = bugun();
  return YAZILAR.filter((y) => y.tarih <= t).sort((a, b) => b.tarih.localeCompare(a.tarih));
}
function bul(slug) {
  const y = YAZILAR.find((x) => x.slug === slug);
  return y && y.tarih <= bugun() ? y : null;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const tarihYazi = (t) => { const [y, m, d] = t.split('-').map(Number); return `${d} ${AYLAR[m - 1]} ${y}`; };
const KATEGORI = {
  'beden-ve-olcu': 'Beden ve ölçü', 'kumas-ve-bakim': 'Kumaş ve bakım', 'ozel-gun': 'Özel günler', 'erkek-cocuk': 'Erkek çocuk',
  bebek: 'Bebek', okul: 'Okul', mevsim: 'Mevsimler', 'bayram-ve-kutlama': 'Bayram ve kutlamalar', kombin: 'Kombinler',
  ortaca: 'Ortaca ve çevresi', ebeveyn: 'Anne babalar için'
};

function sayfa({ baslik, aciklama, yol, govde, jsonld, tur = 'website' }) {
  const url = SITE + yol;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(baslik)}</title>
<meta name="description" content="${esc(aciklama)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${tur}">
<meta property="og:title" content="${esc(baslik)}">
<meta property="og:description" content="${esc(aciklama)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/img/site/og.jpg">
<meta property="og:locale" content="tr_TR">
<meta name="theme-color" content="#fbfbfb">
<link rel="alternate" type="application/rss+xml" title="Mavi Boncuk blog" href="${SITE}/blog/rss.xml">
${KABUK.head}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
${KABUK.header}
${govde}
${KABUK.footer}
${KABUK.scripts}
</body>
</html>`;
}

module.exports = { YAZILAR, SITE, INDEXNOW_KEY, bugun, geceYarisinaSaniye, yayindakiler, bul, esc, tarihYazi, KATEGORI, sayfa };
