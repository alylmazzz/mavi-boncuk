// /api/bildir — mağazaya Telegram'dan haber verir:
// - "Gelince haber ver"e basılınca hangi ürün olduğu (kişisel bilgi yok)
// - ana sayfadaki bültene yazılan e-posta adresi (yalnızca kampanya duyurusu için; KVKK metninde yazılı)
// Aynı IP'den saatte en fazla 5 bildirim.
const { esc, sahipler, gonder } = require('./_lib/tg');
const URUNLER = require('../data/urunler.json').urunler;
const { SITE } = require('./_lib/blog');

const sayac = new Map(); // ip -> [zamanlar]
const EPOSTA = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,180}\.[a-z]{2,24}$/i;

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
  let metin = null;
  if (v.tur === 'stok') {
    const u = URUNLER.find((x) => x.id === v.id);
    if (u) metin = `🔔 Sitede <a href="${SITE}/urun/${u.id}">${esc(u.ad)}</a> için “Gelince haber ver”e basıldı. Müşteri WhatsApp’tan yazmış olabilir; ürün gelince haber vermeyi unutmayın.`;
  } else if (v.tur === 'bulten') {
    const ep = String(v.eposta || '').trim();
    if (!EPOSTA.test(ep)) { res.statusCode = 400; return res.end(); }
    metin = `📩 Sitede bültene kayıt: ${esc(ep)}\nKampanya ve yeni ürün duyurusu için listeye ekleyin.`;
  }
  if (!metin || !process.env.TELEGRAM_BOT_TOKEN) { res.statusCode = 204; return res.end(); }
  try {
    const { ids } = await sahipler();
    for (const id of ids) await gonder(id, metin).catch(() => {});
  } catch (e) { /* bildirim gitmese de site çalışır */ }
  res.statusCode = 204; res.end();
};
