// Gizli yönetim girişi. MB logosuna 3 dokunuş: muhasebe paneli, 5 dokunuş: sitede yönetici modu.
// POST /api/yonetim {sifre, rol: panel|admin} -> şifre sunucuda scrypt ile doğrulanır, role ait imzalı HttpOnly çerez verilir
// GET  /yonetim                             -> panel çerezi geçerliyse paneli sunar, değilse ana sayfaya döner
// GET  /api/yonetim?durum=1                 -> {yonetici: admin çerezi geçerli mi}
// GET  /api/yonetim?cikis=1                 -> iki çerezi de siler
// Şifreler ve imza anahtarı yalnızca Vercel ortam değişkenlerinde:
// panel: MB_YONETIM_TUZ, MB_YONETIM_HASH   admin: MB_ADMIN_TUZ, MB_ADMIN_HASH   ortak: MB_YONETIM_IMZA
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { CEREZ, cerezDegeri, oturumGecerli } = require('./_lib/oturum');

const SURE = 8 * 3600; // oturum 8 saat
const denemeler = new Map(); // ip -> {n, kilit} (aynı sunucu örneği içinde kaba kuvveti yavaşlatır)
const ipAl = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'yok';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const SIFRE = {
  panel: () => [process.env.MB_YONETIM_TUZ, process.env.MB_YONETIM_HASH],
  admin: () => [process.env.MB_ADMIN_TUZ, process.env.MB_ADMIN_HASH]
};

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET' && url.searchParams.get('cikis')) {
    res.setHeader('Set-Cookie', Object.values(CEREZ).map((c) => `${c}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`));
    res.statusCode = 302; res.setHeader('Location', '/'); return res.end();
  }

  // sitedeki yönetici modu oturumun hâlâ geçerli olup olmadığını buradan sorar
  if (req.method === 'GET' && url.searchParams.get('durum')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ yonetici: oturumGecerli(req, 'admin') }));
  }

  if (req.method === 'GET') {
    if (!oturumGecerli(req, 'panel')) { res.statusCode = 302; res.setHeader('Location', '/'); return res.end(); }
    const html = fs.readFileSync(path.join(__dirname, '_lib', 'panel', 'index.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'wasm-unsafe-eval'; worker-src 'self' blob: https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://cdnjs.cloudflare.com data: blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
    return res.end(html);
  }

  if (req.method === 'POST') {
    const ip = ipAl(req);
    const d = denemeler.get(ip) || { n: 0, kilit: 0 };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (d.kilit > Date.now()) { await bekle(800); res.statusCode = 429; return res.end('{"ok":false}'); }
    let govde = '';
    for await (const parca of req) { govde += parca; if (govde.length > 1000) break; }
    let sifre = '', rol = 'panel';
    try { const g = JSON.parse(govde); sifre = String(g.sifre || ''); rol = g.rol === 'admin' ? 'admin' : 'panel'; } catch (e) { sifre = ''; }
    const [tuz, hash] = SIFRE[rol]();
    let dogru = false;
    if (tuz && hash && sifre.length > 0 && sifre.length < 100) {
      const h = crypto.scryptSync(sifre, tuz, 32);
      dogru = crypto.timingSafeEqual(h, Buffer.from(hash, 'hex'));
    }
    if (!dogru) {
      d.n += 1; if (d.n >= 5) { d.kilit = Date.now() + 15 * 60 * 1000; d.n = 0; }
      denemeler.set(ip, d);
      await bekle(900);
      res.statusCode = 401; return res.end('{"ok":false}');
    }
    denemeler.delete(ip);
    const bitis = String(Math.floor(Date.now() / 1000) + SURE);
    res.setHeader('Set-Cookie', `${CEREZ[rol]}=${encodeURIComponent(cerezDegeri(rol, bitis))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SURE}`);
    return res.end('{"ok":true}');
  }

  res.statusCode = 405; res.end();
};
