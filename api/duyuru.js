// /api/duyuru — sitenin üstünde gösterilen kısa duyuru.
// Mağaza sahibi Telegram botuna "/duyuru <metin>" yazar; bot mesajı sabitler, burası o sabit mesajı okur.
const { tg, sahipler, DUYURU_ONEK } = require('./_lib/tg');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Vercel önbelleği: en çok 5 dakikada bir Telegram'a sorulur
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  let metin = '';
  try {
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const { ids } = await sahipler();
      for (const id of ids) {
        const c = await tg('getChat', { chat_id: id }).catch(() => null);
        const t = c && c.pinned_message && c.pinned_message.text;
        if (t && t.startsWith(DUYURU_ONEK)) { metin = t.slice(DUYURU_ONEK.length).trim().slice(0, 200); break; }
      }
    }
  } catch (e) { metin = ''; }
  res.end(JSON.stringify({ metin }));
};
