// Yönetim oturumu: imzalı HttpOnly çerez (api/yonetim.js verir; api/telegram.js de kontrol eder).
const crypto = require('crypto');

const COOKIE = 'mb_yon';
const imzala = (v) => crypto.createHmac('sha256', process.env.MB_YONETIM_IMZA || '').update(v).digest('hex');
function oturumGecerli(req) {
  const c = (req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(COOKIE + '='));
  if (!c || !process.env.MB_YONETIM_IMZA) return false;
  const [bitis, imza] = decodeURIComponent(c.slice(COOKIE.length + 1)).split('.');
  if (!bitis || !imza || Number(bitis) < Date.now() / 1000) return false;
  const beklenen = imzala(bitis);
  return imza.length === beklenen.length && crypto.timingSafeEqual(Buffer.from(imza), Buffer.from(beklenen));
}

module.exports = { COOKIE, imzala, oturumGecerli };
