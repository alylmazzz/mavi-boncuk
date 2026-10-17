// Gizli yönetim girişi.
// POST /api/yonetim {sifre}  -> şifre sunucuda scrypt ile doğrulanır, imzalı HttpOnly çerez verilir
// GET  /yonetim             -> çerez geçerliyse paneli sunar, değilse ana sayfaya döner
// GET  /api/yonetim?cikis=1 -> çerezi siler
// Şifre ve imza anahtarı yalnızca Vercel ortam değişkenlerinde: MB_YONETIM_TUZ, MB_YONETIM_HASH, MB_YONETIM_IMZA
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { COOKIE, imzala, oturumGecerli } = require('./_lib/oturum');

const SURE = 8 * 3600; // oturum 8 saat
const denemeler = new Map(); // ip -> {n, kilit} (aynı sunucu örneği içinde kaba kuvveti yavaşlatır)
const ipAl = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'yok';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET' && url.searchParams.get('cikis')) {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    res.statusCode = 302; res.setHeader('Location', '/'); return res.end();
  }

  if (req.method === 'GET') {
    if (!oturumGecerli(req)) { res.statusCode = 302; res.setHeader('Location', '/'); return res.end(); }
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
    let sifre = '';
    try { sifre = String(JSON.parse(govde).sifre || ''); } catch (e) { sifre = ''; }
    const { MB_YONETIM_TUZ: tuz, MB_YONETIM_HASH: hash } = process.env;
    let dogru = false;
    if (tuz && hash && sifre.length > 0 && sifre.length < 100) {
      const h = crypto.scryptSync(sifre, tuz, 32);
      dogru = crypto.timingSafeEqual(h, Buffer.from(hash, 'hex'));
    }
    if (!dogru) {
      d.n += 1; if (d.n >= 3) { d.kilit = Date.now() + 15 * 60 * 1000; d.n = 0; }
      denemeler.set(ip, d);
      await bekle(900);
      res.statusCode = 401; return res.end('{"ok":false}');
    }
    denemeler.delete(ip);
    const bitis = String(Math.floor(Date.now() / 1000) + SURE);
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(bitis + '.' + imzala(bitis))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SURE}`);
    return res.end('{"ok":true}');
  }

  res.statusCode = 405; res.end();
};
