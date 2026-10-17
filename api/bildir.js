// /api/bildir — sitede "Gelince haber ver"e basılınca mağazaya Telegram'dan haber verir.
// Kişisel bilgi alınmaz; yalnızca hangi ürün olduğu gider. Aynı IP'den saatte en fazla 5 bildirim.
const { esc, sahipler, gonder } = require('./_lib/tg');
const URUNLER = require('../data/urunler.json').urunler;
const { SITE } = require('./_lib/blog');

const sayac = new Map(); // ip -> [zamanlar]

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'yok';
  const simdi = Date.now();
  const l = (sayac.get(ip) || []).filter((t) => simdi - t < 3600000);
  if (l.length >= 5) { res.statusCode = 429; return res.end(); }
  l.push(simdi); sayac.set(ip, l);
  let govde = '';
  for await (const p of req) { govde += p; if (govde.length > 500) break; }
  let v = {};
  try { v = JSON.parse(govde); } catch (e) { v = {}; }
  const u = URUNLER.find((x) => x.id === v.id);
  if (v.tur !== 'stok' || !u || !process.env.TELEGRAM_BOT_TOKEN) { res.statusCode = 204; return res.end(); }
  try {
    const { ids } = await sahipler();
    for (const id of ids) await gonder(id, `🔔 Sitede <a href="${SITE}/urun/${u.id}">${esc(u.ad)}</a> için “Gelince haber ver”e basıldı. Müşteri WhatsApp’tan yazmış olabilir; ürün gelince haber vermeyi unutmayın.`).catch(() => {});
  } catch (e) { /* bildirim gitmese de site çalışır */ }
  res.statusCode = 204; res.end();
};
