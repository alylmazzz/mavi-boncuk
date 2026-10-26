# Çocuk butik web sitesi

Instagram üzerinden satış yapan bir çocuk giyim butiğinin web sitesi. Hedef kitle anne-babalar,
özellikle telefondan bakan anneler. Site, ürünü güvenle seçip sipariş vermelerini sağlamalı.

## Teknik

- Saf HTML + CSS + vanilla JS. Build adımı yok; Vercel doğrudan klasörü yayınlar.
- Ürünler `data/urunler.json`, sayfa görselleri `data/site.json`, yorumlar `data/yorumlar.json` içinde. Sayfalar bu dosyadan render edilir, ürün HTML'e elle yazılmaz.
- Görseller `assets/img/urunler/<urun-id>/` altında, WebP, en uzun kenar 1600px.
- Dağıtım: GitHub reposu → Vercel (main dalına push = canlı yayın).
- Sipariş: şimdilik WhatsApp / Instagram DM bağlantısı (ödeme altyapısı kararı bekliyor).

## Mağaza görünümü (2026-10-19, mağaza sahibinin gönderdiği tasarım görseli; aşağıdaki eski renk/oyuncak kurallarının önüne geçer)

- Palet açık mavi + bej + lacivert, tokenlar `assets/css/vitrin.css` başında (site.css ve oyun.css'ten sonra yüklenir, ezer).
  Yazı tipleri sitede: Nunito (gövde), Caveat (el yazısı başlıklar), Playpen Sans (afiş başlığı), Dancing Script (logo).
- Başlık ve alt bilgi tek kaynak: `urun.html`. derle.js bunları üretilen sayfalara, blog kabuğuna, ana sayfaya ve yasal sayfalara kopyalar.
  Üstte duyuru şeridi, arama (öneri listesi), logo, Hesabım / Favorilerim / Sepetim; altında kategori menüsü (#menu, telefonda hamburger).
- Menü süzgeçleri `/#bebek`, `/#kiz`, `/#erkek`, `/#genc`, `/#yeni`, `/#indirim` (site.js OZEL). Kız/Erkek için ürünlerde `cinsiyet`
  (kiz | erkek | unisex) alanı var; yönetici modunda "Kimin için" seçilir.
- `assets/js/vitrin.js`: kayan afiş, Çok Satanlar (vitrin işaretliler, sonra en yeniler; afiş görselli ürünler hariç), sepet (mb-sepet,
  siparişi WhatsApp mesajıyla gönderir, mb-siparisler'e yazar), favoriler (ek.js'teki mb-begen ile ortak), Hesabım (üyelik yok, cihazdaki
  kayıtlar), bülten (e-posta `/api/bildir` tur=bulten ile Telegram'dan mağazaya gider).
- Fiyat girilmemişse her yerde "- TL" yazar; fiyat yalnızca yönetici modunda girilir. Ücretsiz kargo eşiği 300 TL (vitrin.js KARGO_ESIK
  ve data/magaza.json).
- Ana sayfadan çıkarılanlar: eski hero, "Bu hafta askıda", kardeşler, dükkândan kareler, sipariş yolu, "Dükkânda neler var", mesaj formu.
  Boncuk imleç, iz, süzülen arka plan ve yaş balonu konfetisi oyun.js'ten kaldırıldı. Gece modu artık yalnızca ay düğmesiyle açılır.
- Yeni metinlerin çevirileri `tools/_ceviri-vitrin.js` içinde; yeni metin eklenirse oraya satır ekleyip çalıştır, sonra derle sırası.

## WhatsApp site asistanı (2026-10-19)

Ege Hanım "Mavi Boncuk Site" WhatsApp grubuna yazılı/sesli/fotoğraflı istek gönderir; mindcorplab sunucusunda 7/24 çalışan ajan
(pm2 `mb-ajan`, kullanıcı `mbajan`, kod `/opt/mb-ajan`, veri `/mnt/HC_Volume_105946305/mb-ajan`) Claude Code ile (model claude-opus-5)
önce plan yazıp onay ister, onay gelince bu depoda uygular, derler, denetler, main'e push eder ve Vercel'e yayınlar.
Ajan her işe `origin/main`'den başlar. **Bu depoda elle çalışmadan önce `git pull`**; ajanın kayıtları "Site asistanı (WhatsApp):" ile başlar.
Grupta "geri al" son ajan kaydını geri alır. Kaynak: WSL `~/work/mb-ajan-src`.

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
Yayın testi: `node tools/blog-test.js` (365 yazıyı kendi gününde dener; deploydan önce çalıştır).
Yazı kuralları: uydurma anekdot/istatistik/politika yok, yapay zekâ kalıpları yok (docs/ses-ve-dil.md).

## Metin

Tüm metinler `docs/ses-ve-dil.md` kurallarına göre yazılır. Teslimden önce metinleri o dosyadaki
yasak listesine göre tara.

## İçerik kaynağı

Instagram içerikleri imginn.com üzerinden alınır, süreç `docs/instagram-aktarim.md` içinde.

## Yönetim paneli (2026-10-17)

WhatsApp butonunun üstündeki MB logosu (ek.js): 3 dokunuş → muhasebe paneli girişi, 5 dokunuş → sitede yönetici modu girişi.
Şifreler istemcide yok: `api/yonetim.js` role göre scrypt ile doğrular (panel: MB_YONETIM_TUZ/HASH, admin: MB_ADMIN_TUZ/HASH,
ortak imza MB_YONETIM_IMZA), role ait imzalı HttpOnly çerez verir (mb_yon / mb_adm, `api/_lib/oturum.js`). `/yonetim`
paneli `api/_lib/panel/index.html`'den sunar.

Yönetici modu (2026-10-18): `assets/js/duzen.js` (girişten sonra ek.js yükler; localStorage `mb-admin`). Kartta fiyata dokun-değiştir,
Sil, Gizle/Göster; ürün sayfasında tüm yazılar yerinde düzenlenir + kategori, yaş, stok, indirim (eski_fiyat), vitrin, gizle, fotoğraf
ekle/çıkar; üst çubukta Ürün ekle, Fiyat ayarı (ortak fiyat, boşsa "-"; istenirse hepsine), Silinenler (geri al). Değişiklikler Vercel Blob
`urunler/duzen.json` (`api/urunler.js`; {guncel, yeni, silinen, varsayilan_fiyat, hepsi_varsayilan}), site.js açılışta
data/urunler.json üstüne uygular; ziyaretçiye en geç ~1-2 dk'da yansır. Yeni ürünlerin sayfası `/urun?id=<id>`. Fiyat yalnızca yönetici modunda girilir; girilmemişse kartta ve ürün sayfasında "-" yazar (urunler.json ve E-Tablo fiyatları kullanılmaz, statik sayfalarda da "-").
Fiyat (2026-10-23 düzeltmesi): kartta fiyata dokun → kutu ürünün KENDİ fiyatıyla açılır (ortak fiyatla görünüyorsa boş);
ürün sayfasında fiyat alanı yazıp Enter'a basınca ya da alandan çıkınca hemen kaydedilir, "Değişiklikleri kaydet" beklemez,
dokunulmadıysa hiç gönderilmez. Kendi fiyatı olmayıp ortak fiyatla görünen fiyatlar yönetici modunda "(ortak)" işaretli.
Fiyat yazımı tek kural: "1.890" = 1890 (api/urunler.js `tutar`, api/stok.js ve duzen.js `sayi` aynı mantık, birlikte değişir).
`api/urunler.js` her yazmadan önce güncel etag'i `head()` ile alır (etag = içeriğin md5'i), içeriği o md5'in değişmez kopyasından
(`urunler/surum/<md5>.json`, her yazmada asıl dosyadan önce yazılır) okur ve ETag ile koşullu yazar (`ifMatch`, çakışmada 4 deneme).
public blob adresi 1 dk'ya kadar bayat kalır; `get({useCache:false})` bunu yalnız private blob'da atlar, public'te zayıf etag (W/"…")
verir ve ifMatch onu reddeder (23-26.10 arası bütün kayıtlar "Kaydedilemedi" ile düştü). get()'e geri dönme.
Statik SEO sayfaları/llms.txt bu değişiklikleri içermez. Deploy dosya sınırına takılırsa: `npx vercel deploy --prod --yes --archive=tgz`. Panel: fiş/fatura okuma (GİB karekod → PDF metni → Tesseract), satışlar, kargo Excel,
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
- Tek ürünü WhatsApp’tan sor (vitrin.js `waSorAc`): kart fotoğrafının sağ altında `.tile__wa`, ürün sayfasında `data-wa-urun` taşıyan
  "WhatsApp’tan sor". Çekmecede beden (ürünün `bedenler`i varsa çip + serbest yazı), hazır sorular, not; mesaja ürün adı ve
  `/urun/<id>` bağlantısı girer, WhatsApp statik sayfanın og:image'ı ile fotoğraflı önizleme gösterir (müşteri ekran görüntüsü atmaz).
- `.vercelignore` içinde `/i18n/` kökle sınırlı kalmalı; `i18n/` yazılırsa `assets/i18n/` sözlükleri de yayına çıkmaz.
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
