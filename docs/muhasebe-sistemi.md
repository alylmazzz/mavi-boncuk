# Mavi Boncuk muhasebe ve kargo sistemi

Tasarım belgesi ve yasal vergi planlaması rehberi · Ekim 2026

> **Önemli.** Bu belge vergiyi **yasal yollarla** azaltmak içindir: hakkı olan her indirimi, istisnayı ve gider kalemini eksiksiz kullanmak, ceza riskini sıfıra indirmek. Kayıt dışı satış, belgesiz alım, sahte ya da muhteviyatı itibarıyla yanıltıcı fatura, hasılatı gizleme bu sistemin konusu değildir; bunlar VUK 359 kapsamında vergi kaçakçılığı suçudur. Beyannameyi yetkili mali müşavir (SMMM) hazırlar ve imzalar. Rakamlar 2026 içindir. Her yıl başında ve yeni bir tebliğ çıktığında müşavirle güncellenmelidir. **(Teyit)** işaretli maddeler bu belgeyi yazarken kesinleştirilemedi; uygulamadan önce müşavire sorulmalıdır.

---

## 1. Bugün çalışan bölüm (1. aşama)

| Parça | Ne yapıyor |
|---|---|
| **Gizli giriş** | WhatsApp butonunun üstünde MB logosu var. Logoya kısa aralıklarla üç kez dokununca şifre penceresi açılır. Telefonda logo alt çubuğun üstündedir. |
| **Şifre doğrulama** | Şifre sitenin kodunda **yok**. Vercel'de yalnızca scrypt özeti (hash) olarak saklanır ve `api/yonetim.js` doğrular. Doğru girişte 8 saat geçerli, imzalı ve JavaScript'ten okunamayan bir oturum çerezi verilir. Aynı sunucuya üç yanlış denemede o IP 15 dakika bekletilir. Panel adresi (`/yonetim`) arama motorlarına kapalıdır. |
| **Fiş / fatura okuma** | Fotoğraf ya da PDF yüklenir. Önce **GİB karekodu** okunur (e-Arşiv/e-Fatura karekodu VKN, tarih, belge no, matrah, KDV ve ödenecek tutarı hatasız verir). Karekod yoksa **Tesseract OCR** (Türkçe) çalışır. Görüntü gri tona çevrilip kontrastı artırılır, silik termal fişler için eşikleme yapılır. PDF'lerde metin doğrudan okunur. Satıcı adına göre kategori ve hesap kodu (153, 255, 760, 770, 780) önerilir. |
| **Kural kontrolleri** | Matrah + KDV ≠ toplam; **30.000 TL** ve üzeri nakit ödeme (tevsik); **12.000 TL** üzeri demirbaş (amortisman); binek otomobil **%70 gider / %30 KKEG** ayrımı; aynı fişin iki kez girilmesi; eksik ya da hatalı VKN; yurt dışı fatura (KDV-2 / stopaj); işle ilgisi yazılmamış yemek gideri. |
| **Satışlar** | KDV dahil tutardan matrah ve KDV'yi ayırır (giyimde %10). Kargo maliyeti tutulur. Müşteri izin verdiyse 5 ay sonra **"çocuğunuz büyüdü"** hatırlatması WhatsApp mesajı olarak hazır açılır. |
| **Kargo** | Alıcı bilgileri girilir. Bekleyen gönderiler **Excel** olarak indirilir; BasitKargo'ya toplu yükleme ya da elle giriş için kullanılır. Takip numarası girilince müşteriye gidecek WhatsApp mesajı tek tuşla açılır. |
| **Aylık Excel** | Altı sekme: Özet, Giderler, Satışlar, Kargo, Uyarılar ve Muhasebeci aktarımı (her gider için 15x/25x/7xx borç, 191 indirilecek KDV, 100/102 alacak, KKEG satırı). |
| **Ayarlar** | Tevsik sınırı, demirbaş sınırı, binek oranı ve satış KDV'si panelden değiştirilir. Kanun değişince kod değişmez. |
| **Yedek** | Kayıtlar yalnızca o cihazdaki tarayıcıda (IndexedDB) durur ve sunucuya gitmez. Haftada bir **Yedeği indir** ile JSON dosyası alınıp Drive'a konmalıdır. Telefon değişirse **Yedeği geri yükle** kullanılır. |

**Bilinen sınırlar:**
- 6 haneli şifre zayıftır. Sunucu yavaşlatsa da daha uzun bir şifreye geçmek iyi olur; değiştirmek 2 dakikalık iştir.
- Kayıtlar tek cihazdadır; iki kişi aynı anda kullanacaksa 2. aşamadaki veritabanı gerekir.
- OCR buruşuk ya da çok silik fişte yanılabilir; karekodlu belgelerde yanılma yok denecek kadar azdır.
- Her kaydı kaydetmeden önce gözle kontrol edin.

---

## 2. İdeal sistem: "en iyi muhasebe ofisi" nasıl otomatikleşir

Amaç insanın yalnızca **onay verdiği**, gerisini sistemin yaptığı bir düzen. Yasal sınır şudur: beyanname ve e-Defter beratı **SMMM'nin e-imzasıyla** verilir. Sistem her şeyi hazırlar; son tuşa müşavir basar.

### 2.1 Mimari (önerilen, küçük işletmeye uygun)

```
Telefon / bilgisayar (PWA panel)
   │  fotoğraf, PDF, e-posta eki
   ▼
Belge alıcı ──► Karekod çözücü (GİB JSON) ──► doğru
            └─► OCR (Tesseract / bulutta belge OCR) ──► alan çıkarımı ──► güven puanı
   ▼
Kural motoru (VUK, GVK, KDVK eşikleri ayar tablosundan) ──► uyarı / KKEG / amortisman
   ▼
Veritabanı (Postgres – Vercel Marketplace: Neon / Supabase)   ◄── banka hareketleri (CSV / açık bankacılık)
   │                                                           ◄── PayTR ödeme bildirimi (webhook)
   │                                                           ◄── e-Arşiv faturalar (entegratör API)
   ▼
Mutabakat: her banka çıkışı = bir belge mi?  her satış = bir fatura mı?
   ▼
Muhasebeci aktarımı (Excel / Logo-Luca-Mikro fiş formatı)  ──► SMMM onayı ──► beyanname, e-Defter
```

- **Ön yüz:** bugünkü panel, PWA olarak ana ekrana eklenir; çevrimdışı çalışır, bağlantı gelince eşitler.
- **Sunucu:** Vercel Functions (Node). Ayrı FastAPI/Celery/Redis kurmaya gerek yok. Uzun OCR işleri Vercel Queues ya da tarayıcıda yapılır. Önerilen specteki "Next.js + FastAPI + Celery + Redis + Postgres" yığını bu ölçek için gereksiz bakım yüküdür.
- **Veritabanı:** Postgres (Marketplace üzerinden). Belgelerin görüntüleri özel (private) Vercel Blob'da tutulur. VUK 253 gereği belgeler **5 yıl** saklanır; kâğıt aslı da saklanmalıdır.
- **Kimlik:** iki adım doğrulamalı giriş (şifre + telefona kod ya da passkey) ve her işlemin kimin tarafından yapıldığını gösteren kayıt.
- **KVKK:** müşteri adı, telefonu ve adresi kişisel veridir. Aydınlatma metni zaten sitede var. Pazarlama mesajı yalnızca **ticari ileti onayı** alınmış müşteriye gider (6563 sayılı Kanun, İYS kaydı). Panelde bu onay kutusu bu yüzden vardır.

### 2.2 Belge okuma: en doğrudan en az doğruya

1. **e-Fatura / e-Arşiv XML (UBL-TR):** entegratörden ya da e-postadan gelen XML %100 doğrudur. İdeal sistem e-posta kutusunu (yalnızca okuma izniyle) dinler ve XML eki gelince kendiliğinden kaydeder.
2. **GİB karekodu:** fotoğraftan bile hatasız okunur (bugün çalışıyor).
3. **PDF metni:** e-Arşiv PDF'lerinde metin katmanı vardır (bugün çalışıyor).
4. **OCR:** yalnızca yukarıdakiler yoksa. Güven puanı düşükse alan sarı görünür ve onay istenir.
5. **Dil modeli (LLM) ile alan çıkarımı** isteğe bağlıdır ve son çaredir. Kullanılırsa fiş görüntüsü dış bir servise gider, bu yüzden KVKK aydınlatmasına eklenmelidir. Rakamlar yine karekod ya da OCR ile çapraz kontrol edilir; dil modelinin "uydurduğu" tutar kaydedilmez.

### 2.3 Mutabakat (bir muhasebe ofisinin asıl işi)

- **Banka ↔ belge:** her banka çıkışına bir fatura eşleşmeli. Eşleşmeyen çıkış "belge bekliyor" listesine düşer; ay sonuna kadar tamamlanmayan gider yazılamaz.
- **PayTR ↔ satış ↔ fatura:** her başarılı ödeme bildirimi bir satış kaydı ve bir e-Arşiv fatura üretmeli. Fatura kesilmemiş tahsilat kırmızı uyarıdır (hasılat eksik beyanı riski).
- **POS / ÖKC ↔ Z raporu:** dükkândaki günlük Z raporu toplamı satış kayıtlarıyla tutmalı.
- **Kargo ↔ fatura:** BasitKargo aylık faturası gönderi listesiyle karşılaştırılır; fazladan kesilen desi farkı itiraz listesine düşer.

### 2.4 BasitKargo bağlantısı

BasitKargo'nun sitesinde "kendi siten için API" ifadesi var, ancak açık dokümantasyon bulunamadı. Doğru sıra:

1. **BasitKargo desteğine yazın:** "Kendi sitemiz için gönderi oluşturma ve takip API'si istiyoruz; dokümantasyon ve API anahtarı nasıl alınır?" Gelirse panelde **"BasitKargo'da oluştur"** tuşu ve takip numarasının kendiliğinden gelip müşteriye WhatsApp'la gitmesi eklenir.
2. API yoksa: **Excel toplu yükleme** (bugün hazır). Destekten yükleme şablonunun sütun adlarını isteyin; paneldeki Excel o sütunlara uyarlanır.
3. **Önerilmeyen:** önerilen spectteki Playwright ile panele kendiliğinden giriş yapan robot (RPA) ve tersine mühendislik. Bunlar kullanım koşullarına aykırı olabilir, hesabın kapatılmasına yol açabilir ve site değiştiğinde sessizce bozulur.
4. Takip bildirimleri BasitKargo'dan e-postayla geliyorsa e-posta dinleyici takip numarasını yakalayıp kayda yazabilir. Bu yöntem yasal ve sağlamdır.

### 2.5 Satışı artıran ve gideri azaltan özellikler

- **Ölü stok radarı:** 90 gündür satılmayan ürünler listelenir. Önce kombinlere eklenir, sonra indirim yapılır, sezon sonunda değer düşüklüğü tutanağıyla (bkz. 3.6) gider yazılır.
- **Çocuğunuz büyüdü** (bugün var): yaş ve beden ilerlemesine göre hatırlatma, yalnızca onaylı müşteriye.
- **Ürün kârlılığı:** alış faturası, kargo, PayTR komisyonu ve iade düşülünce hangi ürünün gerçekten kâr ettiği görünür.
- **Nakit akışı takvimi:** KDV (ayın 28'i), muhtasar ve SGK, geçici vergi, Bağ-Kur ve kira tarihleri tek takvimde, 3 gün önceden hatırlatmayla. Gecikme faizi ve usulsüzlük cezası en kolay önlenen giderdir.
- **Alış karşılaştırma:** aynı ürün için toptancıların son fiyatları yan yana görünür.

### 2.6 Önerilen spec'lerdeki düzeltmeler

| Spec'te yazan | Doğrusu |
|---|---|
| Tevsik (belgeyle ödeme) sınırı 7.000 TL | 2026'da **30.000 TL** (VUK 575 sıra no'lu Tebliğ ile güncellenen tutar). |
| "Otonom beyanname" | Beyanname ve e-Defter beratı SMMM e-imzasıyla verilir. Sistem yalnızca hazırlar. |
| Her şey için LLM | Önce karekod, XML ve PDF metni; LLM yalnızca son çare ve çapraz kontrollü. |
| RPA ile BasitKargo paneli | Önce resmi API, yoksa Excel toplu yükleme. |
| Enflasyon muhasebesi her dönem | 2025–2027 dönemlerinde enflasyon düzeltmesinin ertelendiği yönünde düzenleme var **(Teyit)**. |
| 9 ajanlı mimari | Bu ölçekte tek kural motoru ve tek veritabanı yeterli. Ajan sayısı doğruluğu artırmaz, maliyeti artırır. |

---

## 3. Yasal vergi planlaması: madde madde

Aşağıdakiler bir çocuk giyim mağazasının (dükkân + internet satışı) **kanunun açıkça tanıdığı** haklarıdır. Kullanmamak fazla vergi ödemek demektir.

### 3.1 Önce doğru mükellefiyet

- **Şahıs işletmesi mi, şirket mi?** Gelir vergisi artan oranlıdır (%15–%40). Kurumlar vergisi sabittir, ancak kâr dağıtımında stopaj vardır. Yıllık kâr belirli bir düzeyi aşınca limited şirket genellikle avantajlı olur. Müşavir, mevcut kârla iki seçeneği her yıl karşılaştırmalıdır.
- **Genç girişimci istisnası (GVK 20/A):** işletme sahibi işe başladığında 29 yaşını doldurmamışsa ve ilk kez mükellef olduysa, 3 yıl boyunca kazancın belirli bir tutara kadar kısmı vergiden istisnadır. Ayrıca 1 yıl Bağ-Kur prim desteği vardır. Ege Hanım'ın durumuna uyup uymadığına bakılmalı.
- **Basit usul:** dükkân için şartlar (kira bedeli, il/ilçe, faaliyet) ve internet satışının bu usule etkisi değişkendir **(Teyit)**. Uygunsa kazanç belirli tutara kadar istisnadır.
- **Kadın girişimci ve bölgesel destekler:** KOSGEB, İŞKUR ve kalkınma ajansı (GEKA, Muğla) hibe ve kredileri vergi değil ama doğrudan maliyet düşürür. Başvuru dönemleri takip edilmelidir.

### 3.2 KDV: en büyük kazanç kalemi

- Çocuk giyiminin satış KDV'si **%10**, ancak kira, elektrik, kargo, reklam ve demirbaş gibi giderlerin çoğu **%20**. Bu yüzden indirilecek KDV sürekli birikir ("devreden KDV").
- **İndirimli orana tabi işlemlerden doğan KDV iadesi (KDVK 29/2):** yıl içinde yüklenilip indirilemeyen KDV, belirli bir alt sınırın üzerindeyse yıl sonunda **nakden ya da mahsuben iade** alınabilir. Alt sınır her yıl güncellenir **(Teyit; 2026 tutarı müşavirden)**. Bu, ölü para olan devreden KDV'yi nakde ya da SGK/vergi borcuna mahsuba çevirir. Panelde "devreden KDV" uyarısı bu yüzden var.
- Her alım **faturalı** olmalı ve faturada **işletmenin VKN'si** yazmalı. "Fiş verdiler" denen alımlarda KDV indirimi zayıflar.
- Toptancıdan alınan malın faturası **malın teslim edildiği ayın** KDV beyanında indirilir. Gecikmeli gelen faturada indirim hakkı, faturanın ilgili olduğu takvim yılı içinde kullanılabilir. Faturaları ay sonunu beklemeden girin.

### 3.3 Gider yazılabilecek her şey (GVK 40)

| Gider | Not |
|---|---|
| Ticari mal (toptan alım) | Satılan malın maliyeti. Alış faturası şart. |
| Dükkân kirası | Kiraya veren şahıssa **%20 stopaj** kesilip muhtasarla yatırılır. Stopaj da kira gideridir. |
| Elektrik, su, internet, telefon | Fatura işletme adına olmalı. |
| Kargo, poşet, kutu, etiket | BasitKargo faturası, ambalaj alımları. |
| PayTR ve POS komisyonları | Banka dekontu / PayTR faturası. |
| Reklam (Instagram/Meta, Google) | Yurt dışı faturada **sorumlu sıfatıyla KDV (KDV-2)** beyan edilip aynı ay indirilir, yani net maliyeti yoktur. Dijital reklam hizmetinde **stopaj** yükümlülüğü olabilir **(Teyit oranı)**. |
| Muhasebe ücreti, web sitesi, alan adı, Vercel | Serbest meslek makbuzu veya fatura. |
| Fotoğraf çekimi, manken, ürün çekimi | Reklam gideri. |
| Demirbaş (raf, askı, bilgisayar, yazıcı, telefon) | KDV hariç **12.000 TL'ye kadar** doğrudan gider, üzeri **amortisman**. Faydalı ömür listesine göre yıllara bölünür. |
| Bağ-Kur primleri (işletme sahibinin kendisi için) | Ticari kazançtan indirilir **(Teyit uygulama şekli)**. |
| Çalışan ücreti ve SGK işveren payı | Gider. Ayrıca bkz. 3.5 teşvikler. |
| İşle ilgili seyahat (toptancı ziyareti, fuar) | Konaklama ve yol faturası işletme adına alınır, amaç açıklamaya yazılır. |
| Mesleki eğitim, kurs, kitap | İşle ilgisi gösterilmeli. |
| Şüpheli/değersiz alacak | Dava ya da icra aşamasındaki tahsil edilemeyen alacak (VUK 323). |
| Bağış (kamu yararına dernek ve vakıf, Kızılay vb.) | Beyan edilen gelirin belirli oranına kadar, bazı kurumlara tamamı indirilir (GVK 89). Ayni bağışta (giysi) fatura ve tutanak gerekir. |

### 3.4 Binek otomobil (2026)

- Kullanım giderlerinin (yakıt, bakım, sigorta, otopark) **%70'i** gider, **%30'u KKEG** (GVK 40/5; 332 Seri No'lu GVK Genel Tebliği tutarları).
- Kiralanan binek otomobilde ayda **46.000 TL**'ye kadar kira gider yazılır.
- Satın alınan araçta amortismana esas tutar sınırları vardır (ÖTV ve KDV'nin gider yazılmadığı durumda 2.600.000 TL, yazıldığı durumda 1.380.000 TL; ÖTV+KDV için ayrıca 1.200.000 TL sınırı) **(Teyit: hangisinin uygulanacağı aracın alış şekline göre)**.
- Araç işletme aktifinde değilse gider yazılmaz. Panelde "binek" kutusu bu ayrımı kendiliğinden yapar.

### 3.5 Çalışan varsa: teşvikler

- **5 puanlık SGK işveren indirimi (5510/81):** primler zamanında ödenirse kendiliğinden uygulanır. Bu yüzden ödemeyi geciktirmek indirimi kaybettirir.
- **Asgari ücret desteği:** yıl yıl değişir **(Teyit)**.
- **İŞKUR İşgücü Uyum ve kadın/genç istihdam teşvikleri (4447 geçici 10, 6111):** yeni işe alımda uygunluk İŞKUR'a kayıtlı işsizden alımla başlar. İşe almadan önce kontrol edilmelidir.
- **Personel yemek** ve **yol** ödemelerinde günlük istisna tutarları vardır **(Teyit 2026 tutarları)**. Yemek kartı ile ödenirse istisna kolay belgelenir.
- **Dikkat:** işletme sahibinin **kendisine, eşine ve küçük çocuklarına** ödenen ücret gider yazılamaz (GVK 41/3). Reşit çocuk ise gerçekten çalışıyorsa ve sigortalıysa farklıdır.

### 3.6 Stok: ölü stoktan vergi avantajı

- **Değeri düşen mallar (VUK 278):** modası geçen, solan, hasarlı ürün **emsal (düşük) bedelle** değerlenebilir. Bunun için tutanak ve gerekirse takdir komisyonu ya da ekspertiz gerekir. Fark o yılın gideridir.
- **İndirimli satış** her zaman serbesttir, ancak satış faturasının gerçek bedelle kesilmesi gerekir.
- **Fire ve imha:** kullanılamaz hale gelen mal, noter ya da takdir komisyonu tutanağıyla imha edilip maliyeti gider yazılabilir.
- **Bağış:** satılamayan giysiler kamu yararına derneğe ya da Kızılay'a bağışlanabilir. Bağışın hangi tutarla ve ne kadarının indirileceği (gelir vergisinde indirim, KDV düzeltmesi) müşavirle belirlenmelidir.
- **Dönem sonu sayımı:** 31 Aralık'ta sayım yapılmalı. Sayım tutanağı stok maliyetini ve dolayısıyla kârı doğru gösterir.

### 3.7 Zarar ve dönem planlaması

- **Geçmiş yıl zararları** 5 yıl içinde kârdan düşülür (GVK 88).
- Yılsonuna yakın, **zaten gerekli olan** alımlar (demirbaş, stok, reklam) Aralık'ta yapılabilir. Gider o yıla düşer ve vergi bir yıl ertelenir. Gereksiz alım yapılmaz; ertelenen vergi kazanılmış para değildir.
- **Geçici vergi** üç aylık dönemlerde ödenir. Fazla ödeme yıl sonunda mahsup ya da iade edilir; beyannameleri doğru giderle vermek nakit sıkışmasını önler.

### 3.8 Cezadan kaçınmak (en ucuz tasarruf)

| Risk | Önlem |
|---|---|
| 30.000 TL ve üzeri nakit ödeme ya da tahsilat | Banka/kart/PTT ile yapın. Aksi halde tutarın **%10'u** özel usulsüzlük cezası. |
| Fatura/fiş vermemek | Belge düzenlenmeyen tutarın %10'u, en az asgari tutar cezası. Her satışa fiş ya da e-Arşiv. |
| İnternetten satışta e-Arşiv | İnternet satışı yapanların e-Arşiv ve e-Fatura geçiş zorunluluğu hasılat sınırlarına bağlıdır **(Teyit 2026 sınırı)**. Erken geçmek zarar vermez. |
| Beyanname gecikmesi | Usulsüzlük cezası ve gecikme faizi. Takvim hatırlatması (2.5). |
| Mükerrer gider | Aynı belgeyi iki kez gider yazmak vergi ziyaı cezası doğurur. Panel uyarır. |
| Belgesiz gider | Gider kabul edilmez. Fiş fotoğrafının yanında aslı da 5 yıl saklanır. |
| Kayıt dışı satış | Vergi kaçakçılığı. Bu sistemde hiçbir şekilde desteklenmez. |

---

## 4. Yol haritası

| Aşama | İçerik | Durum |
|---|---|---|
| 1 | Gizli giriş, fiş/fatura OCR + karekod, satışlar, kargo Excel, aylık Excel, kurallar, yedek | **Canlıda** |
| 2 | Postgres + özel Blob: çok cihaz, belge görüntüleri sunucuda, iki adımlı giriş | Karar bekliyor |
| 3 | PayTR bildirimiyle otomatik satış kaydı, e-Arşiv entegratörü ile otomatik fatura | PayTR hesabı açılınca |
| 4 | Banka hareketi içe aktarma ve otomatik mutabakat | 2. aşamadan sonra |
| 5 | BasitKargo API (destekten yanıt gelirse), takip numarasının müşteriye kendiliğinden gitmesi | Destekten yanıt bekleniyor |
| 6 | Ölü stok radarı, ürün kârlılığı, vergi takvimi | 2. aşamadan sonra |

## 5. Ege Hanım ve müşavirden istenecekler

1. Mükellefiyet türü (şahıs / şirket, basit usul / bilanço / işletme) ve mali müşavirin iletişim bilgisi.
2. Müşavirin kullandığı program (Luca, Logo, Mikro, Zirve…). "Muhasebeci aktarımı" sekmesi o programın içe aktarma formatına uyarlanır.
3. 2026 için: KDV iadesi alt sınırı, fatura düzenleme sınırı, e-Arşiv geçiş sınırı, dijital reklam stopaj oranı, personel yemek istisnası. Bunlar panelin Ayarlar bölümüne yazılır.
4. BasitKargo desteğinden API dokümantasyonu ya da toplu yükleme şablonu.
5. Daha güçlü bir panel şifresi (en az 12 karakter). Değiştirmek için bana yazmanız yeterli.

## Kaynaklar

- VUK 575 sıra no'lu Genel Tebliğ (tevsik zorunluluğu 30.000 TL) — KPMG Türkiye vergi bülteni, 2026
- 2026 VUK hadleri ve tutarları (doğrudan gider 12.000 TL) — RSM Türkiye; narcon.com.tr
- 332 Seri No'lu GVK Genel Tebliği, binek otomobil gider ve amortisman sınırları 2026 — yucebasmusavirlik.com; muhasebenews.com
- KDV Kanunu md. 29/2 ve KDV Genel Uygulama Tebliği (indirimli oran iadesi)
- GVK md. 20/A, 40, 41, 88, 89; VUK md. 253, 274, 278, 323, 359
- basitkargo.com (kendi siteniz için entegrasyon bilgisi)
