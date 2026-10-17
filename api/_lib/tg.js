// Telegram ortak kodu (api/telegram.js, api/bildir.js, api/duyuru.js kullanır).
// Bağlı sohbetler webhook adresindeki ?s=id1,id2 listesinde tutulur.
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tg = async (yontem, govde) => {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${yontem}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde || {})
  });
  const j = await r.json().catch(() => ({ ok: false }));
  if (!j.ok) throw new Error(j.description || `Telegram ${yontem} hatası`);
  return j.result;
};
async function sahipler() {
  const w = await tg('getWebhookInfo');
  if (!w.url) return { url: '', ids: [] };
  const s = new URL(w.url).searchParams.get('s') || '';
  return { url: w.url, ids: s.split(',').filter((x) => /^-?\d+$/.test(x)) };
}
const gonder = (chat_id, text, ek = {}) => tg('sendMessage', { chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true, ...ek });
// Sitedeki duyuru, sahiplerden birinin sohbetinde bu önekle sabitlenmiş mesajdır
const DUYURU_ONEK = '📢 Sitedeki duyuru:\n';

module.exports = { esc, tg, sahipler, gonder, DUYURU_ONEK };
