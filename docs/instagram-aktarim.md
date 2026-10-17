# Instagram içerik aktarımı (imginn)

imginn.com Cloudflare koruması kullanıyor; komut satırından doğrudan erişim 403 dönüyor.
Bu yüzden erişim Chrome üzerinden yapılır.

## Akış

1. Chrome'da `https://imginn.com/<kullanici_adi>/` açılır, Cloudflare doğrulamasını kullanıcı geçer.
2. Claude in Chrome ile sayfa okunur (oturumda `/chrome` ile tarayıcı araçları açık olmalı).
3. Her gönderi için toplanacaklar:
   - görsel URL'leri (karusel ise hepsi)
   - açıklama metni (fiyat, beden, kumaş, renk bilgisi buradan ayıklanır)
   - tarih
4. Görseller `assets/img/urunler/<urun-id>/` altına indirilir, WebP'ye çevrilir.
5. Ürün kaydı `data/urunler.json` dosyasına eklenir. Açıklamadaki eksik bilgiler
   `"eksik": [...]` alanına yazılır ve mağaza sahibine sorulur.
6. Ürün olmayan gönderiler (kampanya, kombin, müşteri paylaşımı) `data/icerikler.json` içine.

## Kurallar

- Instagram açıklaması siteye kopyalanmaz; bilgiler alınır, metin `ses-ve-dil.md` ile yeniden yazılır.
- Müşteri çocuklarının yüzü görünen fotoğraflar mağaza sahibinin onayı olmadan kullanılmaz.
- Fiyatı açıklamada olmayan ürün "fiyat sorunuz" olarak değil, eksik bilgi olarak işaretlenir.
