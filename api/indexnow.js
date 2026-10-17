// Günlük zamanlayıcı (vercel.json crons): o gün yayına giren yazıyı Bing/Yandex'e IndexNow ile bildirir.
const { yayindakiler, bugun, SITE, INDEXNOW_KEY } = require('./_lib/blog');

module.exports = async (req, res) => {
  // Vercel zamanlayıcısı CRON_SECRET tanımlıysa Authorization başlığı gönderir
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.statusCode = 401; return res.end('yetkisiz');
  }
  const t = bugun();
  const yeni = yayindakiler().filter((y) => y.tarih === t).map((y) => `${SITE}/blog/${y.slug}`);
  const urlList = [...yeni, `${SITE}/blog`, `${SITE}/sitemap.xml`];
  let durum = 'gönderilmedi';
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList })
    });
    durum = String(r.status);
  } catch (e) { durum = 'hata: ' + e.message; }
  console.log('indexnow', t, yeni.length ? yeni[0] : 'yeni yazı yok', durum); // Vercel kayıtlarında görünsün
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ tarih: t, urlList, durum }));
};
