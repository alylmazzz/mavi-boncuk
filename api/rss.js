// /blog/rss.xml — son 30 yazı
const { yayindakiler, geceYarisinaSaniye, SITE, esc } = require('./_lib/blog');

module.exports = (req, res) => {
  const items = yayindakiler().slice(0, 30).map((y) => `<item><title>${esc(y.baslik)}</title><link>${SITE}/blog/${y.slug}</link><guid>${SITE}/blog/${y.slug}</guid><pubDate>${new Date(y.tarih + 'T06:00:00+03:00').toUTCString()}</pubDate><description>${esc(y.ozet)}</description></item>`).join('\n');
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, s-maxage=${geceYarisinaSaniye()}`);
  res.end(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Mavi Boncuk blog</title><link>${SITE}/blog</link><description>Ortaca’daki Mavi Boncuk çocuk giyim mağazasından günlük yazılar</description><language>tr</language>
${items}
</channel></rss>`);
};
