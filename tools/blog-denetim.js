// Blog taslaklarını yapay zekâ izleri ve kurallar için tarar: node tools/blog-denetim.js <taslak-klasoru>
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const YASAK = ['keşfedin', 'keşfet', 'eşsiz', 'büyülü', 'sihirli', 'minik mucize', 'özenle seçilmiş', 'özenle hazırlanmış', 'kusursuz', 'mükemmel',
  'benzersiz', 'hayalinizdeki', 'deneyimi yaşayın', 'ayrıcalık', 'premium', 'en kaliteli', 'değerli müşteri', 'her anı özel', 'unutulmaz an',
  'tarzını yansıt', 'şıklığın adresi', 'vazgeçilmez', 'olmazsa olmaz', 'göz alıcı', 'büyüleyici', 'harika bir seçim', 'önemli bir rol', 'büyük önem taşı',
  'ayrı bir yere', 'dikkat çeker', 'öne çıkar', 'katkı sağlar', 'bu noktada', 'unutmayın ki', 'sonuç olarak', 'özetle', 'kısacası', 'günümüzde',
  'hızla değişen', 'her geçen gün', 'bir yolculuk', 'rehberiniz', 'ipuçlarıyla dolu', 'bilmeniz gerekenler', 'nihai rehber', "a'dan z'ye", 'kaçırmayın',
  'uzmanlar', 'araştırmalar gösteriyor', 'yapılan araştırma'];
const KALIP = [[/sadece[^.]{0,60}değil[^.]{0,40}aynı zamanda/i, 'sadece..değil..aynı zamanda'], [/[—–]/, 'uzun tire'], [/<(strong|b|em)>/i, 'kalın/italik'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'emoji'], [/<h2>\s*(sonuç|giriş|özet)/i, 'Sonuç/Giriş başlığı'], [/%\s?\d|\d\s?%/, 'yüzde (kaynaklı mı?)']];
let toplam = 0; const sorunlar = []; const sluglar = new Map();
for (const f of fs.readdirSync(dir).filter((x) => /^p\d-[a-z]\.json$/.test(x)).sort()) {
  for (const y of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    toplam++;
    const metin = (y.baslik + ' ' + y.ozet + ' ' + y.govde).toLocaleLowerCase('tr');
    const duz = y.govde.replace(/<[^>]+>/g, ' ');
    const kelime = duz.split(/\s+/).filter(Boolean).length;
    const s = [];
    for (const w of YASAK) if (metin.includes(w)) s.push(w);
    for (const [re, ad] of KALIP) if (re.test(y.baslik + y.ozet + y.govde)) s.push(ad);
    const ilk = duz.trim().split(/(?<=[.!?])\s/)[0] || '';
    if (/\?$/.test(ilk.trim())) s.push('soruyla açılış');
    if (kelime < 170 || kelime > 650) s.push(`kelime ${kelime}`);
    if (y.baslik === y.baslik.replace(/(^|\s)(\p{Ll})/gu, (m, a, b) => a + b.toLocaleUpperCase('tr')) && y.baslik.split(' ').length > 3) s.push('başlık her kelime büyük');
    if (sluglar.has(y.slug)) s.push('tekrar slug ' + sluglar.get(y.slug));
    sluglar.set(y.slug, f);
    if (s.length) sorunlar.push(`${f} ${y.slug}: ${s.join(', ')}`);
  }
}
console.log(`toplam ${toplam} yazı, sorunlu ${sorunlar.length}`);
console.log(sorunlar.join('\n'));
