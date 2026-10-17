// Mavi Boncuk — ek kolaylıklar: gece modu, yakınlık bildirimi, haftanın kombinleri,
// telefonda alt işlem çubuğu, kaydırınca beliren bölümler.
(function () {
  const WA = '905057458364';
  const $ = (s, r = document) => r.querySelector(s);
  const waLink = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* gizli pencere */ } }
  };
  const ses = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* yok */ } }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const olcu = () => { try { const o = JSON.parse(localStorage.getItem('mb-olcu') || 'null'); return o ? ` Çocuğumun boyu ${o.boy} cm, kilosu ${o.kilo} kg.` : ''; } catch (e) { return ''; } };
  const root = document.documentElement;

  // ---------- gece modu: 21.00-06.00 arası kendiliğinden; menüden açılıp kapanır ----------
  const geceSaati = () => { const h = new Date().getHours(); return h >= 21 || h < 6; };
  const tercih = () => store.get('mb-gece'); // 'acik' | 'kapali' | null (otomatik)
  const uygula = () => {
    const t = tercih();
    const acik = t === 'acik' || (t !== 'kapali' && geceSaati());
    root.classList.toggle('gece', acik);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = acik ? '#141a33' : '#fbfbfb';
    const b = $('#gece-btn'); if (b) { b.setAttribute('aria-pressed', String(acik)); b.setAttribute('aria-label', acik ? 'Gündüz moduna geç' : 'Gece moduna geç'); }
  };
  const menu = $('#menu');
  if (menu && !$('#gece-btn')) {
    const b = document.createElement('button');
    b.className = 'sound-btn gece-btn'; b.id = 'gece-btn'; b.type = 'button';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor" fill-opacity=".15"/></svg>';
    b.addEventListener('click', () => { store.set('mb-gece', root.classList.contains('gece') ? 'kapali' : 'acik'); uygula(); });
    const sesBtn = $('#sound'); sesBtn ? sesBtn.after(b) : menu.prepend(b);
  }
  uygula();
  setInterval(uygula, 10 * 60 * 1000);

  // bildirimler sayfayı itmesin (CLS): hepsi altta yüzen tek bir yığında
  function yigin() { let y = $('.yigin'); if (!y) { y = document.createElement('div'); y.className = 'yigin'; document.body.append(y); } return y; }

  // ---------- yakınlık bildirimi (il düzeyinde, izin istemeden) ----------
  if (!ses.get('mb-konum-kapat') && $('.hero')) {
    fetch('/api/konum').then((r) => r.json()).then((k) => {
      // IP'den il tahmini mobil operatörlerde sık yanılır (bağlantı başka şehirden çıkar).
      // Bu yüzden yalnızca Muğla görünüyorsa gösterilir; "uzaktasınız" gibi bir tahmin hiç yazılmaz.
      if (!k || k.ulke !== 'TR' || !k.yakin) return;
      const kutu = document.createElement('div');
      kutu.className = 'konum'; kutu.setAttribute('role', 'status');
      kutu.innerHTML = `<p>Size yakınız. Ortaca’daki dükkânımıza gelip beğendiğinizi çocuğunuzun üstünde deneyebilirsiniz.</p><a class="link" href="#konum">Yol tarifi</a>`;
      const kapat = document.createElement('button');
      kapat.type = 'button'; kapat.className = 'konum__kapat'; kapat.setAttribute('aria-label', 'Bildirimi kapat'); kapat.textContent = '×';
      kapat.addEventListener('click', () => { kutu.remove(); ses.set('mb-konum-kapat', '1'); });
      kutu.append(kapat);
      yigin().append(kutu);
    }).catch(() => {});
  }

  // ---------- haftanın kombinleri ----------
  const kombinKutu = $('#kombinler');
  if (kombinKutu) {
    Promise.all([fetch('/data/kombinler.json').then((r) => r.json()), fetch('/data/urunler.json').then((r) => r.json())]).then(([k, u]) => {
      const bul = (id) => u.urunler.find((x) => x.id === id && !x.gizle);
      k.kombinler.forEach((c) => {
        const parcalar = c.urunler.map(bul).filter(Boolean);
        if (parcalar.length < 2) return;
        const li = document.createElement('li'); li.className = 'kombin';
        const foto = parcalar.map((p) => `<a href="/urun/${p.id}" class="kombin__foto"><img src="${p.gorseller[0].replace(/\.webp$/, '-400.webp')}" alt="${p.ad}" width="400" height="500" loading="lazy" decoding="async"></a>`).join('');
        const adlar = parcalar.map((p) => `<li><a class="link" href="/urun/${p.id}">${p.ad}</a></li>`).join('');
        const mesaj = `Merhaba, sitedeki “${c.ad}” kombinini soruyorum: ${parcalar.map((p) => p.ad).join(' ve ')}. Fiyat ve bedenleri nedir?${olcu()}`;
        li.innerHTML = `<div class="kombin__fotolar">${foto}</div><h3>${c.ad}</h3><p>${c.not}</p><ul>${adlar}</ul><a class="button" href="${waLink(mesaj)}">Tüm kombini sor</a>`;
        kombinKutu.append(li);
      });
    }).catch(() => { kombinKutu.closest('section').hidden = true; });
  }

  // ---------- telefonda alt işlem çubuğu: yaş seç, beden bul, WhatsApp ----------
  if (matchMedia('(max-width: 59.99em)').matches && $('#askidakiler')) {
    const bar = document.createElement('nav');
    bar.className = 'altbar'; bar.setAttribute('aria-label', 'Hızlı işlemler');
    bar.innerHTML = `<label class="sr-only" for="altbar-yas">Çocuğun yaşı</label>
      <select id="altbar-yas" class="altbar__yas"><option value="">Yaş seçin</option><option value="0-3">0-3 yaş</option><option value="4-8">4-8 yaş</option><option value="9-12">9-12 yaş</option><option value="13-16">13-16 yaş</option></select>
      <a class="altbar__btn" href="#beden">Beden bul</a>
      <a class="altbar__wa" href="${waLink('Merhaba, sitenizden yazıyorum.' + olcu())}" aria-label="WhatsApp’tan yazın"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3z" fill="#fff"/><path d="M12.2 10.2c-.3-.6-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.8c.2.3 2.6 4.1 6.3 5.6 3.1 1.2 3.7 1 4.4.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5l-2.3-1.1c-.3-.1-.6-.2-.8.2-.2.4-.9 1.1-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.1-2-2.5-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.3 0-.5 0-.7l-1-2.4z" fill="#25d366"/></svg><span>WhatsApp</span></a>`;
    document.body.append(bar);
    root.classList.add('has-altbar');
    bar.querySelector('select').addEventListener('change', (e) => { if (e.target.value && window.mbYasSec) window.mbYasSec(e.target.value); });
  }

  // ---------- WhatsApp butonunun üstünde MB logosu: üç kez üst üste dokununca yönetim girişi ----------
  // Şifre burada yok; sunucuda (api/yonetim.js) doğrulanır.
  const gizliLogo = () => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mb-gizli'; b.setAttribute('aria-label', 'Mavi Boncuk');
    b.innerHTML = '<img src="/assets/img/site/mb-logo-64.png" alt="" width="85" height="64" decoding="async">';
    let n = 0, zaman = 0;
    b.addEventListener('click', () => {
      const s = Date.now(); n = s - zaman < 700 ? n + 1 : 1; zaman = s;
      if (n >= 3) { n = 0; girisAc(); }
    });
    return b;
  };
  const girisAc = () => {
    if ($('.mb-giris')) return;
    const d = document.createElement('div');
    d.className = 'mb-giris'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'mb-giris-baslik');
    d.innerHTML = `<form class="mb-giris__kutu">
      <h2 id="mb-giris-baslik">Yönetim</h2>
      <label for="mb-giris-sifre">Şifre</label>
      <input id="mb-giris-sifre" type="password" inputmode="numeric" autocomplete="current-password" required maxlength="64">
      <p class="mb-giris__hata" role="alert"></p>
      <div class="mb-giris__dugmeler"><button type="button" class="button mb-giris__vazgec" data-kapat>Vazgeç</button><button type="submit" class="button">Gir</button></div>
    </form>`;
    const kapat = () => { d.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-kapat]')) kapat(); });
    const f = d.querySelector('form'), hata = d.querySelector('.mb-giris__hata'), gir = f.querySelector('[type="submit"]');
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); gir.disabled = true; hata.textContent = '';
      try {
        const r = await fetch('/api/yonetim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sifre: f.querySelector('input').value }), credentials: 'same-origin' });
        if (r.ok) { location.href = '/yonetim' + (/^#tg=/.test(location.hash) ? location.hash : ''); return; }
        hata.textContent = r.status === 429 ? 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' : 'Şifre yanlış.';
      } catch (err) { hata.textContent = 'Bağlantı kurulamadı.'; }
      gir.disabled = false; f.querySelector('input').select();
    });
    document.body.append(d);
    d.querySelector('input').focus();
  };
  const fab = $('.fab');
  if (root.classList.contains('has-altbar')) {
    const b = gizliLogo(); b.classList.add('mb-gizli--altbar'); document.body.append(b);
  } else if (fab) {
    const yigin = document.createElement('div'); yigin.className = 'fab__yigin';
    const btn = fab.querySelector('.fab__btn');
    btn.before(yigin); yigin.append(gizliLogo(), btn);
  }

  // ---------- ürün verisi (bir kez indirilir) ----------
  let urunVeri = null;
  const urunler = () => urunVeri || (urunVeri = fetch('/data/urunler.json').then((r) => r.json()).then((d) => d.urunler.filter((u) => !u.gizle)));
  const DIL = (document.documentElement.lang || 'tr') === 'tr' ? '' : '/' + document.documentElement.lang;
  const ESYA = /arabas|besik|beşik|kucag|kucağ|karyola|yurutec|yürüteç|mama-sandal/;
  const kucukGorsel = (u) => u.gorseller[0].replace(/\.webp$/, '-400.webp');
  const KALP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>';

  // ---------- beğendiklerim: kalple işaretle, hepsini tek mesajla sor ----------
  const BEGEN = 'mb-begen';
  const begenler = () => { try { const l = JSON.parse(localStorage.getItem(BEGEN) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  const begenYaz = (l) => { store.set(BEGEN, JSON.stringify(l)); begenGuncelle(); };
  const begenDegistir = (id) => { const l = begenler(); const i = l.indexOf(id); i < 0 ? l.push(id) : l.splice(i, 1); begenYaz(l); };
  const tileId = (a) => ((a.getAttribute('href') || '').match(/\/urun\/([^/?#]+)/) || [])[1];

  function kalpEkle(kok) {
    kok.querySelectorAll('a.tile:not([data-kalp])').forEach((a) => {
      const id = tileId(a); const f = a.querySelector('.tile__frame'); if (!id || !f) return;
      a.dataset.kalp = '1';
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile__begen'; b.dataset.begen = decodeURIComponent(id); b.innerHTML = KALP;
      f.append(b);
    });
    begenGuncelle();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-begen]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    begenDegistir(b.dataset.begen);
  }, true);

  const cubuk = document.createElement('div');
  cubuk.className = 'begen'; cubuk.hidden = true;
  cubuk.innerHTML = `<button type="button" class="begen__ac" aria-expanded="false">${KALP}<span>Beğendiklerim</span> <b></b></button>
    <div class="begen__panel" hidden role="region" aria-label="Beğendiklerim"><ul class="begen__liste"></ul>
    <a class="button begen__sor" href="#">Hepsini WhatsApp’tan sor</a><button type="button" class="begen__temizle">Listeyi temizle</button></div>`;
  document.body.append(cubuk);
  const acBtn = cubuk.querySelector('.begen__ac'), panel = cubuk.querySelector('.begen__panel');
  acBtn.addEventListener('click', () => { const ac = panel.hidden; panel.hidden = !ac; acBtn.setAttribute('aria-expanded', String(ac)); if (ac) begenListe(); });
  cubuk.querySelector('.begen__temizle').addEventListener('click', () => { begenYaz([]); panel.hidden = true; acBtn.setAttribute('aria-expanded', 'false'); });
  cubuk.querySelector('.begen__liste').addEventListener('click', (e) => { const c = e.target.closest('[data-cikar]'); if (c) { begenDegistir(c.dataset.cikar); begenListe(); } });

  async function begenListe() {
    const l = begenler(); const tum = await urunler().catch(() => []);
    const secili = l.map((id) => tum.find((u) => u.id === id)).filter(Boolean);
    const ul = cubuk.querySelector('.begen__liste'); ul.replaceChildren();
    for (const u of secili) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${DIL}/urun/${u.id}"><img src="${kucukGorsel(u)}" alt="" width="48" height="60" loading="lazy"><span></span></a><button type="button" data-cikar="${u.id}" aria-label="Listeden çıkar">×</button>`;
      li.querySelector('span').textContent = u.ad;
      ul.append(li);
    }
    const mesaj = ['Merhaba, sitede beğendiğim ürünleri soruyorum:', ...secili.map((u) => `• ${u.ad}`), 'Fiyat ve bedenleri nedir?' + olcu()].join('\n');
    cubuk.querySelector('.begen__sor').href = waLink(mesaj);
  }
  function begenGuncelle() {
    const l = begenler();
    document.querySelectorAll('[data-begen]').forEach((b) => {
      const var_ = l.includes(b.dataset.begen);
      b.setAttribute('aria-pressed', String(var_));
      if (b.classList.contains('begen-btn')) b.textContent = var_ ? 'Beğendiklerimden çıkar' : 'Beğendiklerime ekle';
      else b.setAttribute('aria-label', var_ ? 'Beğendiklerimden çıkar' : 'Beğendiklerime ekle');
    });
    cubuk.hidden = !l.length;
    cubuk.querySelector('b').textContent = l.length;
    if (!l.length) panel.hidden = true; else if (!panel.hidden) begenListe();
  }
  kalpEkle(document);
  new MutationObserver((ml) => { for (const m of ml) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches('a.tile') || n.querySelector('a.tile')) kalpEkle(n.parentElement || n); if (n.querySelector('[data-begen]') || n.matches('[data-begen]')) begenGuncelle(); } })
    .observe(document.body, { childList: true, subtree: true });
  addEventListener('storage', (e) => { if (e.key === BEGEN) begenGuncelle(); });

  // ---------- kardeşler: iki yaş ve amaç seçilince uyan parçalar ----------
  const kardes = $('#kardes');
  if (kardes) {
    const f = kardes.querySelector('form'), sonuc = kardes.querySelector('.kardes__sonuc'), sor = kardes.querySelector('.kardes__sor');
    const AMAC = {
      ozel: { ad: 'düğün ve özel gün', kat: ['abiye', 'takim-elbise'] },
      bayram: { ad: 'bayramlık', kat: ['abiye', 'takim-elbise', 'gunluk', 'bebek'] },
      okul: { ad: 'okul', kat: ['okul', 'gunluk'] },
      gunluk: { ad: 'günlük', kat: ['gunluk', 'bebek'] }
    };
    const uyar = (u, yas) => !u.yas_araligi || (u.yas_araligi[0] <= yas && u.yas_araligi[1] >= yas);
    const kart = (u) => `<li><a class="kardes__kart" href="${DIL}/urun/${u.id}"><img src="${kucukGorsel(u)}" alt="" width="400" height="500" loading="lazy" decoding="async"><span></span></a><button type="button" class="kardes__kalp" data-begen="${u.id}" aria-pressed="false">${KALP}</button></li>`;
    const goster = async () => {
      const y1 = Number(f.yas1.value), y2 = Number(f.yas2.value), a = AMAC[f.amac.value];
      if (f.yas1.value === '' || f.yas2.value === '') { sonuc.hidden = true; sor.hidden = true; return; }
      const tum = (await urunler().catch(() => [])).filter((u) => !ESYA.test(u.id) && a.kat.includes(u.kategori) && u.durum !== 'tükendi');
      const sec = (y) => tum.filter((u) => uyar(u, y)).sort((p, q) => (q.vitrin ? 1 : 0) - (p.vitrin ? 1 : 0)).slice(0, 4);
      const blok = (y, liste) => `<div class="kardes__kol"><h3>${y} yaş</h3>${liste.length ? `<ul>${liste.map(kart).join('')}</ul>` : '<p>Bu yaşta sitede uygun ürün yok; yazın, dükkânda olanı söyleyelim.</p>'}</div>`;
      sonuc.innerHTML = blok(y1, sec(y1)) + blok(y2, sec(y2));
      sonuc.querySelectorAll('.kardes__kart span').forEach((s, i) => { const id = s.parentElement.getAttribute('href').split('/urun/')[1]; const u = tum.find((x) => x.id === id); if (u) s.textContent = u.ad; });
      sonuc.hidden = false; sor.hidden = false;
      sor.href = waLink(`Merhaba, iki çocuğum için ${a.ad} kıyafeti arıyorum.\nBiri ${y1} yaşında, diğeri ${y2} yaşında.\nElinizde neler var?`);
      begenGuncelle();
    };
    f.addEventListener('change', goster);
    f.addEventListener('submit', (e) => { e.preventDefault(); goster(); });
  }

  // ---------- dükkân haritası: Google Haritalar + konum izniyle kırmızı rota ----------
  const harita = $('#konum');
  if (harita) {
    const ADRES = { 'Mavi Boncuk Çocuk Giyim': 'Cengiz Topel Caddesi No:37 D:39, Terzialiler, Ortaca', 'Mavi Boncuk Bebe Şube': 'Terzialiler Mahallesi, Ortaca (Google kodu RQQ7+2Q)' };
    const ifr = $('#harita-google'), rotaKutu = $('#rota-harita'), bilgi = $('#rota-bilgi'), gLink = $('#rota-google'), geri = $('#rota-geri'), ciz = $('#rota-ciz');
    let hedef = harita.querySelector('.harita__dukkan[aria-pressed="true"]');
    let lmap = null, katman = null;
    const gUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}&z=17&hl=${document.documentElement.lang || 'tr'}&output=embed`;
    const dirUrl = (o) => `https://www.google.com/maps/dir/?api=1${o ? `&origin=${o.lat},${o.lng}` : ''}&destination=${hedef.dataset.lat},${hedef.dataset.lng}`;
    const googleGoster = () => { rotaKutu.hidden = true; ifr.hidden = false; geri.hidden = true; };
    // Google haritası ağır (1-2 MB); yalnızca bölüme yaklaşınca yüklenir
    const haritaYukle = () => { if (ifr.dataset.src) { ifr.src = ifr.dataset.src; delete ifr.dataset.src; } };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((l) => { if (l.some((e) => e.isIntersecting)) { haritaYukle(); io.disconnect(); } }, { rootMargin: '300px 0px' });
      io.observe(harita);
    } else haritaYukle();
    harita.querySelectorAll('.harita__dukkan').forEach((b) => b.addEventListener('click', () => {
      harita.querySelectorAll('.harita__dukkan').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      hedef = b;
      delete ifr.dataset.src; ifr.src = gUrl(b.dataset.lat, b.dataset.lng); ifr.title = b.dataset.ad + ', Google Haritalar';
      $('#harita-adres').textContent = ADRES[b.dataset.ad] || '';
      gLink.href = dirUrl(); bilgi.textContent = ''; googleGoster();
    }));
    geri.addEventListener('click', googleGoster);
    const yukle = (tur, src) => new Promise((ok, hata) => {
      if (document.querySelector(`[data-yukle="${src}"]`)) return ok();
      const e = document.createElement(tur === 'css' ? 'link' : 'script');
      if (tur === 'css') { e.rel = 'stylesheet'; e.href = src; } else { e.src = src; }
      e.dataset.yukle = src; e.onload = ok; e.onerror = hata; document.head.append(e);
    });
    const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
    const sure = (sn) => { const d = Math.round(sn / 60); return d < 60 ? `${d} dakika` : `${Math.floor(d / 60)} saat ${d % 60} dakika`; };
    // Konum: en iyi doğruluğu birkaç saniye bekleyerek al (bilgisayarlarda konum internetten tahmin edilir, km'lerce sapabilir).
    // Önbellekteki eski konum kullanılmaz. Ziyaretçi mavi noktayı sürükleyerek ya da haritaya dokunarak başlangıcı düzeltebilir.
    const konumAl = () => new Promise((ok, hata) => {
      let enIyi = null, bitti = false, ek = null;
      const bitir = (f) => { if (bitti) return; bitti = true; navigator.geolocation.clearWatch(izle); clearTimeout(zaman); clearTimeout(ek); f(); };
      const izle = navigator.geolocation.watchPosition((k) => {
        if (!enIyi || k.coords.accuracy < enIyi.coords.accuracy) enIyi = k;
        if (k.coords.accuracy <= 50) bitir(() => ok(enIyi));
        // ilk konum geldikten sonra daha iyisi için en çok 3 saniye bekle
        else if (!ek) ek = setTimeout(() => bitir(() => ok(enIyi)), 3000);
      }, (e) => bitir(() => (enIyi ? ok(enIyi) : hata(e))), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      const zaman = setTimeout(() => bitir(() => (enIyi ? ok(enIyi) : hata({ code: 3 }))), 15000);
    });
    let baslangic = null, dogruluk = 0;
    const mesafe = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);
    const haritaHazirla = async () => {
      await Promise.all([yukle('css', LEAFLET + 'leaflet.min.css'), yukle('js', LEAFLET + 'leaflet.min.js')]);
      const L = window.L;
      ifr.hidden = true; rotaKutu.hidden = false; geri.hidden = false;
      if (!lmap) {
        lmap = L.map(rotaKutu, { scrollWheelZoom: false });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(lmap);
        // haritaya dokunulan yer yeni başlangıç olur
        lmap.on('click', (e) => { baslangic = { lat: e.latlng.lat, lng: e.latlng.lng }; dogruluk = 0; rotaCiz(); });
      }
      lmap.invalidateSize();
      return L;
    };
    async function rotaCiz() {
      const L = await haritaHazirla();
      const h = { lat: Number(hedef.dataset.lat), lng: Number(hedef.dataset.lng) };
      if (katman) katman.remove();
      const dukkan = L.marker([h.lat, h.lng]).bindTooltip(hedef.dataset.ad, { permanent: true, direction: 'top' });
      if (!baslangic) { katman = L.layerGroup([dukkan]).addTo(lmap); lmap.setView([h.lat, h.lng], 13); return; }
      const o = baslangic;
      gLink.href = dirUrl(o);
      bilgi.textContent = 'Yol çiziliyor…';
      try {
        const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${h.lng},${h.lat}?overview=full&geometries=geojson`).then((x) => x.json());
        if (!r.routes || !r.routes[0]) throw new Error('rota yok');
        const rota = r.routes[0];
        const cizgi = L.geoJSON(rota.geometry, { style: { color: '#e30a17', weight: 6, opacity: 0.9 } });
        const nokta = L.marker([o.lat, o.lng], { draggable: true, icon: L.divIcon({ className: 'rota-siz', iconSize: [22, 22] }) }).bindTooltip('Siz');
        nokta.on('dragend', () => { const p = nokta.getLatLng(); baslangic = { lat: p.lat, lng: p.lng }; dogruluk = 0; rotaCiz(); });
        const parca = [cizgi, nokta, dukkan];
        if (dogruluk > 100) parca.unshift(L.circle([o.lat, o.lng], { radius: dogruluk, color: '#1a73e8', weight: 1, fillOpacity: 0.08 }));
        katman = L.layerGroup(parca).addTo(lmap);
        lmap.fitBounds(cizgi.getBounds(), { padding: [30, 30] });
        let t = `${hedef.dataset.ad}: yaklaşık ${(rota.distance / 1000).toFixed(1).replace('.', ',')} km, arabayla ${sure(rota.duration)}.`;
        if (dogruluk > 300) t += ` Konumunuz yaklaşık bulundu (±${mesafe(dogruluk)}).`;
        bilgi.textContent = t + ' Başlangıç yanlışsa mavi noktayı sürükleyin ya da haritada bulunduğunuz yere dokunun.';
      } catch (e) {
        bilgi.textContent = 'Yol çizilemedi. Google Haritalar’da yol tarifini açabilirsiniz.';
      }
    }
    ciz.addEventListener('click', async () => {
      if (!('geolocation' in navigator)) { bilgi.textContent = 'Tarayıcınız konum paylaşmayı desteklemiyor. Haritada bulunduğunuz yere dokunarak yolu çizebilirsiniz.'; baslangic = null; rotaCiz(); return; }
      bilgi.textContent = 'Konumunuz bulunuyor…'; ciz.disabled = true;
      try {
        const k = await konumAl();
        baslangic = { lat: k.coords.latitude, lng: k.coords.longitude }; dogruluk = k.coords.accuracy || 0;
        await rotaCiz();
      } catch (e) {
        baslangic = null;
        bilgi.textContent = e && e.code === 1
          ? 'Konum izni verilmedi. Haritada bulunduğunuz yere dokunarak yolu çizebilir ya da Google Haritalar’da yol tarifini açabilirsiniz.'
          : 'Konumunuz bulunamadı. Telefonda konum (GPS) açık mı? Haritada bulunduğunuz yere dokunarak da yolu çizebilirsiniz.';
        await rotaCiz().catch(() => {});
      }
      ciz.disabled = false;
    });
  }

  // ---------- gelip denemek için randevu (WhatsApp mesajı hazırlar) ----------
  const randevu = $('#randevu-form');
  if (randevu) {
    const gun = randevu.querySelector('[name="gun"]');
    const yerel = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    gun.min = yerel;
    randevu.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(randevu));
      const satir = ['Merhaba, mağazaya gelip deneme yapmak istiyoruz.'];
      if (v.gun) satir.push(`Gün: ${v.gun.split('-').reverse().join('.')}`);
      if (v.saat) satir.push(`Saat: ${v.saat}`);
      if (v.ne) satir.push(`Denemek istediğimiz: ${v.ne}`);
      if (v.yas) satir.push(`Çocuğun yaşı: ${v.yas}`);
      satir.push('Uygun musunuz?');
      window.open(waLink(satir.join('\n')), '_blank', 'noopener');
    });
  }

  // ---------- “gelince haber ver” talebini mağazaya Telegram’dan bildir ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-stok-talep]');
    if (!a) return;
    try { navigator.sendBeacon('/api/bildir', new Blob([JSON.stringify({ tur: 'stok', id: a.dataset.stokTalep })], { type: 'application/json' })); } catch (err) { /* bildirim olmasa da mesaj gider */ }
  });

  // ---------- mağaza duyurusu (Telegram botundan /duyuru ile yazılır) ----------
  if (!ses.get('mb-duyuru-kapat')) {
    fetch('/api/duyuru').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d || !d.metin || ses.get('mb-duyuru-kapat') === d.metin) return;
      const k = document.createElement('div'); k.className = 'duyuru'; k.setAttribute('role', 'status');
      const p = document.createElement('p'); p.textContent = d.metin;
      const x = document.createElement('button'); x.type = 'button'; x.className = 'duyuru__kapat'; x.setAttribute('aria-label', 'Duyuruyu kapat'); x.textContent = '×';
      x.addEventListener('click', () => { k.remove(); ses.set('mb-duyuru-kapat', d.metin); });
      k.append(p, x);
      yigin().prepend(k);
    }).catch(() => {});
  }

  // ---------- telefona “uygulama” olarak eklenebilsin (çevrimdışıyken son görülen sayfalar açılır) ----------
  // ek.js sayfa yüklendikten sonra da gelebilir; o durumda hemen kaydet
  const swKaydet = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') { if (document.readyState === 'complete') swKaydet(); else addEventListener('load', swKaydet); }

  // ---------- kaydırınca beliren bölümler (bir kez) ----------
  if (!reduced && 'IntersectionObserver' in window) {
    const hedefler = document.querySelectorAll('.catalogue__head, .strip__title, .steps__head, .board, .sizer__box, .shop h2, .shop__grid > li, .reviews__head, .latest__head, .faq h2, .postcard, .kombinler__head, .kombin');
    root.classList.add('js-reveal');
    const io = new IntersectionObserver((list) => list.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    hedefler.forEach((n, i) => { n.classList.add('reveal'); n.style.setProperty('--d', `${(i % 4) * 70}ms`); io.observe(n); });
    // kombinler sonradan geldiği için onları da izle
    if (kombinKutu) new MutationObserver(() => kombinKutu.querySelectorAll('.kombin:not(.reveal)').forEach((n, i) => { n.classList.add('reveal'); n.style.setProperty('--d', `${i * 80}ms`); io.observe(n); })).observe(kombinKutu, { childList: true });
  }
})();
