// Yönetim oturumları: imzalı HttpOnly çerezler (api/yonetim.js verir).
// panel  -> muhasebe paneli (/yonetim, api/telegram.js)   çerez mb_yon
// admin  -> sitede yönetici modu (api/urunler.js)          çerez mb_adm
// İki rolün imzası farklıdır; birinin çerezi ötekinin yerine geçmez.
const crypto = require('crypto');

const COOKIE = 'mb_yon';
const CEREZ = { panel: COOKIE, admin: 'mb_adm' };
const ONEK = { panel: '', admin: 'adm:' };
const imzala = (v) => crypto.createHmac('sha256', process.env.MB_YONETIM_IMZA || '').update(v).digest('hex');
const cerezDegeri = (rol, bitis) => `${bitis}.${imzala(ONEK[rol] + bitis)}`;
function oturumGecerli(req, rol = 'panel') {
  const ad = CEREZ[rol];
  const c = (req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(ad + '='));
  if (!c || !process.env.MB_YONETIM_IMZA) return false;
  const [bitis, imza] = decodeURIComponent(c.slice(ad.length + 1)).split('.');
  if (!bitis || !imza || Number(bitis) < Date.now() / 1000) return false;
  const beklenen = imzala(ONEK[rol] + bitis);
  return imza.length === beklenen.length && crypto.timingSafeEqual(Buffer.from(imza), Buffer.from(beklenen));
}

module.exports = { COOKIE, CEREZ, imzala, cerezDegeri, oturumGecerli };
