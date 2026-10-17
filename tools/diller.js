// Diller: node tools/diller.js
// i18n/<dil>.json sözlüklerinden ana sayfa, ürün listesi, kategori ve ürün sayfalarının çevirilerini /<dil>/ altına üretir,
// tarayıcı sözlüklerini assets/i18n/ altına kopyalar, bütün sayfalara hreflang bağlantılarını ve dil.js'i ekler.
// Sıra: node tools/optimize.js <sürüm> → node tools/derle.js → node tools/diller.js
// Blog ve yasal sayfalar yalnızca Türkçe kalır.
const fs = require('fs'); const path = require('path');
const C = require('../assets/js/dil.js');
const { htmlGez } = require('./_html.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://maviboncukortaca.vercel.app';
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wr = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); };
const ANALITIK = true;
const DILLER = Object.keys(C.DILLER).filter((d) => d !== 'tr' && fs.existsSync(path.join(ROOT, 'i18n', d + '.json')));
const kodla = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// çevrilen sayfalar ve yolları
const sayfalar = [['index.html', '/'], ['urunler.html', '/urunler'],
  ...fs.readdirSync(path.join(ROOT, 'kategori')).filter((f) => f.endsWith('.html')).map((f) => ['kategori/' + f, '/kategori/' + f.slice(0, -5)]),
  ...(fs.existsSync(path.join(ROOT, 'sezon')) ? fs.readdirSync(path.join(ROOT, 'sezon')).filter((f) => f.endsWith('.html')).map((f) => ['sezon/' + f, '/sezon/' + f.slice(0, -5)]) : []),
  ...fs.readdirSync(path.join(ROOT, 'urun')).filter((f) => f.endsWith('.html')).map((f) => ['urun/' + f, '/urun/' + f.slice(0, -5)])];
const url = (dil, yol) => SITE + (dil === 'tr' ? yol : '/' + dil + (yol === '/' ? '' : yol));
const hreflang = (yol) => ['tr', ...DILLER].map((d) => `<link rel="alternate" hreflang="${d}" href="${url(d, yol)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${url('tr', yol)}">`;

// her sayfada: eski hreflang'leri sil, canonical'dan sonra yenilerini koy; dil.js yoksa site.js'ten önce ekle
function ortak(h, yol) {
  h = h.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\r?\n?/g, '');
  h = h.replace(/(<link rel="canonical" href="[^"]*">)/, `$1\n${hreflang(yol)}`);
  if (!h.includes('/assets/js/dil.js')) {
    const v = (h.match(/\/assets\/js\/site\.js\?v=(\w+)/) || [, '1'])[1];
    h = h.replace(/(<script src="\/assets\/js\/site\.js)/, `<script src="/assets/js/dil.js?v=${v}" defer></script>\n$1`);
  }
  // uygulama olarak ekleme (PWA) ve Vercel ziyaretçi istatistiği (çerezsiz)
  if (!h.includes('rel="manifest"')) h = h.replace('<link rel="icon"', '<link rel="manifest" href="/manifest.webmanifest">\n<link rel="apple-touch-icon" href="/assets/img/site/apple-touch-icon.png">\n<link rel="icon"');
  // Vercel panelinde Web Analytics açılınca ANALITIK = true yapın (kapalıyken betik 404 verir)
  if (ANALITIK && !h.includes('/_vercel/insights/script.js')) h = h.replace('</head>', '<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>\n<script defer src="/_vercel/insights/script.js"></script>\n</head>');
  if (!ANALITIK) h = h.replace(/<script>window\.va = [^\n]*<\/script>\n<script defer src="\/_vercel\/insights\/script\.js"><\/script>\n/, '');
  return h;
}

// JSON-LD içindeki okunur alanları çevir
function jsonldCevir(h, sz, dil) {
  return h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (tam, a, govde, b) => {
    try {
      const gez = (o) => {
        if (Array.isArray(o)) return o.map(gez);
        if (o && typeof o === 'object') {
          const y = {};
          for (const [k, v] of Object.entries(o)) {
            if (['name', 'description', 'text'].includes(k) && typeof v === 'string') y[k] = C.cevir(v, sz) ?? v;
            else if (['url', 'item', '@id'].includes(k) && typeof v === 'string' && v.startsWith(SITE)) {
              const yol = v.slice(SITE.length).replace(/#.*$/, '') || '/';
              y[k] = C.cevrilir(yol) ? url(dil, yol) + (v.includes('#') ? v.slice(v.indexOf('#')) : '') : v;
            } else y[k] = gez(v);
          }
          return y;
        }
        return o;
      };
      return a + JSON.stringify(gez(JSON.parse(govde))) + b;
    } catch (e) { return tam; }
  });
}

let toplamEksik = 0;
const sitemapEk = [];
for (const [dosya, yol] of sayfalar) wr(dosya, ortak(rd(dosya), yol));

// yasal ve diğer Türkçe sayfalara yalnızca dil.js (seçici için)
for (const f of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !['index.html', 'urunler.html'].includes(f))) {
  const h = rd(f);
  if (h.includes('/assets/js/site.js')) wr(f, ortak(h, null));
}

fs.mkdirSync(path.join(ROOT, 'assets/i18n'), { recursive: true });
for (const dil of DILLER) {
  const sozluk = JSON.parse(rd(`i18n/${dil}.json`));
  const sz = C.sozlukHazirla(sozluk);
  // tarayıcı için sözlük (dinamik metinler, WhatsApp mesajları)
  wr(`assets/i18n/${dil}.json`, JSON.stringify(sozluk));
  const not = [C.cevir('Yasal metinler ve blog yazıları Türkçedir.', sz), C.cevir('WhatsApp mesajınızın altına Türkçesini de ekliyoruz; kendi dilinizde yazabilirsiniz.', sz)].filter(Boolean);
  const eksik = new Set();
  for (const [dosya, yol] of sayfalar) {
    let h = rd(dosya);
    h = htmlGez(h, (t) => { const c = C.cevirKoru(t, sz); if (c == null && /\p{L}{3,}/u.test(t) && !/^(Mavi Boncuk|WhatsApp|Instagram|Blog|Instagram: @maviboncuk_ortaca)$/.test(t.trim())) eksik.add(t.trim()); return c; });
    h = jsonldCevir(h, sz, dil);
    h = h.replace('<html lang="tr">', `<html lang="${dil}"${C.DILLER[dil].yon ? ` dir="${C.DILLER[dil].yon}"` : ''}>`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url(dil, yol)}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url(dil, yol)}$2`)
      .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${C.DILLER[dil].locale}$2`)
      // site içi bağlantılar çeviriye gider; blog ve yasal sayfalar Türkçe kalır
      .replace(/href="\/((?:urunler|urun\/[\w-]+|kategori\/[\w-]+|sezon\/[\w-]+)?)(#[^"]*)?"/g, (t, y, hash) => `href="/${dil}${y ? '/' + y : ''}${hash || ''}"`);
    if (not.length) h = h.replace('</footer>', `<p class="dil-not">${not.map(kodla).join(' ')}</p>\n</footer>`);
    wr(`${dil}/${dosya}`, h);
    sitemapEk.push(url(dil, yol));
  }
  toplamEksik += eksik.size;
  console.log(`${dil}: ${sayfalar.length} sayfa${eksik.size ? `, çevirisi olmayan ${eksik.size} metin: ${[...eksik].join(" | ")}` : ''}`);
}
wr('api/_lib/diller.json', JSON.stringify({ diller: DILLER, sayfalar: sayfalar.map(([, y]) => y) }));
if (!DILLER.length) console.log('i18n/<dil>.json bulunamadı; yalnızca Türkçe sayfalar güncellendi.');
