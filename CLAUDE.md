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
