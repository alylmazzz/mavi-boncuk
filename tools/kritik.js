// Kritik CSS: ana sayfaların (index.html ve /<dil>/index.html) ilk ekran CSS'ini sayfaya gömer, kalanını engellemeden yükler.
// Kullanım (diller.js'ten sonra): BEASTIES_YOLU=<node_modules/beasties> node tools/kritik.js
// beasties yoksa hiçbir şey yapmaz. JS ile çizilen ilk ekran parçalarının kuralları (allowRules) her zaman gömülür.
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
let Beasties;
try { Beasties = require(process.env.BEASTIES_YOLU || 'beasties'); Beasties = Beasties.default || Beasties; } catch (e) { console.log('beasties yok, kritik CSS atlandı'); process.exit(0); }

const sayfalar = ['index.html', ...fs.readdirSync(ROOT).filter((d) => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(ROOT, d, 'index.html'))).map((d) => d + '/index.html')];
const b = new Beasties({
  path: ROOT, publicPath: '/', preload: 'media', pruneSource: false, inlineFonts: false, preloadFonts: false, compress: true, logLevel: 'warn',
  // ilk ekranda JS ile oluşan ya da JS ile sınıf alan öğeler
  allowRules: [/hero/, /\.sky/, /\.bar/, /\.menu/, /\.toy-switch/, /\.sound-btn/, /\.dil/, /\.gece/, /html\.gece/, /\.fab/, /\.mb-gizli/, /\.begen/, /\.yigin/, /\.konum/, /\.altbar/, /has-altbar/, /\.reveal/, /js-reveal/, /\.button/, /@font-face/]
});
(async () => {
  for (const s of sayfalar) {
    const f = path.join(ROOT, s);
    let h = fs.readFileSync(f, 'utf8');
    if (h.includes('data-beasties-container') || /<style>[^<]{2000,}<\/style>/.test(h)) { console.log(s, 'zaten işlenmiş'); continue; }
    const once = h.length;
    // beasties dosyayı ?v= sürümüyle bulamıyor: işlerken sürümü çıkar, sonra geri koy
    const v = (h.match(/app\.min\.css\?v=(\w+)/) || [])[1];
    if (v) h = h.split(`app.min.css?v=${v}`).join('app.min.css');
    h = await b.process(h);
    if (v) h = h.split('/assets/css/app.min.css').join(`/assets/css/app.min.css?v=${v}`);
    fs.writeFileSync(f, h);
    console.log(s, once, '->', h.length);
  }
})();
