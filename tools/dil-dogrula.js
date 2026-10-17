// Çeviri dosyasını denetler: node tools/dil-dogrula.js <dil>   (ör. en)
// i18n/kaynak.json'daki her metnin i18n/<dil>.json içinde boş olmayan bir karşılığı olmalı ve yer tutucular ({0}, {#0}) aynı kalmalı.
const fs = require('fs'); const path = require('path');
const dil = process.argv[2];
const KOK = path.join(__dirname, '..');
const kaynak = require(path.join(KOK, 'i18n/kaynak.json'));
let ceviri;
try { ceviri = JSON.parse(fs.readFileSync(path.join(KOK, 'i18n', dil + '.json'), 'utf8')); } catch (e) { console.error('JSON okunamadı:', e.message); process.exit(1); }
const hata = [];
const yt = (s) => (String(s).match(/\{#?\d+\}/g) || []).sort().join(',');
for (const { metin } of kaynak) {
  const v = ceviri[metin];
  if (typeof v !== 'string' || !v.trim()) { hata.push('EKSİK: ' + metin); continue; }
  if (yt(v) !== yt(metin)) hata.push(`YER TUTUCU: ${metin}  =>  ${v}`);
  if (/\{\d+\}/.test(v) && /\{#\d+\}/.test(metin) && !/\{#\d+\}/.test(v)) hata.push(`{#n} korunmalı: ${metin}`);
}
const fazla = Object.keys(ceviri).filter((k) => !kaynak.some((x) => x.metin === k));
if (fazla.length) hata.push(...fazla.map((k) => 'KAYNAKTA YOK (silin): ' + k));
console.log(hata.length ? hata.join('\n') : `tamam: ${kaynak.length} metin`);
process.exit(hata.length ? 1 : 0);
