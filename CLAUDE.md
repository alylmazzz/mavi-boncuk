# Çocuk butik web sitesi

Instagram üzerinden satış yapan bir çocuk giyim butiğinin web sitesi. Hedef kitle anne-babalar,
özellikle telefondan bakan anneler. Site, ürünü güvenle seçip sipariş vermelerini sağlamalı.

## Teknik

- Saf HTML + CSS + vanilla JS. Build adımı yok; Vercel doğrudan klasörü yayınlar.
- Ürünler `data/urunler.json`, sayfa görselleri `data/site.json`, yorumlar `data/yorumlar.json` içinde. Sayfalar bu dosyadan render edilir, ürün HTML'e elle yazılmaz.
- Görseller `assets/img/urunler/<urun-id>/` altında, WebP, en uzun kenar 1600px.
- Dağıtım: GitHub reposu → Vercel (main dalına push = canlı yayın).
- Sipariş: şimdilik WhatsApp / Instagram DM bağlantısı (ödeme altyapısı kararı bekliyor).

## Tasarım kuralları (öncelik sırasıyla)

1. `ui-ux-pro-max`: erişilebilirlik ve dokunma kuralları kesin. Kontrast 4.5:1, dokunma alanı 44px,
   gövde metni 16px+, satır yüksekliği 1.5+, `prefers-reduced-motion` desteği, CLS < 0.1.
2. `design-taste-frontend` (taste-skill): `references/copy.md` ve `references/tells.md` metin ve
   "yapay zeka görünümü" yasakları için esas alınır.
3. `frontend-design`, `high-end-visual-design` (soft-skill): yalnızca boşluk, hareket ve detay fikri
   için. Taste-skill ile çeliştiğinde (eyebrow etiketleri, cam efekti vb.) taste-skill kazanır.

Göz alıcı ama yormayan (kullanıcı kararı, 2026-10-17):
- Palet turkuaz, pembe, beyaz, gri. Tokenlar `assets/css/site.css` başında. Vurgu (buton, fiyat) koyu turkuaz #0b7a75.
- Neon, mor gradyan, parlayan buton, her karta gölge, emoji ikon yok.
- Hareket: imleci takip eden yumuşak nokta ve imlece göre eğilen kartlar (yalnızca fare + hareket azaltılmamışsa),
  hero’da yavaş fotoğraf geçişi, ürün kartında hover’da ikinci fotoğraf, filtre değişince karoların sırayla gelmesi.
- Fotoğraf büyük ve gerçek. Ürün fotoğrafının yerini kutu veya ikon almaz.

Oyuncak katmanı (kullanıcı kararı, 2026-10-17): `assets/css/oyun.css` + `assets/js/oyun.js`. Clay butonlar/kartlar, boncuk imleç ve iz,
süzülen arka plan, balon yaş seçici + konfeti, oyun yolu sipariş adımları, beden bulucu (genel boy tablosu),
kayan yorum balonları, WhatsApp asistanı, hediye modu, titreşim ve isteğe bağlı ses. Bu katman taste-skill’in
gölge/gradyan yasaklarını bilerek esnetir. Hareketler prefers-reduced-motion ve yavaş bağlantıda kapanır.
CSS/JS değişince HTML’deki `?v=` sürümünü artır (assets bir yıl önbellekte).

Yorumlar `data/yorumlar.json` içinde ve yalnızca gerçek müşteri yorumlarıdır (Instagram’dan). Uydurma yorum,
yıldız ya da “mağazada denedik” gibi doğrulanmamış iddia yazılmaz.

Ebeveyn için kritik bilgiler her üründe görünür olmalı: beden ve yaş karşılığı, kumaş içeriği,
yıkama talimatı, stok, kargo süresi, iade koşulu.

## Yasal sayfalar ve ödeme

Ödeme altyapısı PayTR (kullanıcı kararı, 2026-10-17). Yasal sayfalar: iletisim, teslimat, iade, mesafeli-satis,
on-bilgilendirme, kvkk, gizlilik (.html). Mağaza bilgileri tek yerde: `data/magaza.json`; sayfalar `assets/js/magaza.js` ile
doldurur, boş alanlar turuncu [işaret] görünür. Yasal metinler şablondur; yayından önce mali müşavir/avukat kontrolü önerilir.

## Ek kolaylıklar (2026-10-18)

`assets/js/ek.js`: gece modu (21.00-06.00 otomatik, menüden değiştirilir), IP ile il düzeyinde yakınlık bildirimi (`/api/konum`),
haftanın kombinleri (`data/kombinler.json`), telefonda alt işlem çubuğu, kaydırınca bir kez belirme. Stok ve fiyat: Google E-Tablo
CSV bağlantısı Vercel ortam değişkeni `SHEET_CSV_URL`; `/api/stok` okur, şablon `docs/stok-tablosu.csv`. Ürün arama ve beden bulucudan
yaş süzme site.js içinde (`window.mbYasSec`).

## Blog ve arama görünürlüğü

365 yazı `api/_lib/yazilar.json` içinde, her biri bir `tarih` ile (2026-10-17 → 2027-10-16). `/blog`, `/blog/:slug`, `/blog/rss.xml`,
`/sitemap.xml` sunucu fonksiyonları (api/) tarihi gelenleri gösterir; deploy gerekmez. Vercel cron (`/api/indexnow`, her gün 00.10 TR)
yeni yazıyı IndexNow ile bildirir. Statik ürün sayfaları `urun/<id>.html`, `urunler.html`, `llms.txt`, `robots.txt` ve takvim
`node tools/derle.js <taslak-klasörü>` ile üretilir; ürün verisi değişince yeniden çalıştır. Taslak denetimi: `node tools/blog-denetim.js`.
Hız: `node tools/optimize.js <sürüm>` CSS’i birleştirir (assets/css/app.min.css; site.css ve oyun.css kaynaktır) ve HTML başlıklarını günceller;
sonra `node tools/derle.js <taslak>` üretilen sayfaları yeniler. Yazı tipleri assets/fonts altında (dış istek yok). Kategori sayfaları kategori/*.html.
Google ve Bing doğrulama etiketleri index.html’de; silinmemeli.
Yazı kuralları: uydurma anekdot/istatistik/politika yok, yapay zekâ kalıpları yok (docs/ses-ve-dil.md).

## Metin

Tüm metinler `docs/ses-ve-dil.md` kurallarına göre yazılır. Teslimden önce metinleri o dosyadaki
yasak listesine göre tara.

## İçerik kaynağı

Instagram içerikleri imginn.com üzerinden alınır, süreç `docs/instagram-aktarim.md` içinde.

## Yönetim paneli (2026-10-17)

WhatsApp butonunun üstündeki MB logosuna 3 kez dokununca şifre penceresi açılır (ek.js). Şifre istemcide yok: `api/yonetim.js`
scrypt ile doğrular (Vercel env: MB_YONETIM_TUZ, MB_YONETIM_HASH, MB_YONETIM_IMZA), imzalı HttpOnly çerez verir, `/yonetim`
paneli `api/_lib/panel/index.html`'den sunar. Panel: fiş/fatura okuma (GİB karekod → PDF metni → Tesseract), satışlar, kargo Excel,
aylık Excel, kurallar (Ayarlar'dan), kayıtlar cihazda IndexedDB + JSON yedek. Tasarım ve mevzuat: `docs/muhasebe-sistemi.md`.
Vergi içeriği yalnızca yasal planlamadır; beyanı SMMM verir.
Telegram botu (@maviboncukortacabot): `api/telegram.js`. Env: TELEGRAM_BOT_TOKEN, TELEGRAM_IZINLI_TELEFON (virgüllü, kendi numarasını
paylaşan yetkili olur), CRON_SECRET (09.00 TR sabah özeti). Bağlı sohbetler webhook adresindeki ?s= listesinde. Panel Ayarlar'dan kodla bağlama.

## Diller (2026-10-19)

Türkçe + en, de, ru, nl, it, es, fr, pt, ar (Arapça sağdan sola: dil.js DILLER.ar.yon = rtl, diller.js dir="rtl" ekler; CSS html[dir="rtl"]). Çevrilen sayfalar: ana sayfa, urunler, kategori/*, urun/* → `/<dil>/...` (ör. /en, /de/urunler).
Blog ve yasal sayfalar yalnızca Türkçe. Sözlükler `i18n/<dil>.json` (anahtar = Türkçe metin; {n} metin, {#n} sayı yer tutucusu),
kaynak liste `i18n/kaynak.json`, denetim `node tools/dil-dogrula.js <dil>`. Çekirdek + tarayıcı tarafı `assets/js/dil.js`
(dil seçici, Türkçe sayfada dil önerisi, JS ile gelen metinlerin çevirisi, WhatsApp mesajını ziyaretçinin dilinde + altına Türkçesi).
Yeni Türkçe metin eklenince: kaynak.json'a ekle, 8 sözlüğe çevirisini yaz. Derleme sırası:
`node tools/optimize.js <sürüm>` → `node tools/derle.js` → `node tools/diller.js` (son adım /<dil>/ sayfalarını, hreflang'leri ve
assets/i18n/ sözlüklerini üretir; derle.js'ten sonra mutlaka çalıştır).

## Ek özellikler (2026-10-20)

- Beğendiklerim: ürün kartlarında kalp, sol altta liste, "Hepsini WhatsApp’tan sor" (localStorage `mb-begen`, ek.js).
- Kardeşleri birlikte giydirin (#kardes), gelip denemek için randevu (#randevu, WhatsApp mesajı), yol tarifi (#yol-tarifi) index.html'de.
- Özel gün sayfaları `/sezon/<id>` (mezuniyet, sunnet, bayramlik, dugun, okula-donus) derle.js içindeki SEZONLAR'dan üretilir.
- Telegram: `/duyuru <metin>` sitenin üstünde şerit (sabitlenmiş mesaj, `/api/duyuru` okur, 5 dk önbellek), `/duyurukapat`.
  "Gelince haber ver"e basılınca `/api/bildir` mağazaya Telegram bildirimi yollar. Ortak Telegram kodu `api/_lib/tg.js`.
- PWA: `manifest.webmanifest`, `sw.js` (sayfalar ağ öncelikli, /assets önbellekte, /api ve /yonetim hiç), simgeler assets/img/site/icon-*.png.
- Vercel Web Analytics açık (diller.js ANALITIK = true ile betiği ekler).
- Dükkân haritası (#konum): iki dükkân (Çocuk Giyim 36.8368452,28.7666592; Bebe Şube 36.8375636,28.7644536), Google Haritalar gömülü; "Bulunduğum yerden yolu göster" konum izniyle Leaflet + OSRM ile kırmızı rota çizer.

## Hız notları (2026-10-18)

- Ana sayfa başlık görseli `<picture>` ile AVIF (mavi-boncuk-yazi-560/700/1400.avif); ilk hero fotoğrafı HTML'de statik (`data-statik`), diğerleri sırası gelince iner (-500/-700/1000 srcset).
- Google haritası `data-src` ile, bölüme yaklaşınca yüklenir (1,8 MB). Rota haritası (Leaflet) yalnızca düğmeye basınca.
- oyun.js ve ek.js sayfa yüklenince ya da ilk dokunuş/tuş/kaydırmada yüklenir (diller.js dönüştürür). site.js'te aşağıdaki bölümler requestIdleCallback ile çizilir.
- Denenip geri alınanlar: kritik CSS gömme (tools/kritik.js, CLS 1,8 yaptı — kullanma), başlık görseli için preload (FCP'yi geciktirdi).
- Ölçümü yerel Lighthouse ile değil pagespeed.web.dev ile yap; yerel ölçüm bilgisayar yüküne göre 60-95 arası oynuyor.
