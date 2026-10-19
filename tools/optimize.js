// Hız: node tools/optimize.js <sürüm>
// - yazı tipleri sitede (Google/Fontshare isteği yok), site.css + oyun.css tek küçültülmüş app.min.css
// - bütün HTML'lerde dış yazı tipi bağlantıları kaldırılır, en çok kullanılan iki yazı tipi önden yüklenir
// - telefon için küçük görsel boyutları (-400 / -500 / -260) üretilir (sharp gerekiyorsa SHARP_YOLU ile verilir)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ver = process.argv[2] || String(Date.now());
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);

// ---------- CSS ----------
const fonts = `@font-face{font-family:"Roundo";src:url(/assets/fonts/roundo-400.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Roundo";src:url(/assets/fonts/roundo-500.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Roundo";src:url(/assets/fonts/roundo-600.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Baloo 2";src:url(/assets/fonts/baloo2-latin-ext.woff2) format("woff2");font-weight:400 800;font-display:swap;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Baloo 2";src:url(/assets/fonts/baloo2-latin.woff2) format("woff2");font-weight:400 800;font-display:swap;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
` + [['Nunito', 'nunito', [400, 600, 700]], ['Caveat', 'caveat', [600]], ['Playpen Sans', 'playpen-sans', [700]], ['Dancing Script', 'dancing-script', [700]]]
  .map(([ad, dosya, kalinliklar]) => kalinliklar.map((w) =>
    `@font-face{font-family:"${ad}";src:url(/assets/fonts/${dosya}-latin-ext-${w}.woff2) format("woff2");font-weight:${w};font-display:swap;unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"${ad}";src:url(/assets/fonts/${dosya}-latin-${w}.woff2) format("woff2");font-weight:${w};font-display:swap;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
`).join('')).join('');
const kucult = (css) => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};:,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .replace(/:\s*(?=[^{}]*{)/g, ':') // seçicilerdeki iki noktayı bozma
  .trim();
// vitrin.css (mağaza görünümü) en sonda: site.css ve oyun.css'teki ortak seçicileri ezer
const app = kucult(fonts + rd('assets/css/site.css') + '\n' + rd('assets/css/oyun.css') + '\n' + rd('assets/css/vitrin.css'));
wr('assets/css/app.min.css', app);
console.log('app.min.css', Math.round(app.length / 1024), 'KB');

// ---------- HTML ----------
const PRELOAD = `<link rel="preload" href="/assets/fonts/nunito-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/dancing-script-latin-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/app.min.css?v=${ver}">`;
const htmlDosyalari = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))];
for (const f of htmlDosyalari) {
  let h = rd(f);
  h = h.replace(/<link rel="preconnect" href="https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontshare\.com|cdn\.fontshare\.com)"[^>]*>\n?/g, '')
       .replace(/<link href="https:\/\/(fonts\.googleapis\.com|api\.fontshare\.com)[^"]*" rel="stylesheet">\n?/g, '')
       .replace(/<link rel="preload" href="\/assets\/fonts\/[^"]+" as="font"[^>]*>\n?/g, '')
       .replace(/<link rel="stylesheet" href="\/assets\/css\/(site|oyun|vitrin|app\.min)\.css[^"]*">\n?/g, '')
       .replace(/<\/head>/, `${PRELOAD}\n</head>`)
       .replace(/(\/assets\/js\/[a-z]+\.js)\?v=\w+/g, `$1?v=${ver}`);
  wr(f, h);
}
console.log('HTML güncellendi:', htmlDosyalari.length);
