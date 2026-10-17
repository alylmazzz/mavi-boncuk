// /sitemap.xml — sabit sayfalar, ürünler ve yayındaki blog yazıları
const { yayindakiler, geceYarisinaSaniye, SITE, bugun } = require('./_lib/blog');
const URUNLER = require('../data/urunler.json').urunler;

module.exports = (req, res) => {
  const t = bugun();
  const sabit = ['/', '/blog', '/urunler', '/iletisim', '/teslimat', '/iade', '/mesafeli-satis', '/on-bilgilendirme', '/kvkk', '/gizlilik'];
  const satir = (loc, lastmod, freq, pri) => `<url><loc>${SITE}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sabit.map((p) => satir(p, p === '/' || p === '/blog' ? t : null, p === '/blog' ? 'daily' : 'weekly', p === '/' ? '1.0' : '0.6')).join('\n')}
${URUNLER.filter((u) => !u.gizle).map((u) => satir(`/urun/${u.id}`, u.tarih, 'weekly', '0.7')).join('\n')}
${yayindakiler().map((y) => satir(`/blog/${y.slug}`, y.tarih, 'monthly', '0.6')).join('\n')}
</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, s-maxage=${geceYarisinaSaniye()}`);
  res.end(xml);
};
