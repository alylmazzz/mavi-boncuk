// /api/konum — ziyaretçinin yaklaşık bölgesi (Vercel'in IP başlıklarından, il düzeyinde).
// Hiçbir şey kaydedilmez; yalnızca "dükkâna yakın mısınız" bildirimini seçmek için kullanılır.
module.exports = (req, res) => {
  const h = req.headers;
  const ulke = h['x-vercel-ip-country'] || '';
  const bolge = h['x-vercel-ip-country-region'] || '';
  let sehir = '';
  try { sehir = decodeURIComponent(h['x-vercel-ip-city'] || ''); } catch (e) { sehir = ''; }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  // TR-48 = Muğla
  res.end(JSON.stringify({ ulke, yakin: ulke === 'TR' && bolge === '48', sehir }));
};
