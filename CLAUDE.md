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

Yorumlar `data/yorumlar.json` içinde ve yalnızca gerçek müşteri yorumlarıdır (Instagram’dan). Uydurma yorum,
yıldız ya da “mağazada denedik” gibi doğrulanmamış iddia yazılmaz.

Ebeveyn için kritik bilgiler her üründe görünür olmalı: beden ve yaş karşılığı, kumaş içeriği,
yıkama talimatı, stok, kargo süresi, iade koşulu.

## Metin

Tüm metinler `docs/ses-ve-dil.md` kurallarına göre yazılır. Teslimden önce metinleri o dosyadaki
yasak listesine göre tara.

## İçerik kaynağı

Instagram içerikleri imginn.com üzerinden alınır, süreç `docs/instagram-aktarim.md` içinde.
