// Mavi Boncuk — sitede yönetici modu (girişten sonra ek.js yükler; her kayıt sunucuda oturumla doğrulanır).
// Kartlarda: fiyata dokununca değiştir, "Sil" ile kaldır. Ürün sayfasında: tüm yazılar yerinde düzenlenir,
// fotoğraf ekle/çıkar, kategori, yaş, stok. Üst çubuktan yeni ürün eklenir. Kayıtlar /api/urunler (Vercel Blob).
(function () {
  if (window.mbDuzen) return;
  window.mbDuzen = true;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of [].concat(kids)) if (k) n.append(k);
    return n;
  };
  const tl = (n) => !n ? '- TL' : `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} TL`;
  const sayi = (t) => { const s = String(t || '').replace(/[^\d,.]/g, ''); const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); return Number.isFinite(n) && n > 0 ? n : null; };
  const TR = document.documentElement.lang === 'tr';
  const KATEGORI = { gunluk: 'Günlük takımlar', abiye: 'Abiye', 'takim-elbise': 'Takım elbise', okul: 'Okul', bebek: 'Bebek', aksesuar: 'Aksesuar' };
  const CINSIYET = { kiz: 'Kız', erkek: 'Erkek', unisex: 'İkisi de' };
  const BOS = 'Yazın, bakıp söyleyelim';

  // ---------- sunucu ----------
  const gonder = (govde) => fetch('/api/urunler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde), credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? 'Oturum bitmiş, yeniden giriş yapın.' : 'Kaydedilemedi.'))));
  // fotoğraf telefonda küçültülür (en uzun kenar 1600px, webp; desteklemeyen tarayıcıda jpeg)
  async function fotoYukle(dosya, id) {
    const bmp = await createImageBitmap(dosya);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = el('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    const r = await fetch(`/api/urunler?gorsel=1&id=${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob, credentials: 'same-origin' });
    if (!r.ok) throw new Error('Fotoğraf yüklenemedi.');
    return (await r.json()).url;
  }

  // ---------- bildirim ----------
  const not = el('div', { class: 'duzen-not', role: 'status', 'aria-live': 'polite' });
  let notZaman;
  const bildir = (t, hata) => { not.textContent = t; not.classList.toggle('is-hata', !!hata); not.classList.add('is-on'); clearTimeout(notZaman); notZaman = setTimeout(() => not.classList.remove('is-on'), 3200); };

  // ---------- üst çubuk ----------
  const cubuk = el('div', { class: 'duzen-cubuk', role: 'region', 'aria-label': 'Yönetici modu' }, [el('strong', { text: 'Yönetici modu' })]);
  if (TR) {
    [['Ürün ekle', ekleAc], ['Fiyat ayarı', fiyatAyarAc], ['Silinenler', silinenlerAc]].forEach(([t, f]) => {
      const b = el('button', { type: 'button', class: 'duzen-btn', text: t });
      b.addEventListener('click', f);
      cubuk.append(b);
    });
  } else {
    cubuk.append(el('a', { class: 'duzen-btn', href: location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/', text: 'Düzenlemek için Türkçe sayfa' }));
  }
  const cikis = el('button', { type: 'button', class: 'duzen-btn', text: 'Çıkış' });
  cikis.addEventListener('click', () => { try { localStorage.removeItem('mb-admin'); } catch (e) { /* yok */ } location.href = '/api/yonetim?cikis=1'; });
  cubuk.append(cikis);
  document.body.append(cubuk, not);
  document.documentElement.classList.add('duzen-acik');

  // ---------- küçük düzenleme kutusu (kart fiyatı) ----------
  function kutuAc(hedef, deger, kaydet) {
    $('.duzen-pop') && $('.duzen-pop').remove();
    const r = hedef.getBoundingClientRect();
    const f = el('form', { class: 'duzen-pop' });
    const inp = el('input', { type: 'text', inputmode: 'decimal', value: deger, placeholder: 'Belli değilse boş', 'aria-label': 'Fiyat (TL)' });
    const tamam = el('button', { type: 'submit', class: 'duzen-btn', text: 'Kaydet' });
    const vaz = el('button', { type: 'button', class: 'duzen-btn duzen-btn--acik', text: 'Vazgeç' });
    f.append(inp, el('span', { text: 'TL' }), tamam, vaz);
    f.style.top = `${Math.min(innerHeight - 70, r.bottom + 6)}px`;
    f.style.left = `${Math.max(8, Math.min(innerWidth - 300, r.right - 280))}px`;
    const kapat = () => { f.remove(); removeEventListener('scroll', kapat); };
    vaz.addEventListener('click', kapat);
    f.addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = sayi(inp.value);
      // boş ya da "-" bırakılırsa fiyat belirsiz kalır
      if (!n && /\d/.test(inp.value)) { inp.focus(); bildir('Geçerli bir fiyat yazın.', true); return; }
      tamam.disabled = true;
      try { await kaydet(n); kapat(); } catch (err) { bildir(err.message, true); tamam.disabled = false; }
    });
    document.body.append(f);
    addEventListener('scroll', kapat, { passive: true, once: true });
    inp.focus(); inp.select();
  }

  // ---------- kartlar: fiyat ve silme ----------
  function kartlar() {
    if (!TR) return;
    document.querySelectorAll('a.tile[data-id]:not([data-duzen])').forEach((a) => {
      a.dataset.duzen = '1';
      const fiyat = a.querySelector('.tile__fiyat');
      if (fiyat) { fiyat.classList.add('is-duzen'); fiyat.setAttribute('data-duzen-ui', ''); fiyat.title = 'Fiyatı değiştir'; }
      const sil = el('button', { type: 'button', class: 'tile__sil', 'data-duzen-ui': '', text: 'Sil' });
      const gizle = el('button', { type: 'button', class: 'tile__gizle', 'data-duzen-ui': '', text: a.classList.contains('is-gizli') ? 'Göster' : 'Gizle' });
      (a.querySelector('.tile__frame') || a).append(el('span', { class: 'tile__yonetim' }, [sil, gizle]));
    });
  }
  // kartın içindeki düğmeler ürüne gitmesin
  document.addEventListener('click', (e) => {
    const ui = e.target.closest('a.tile [data-duzen-ui]');
    if (!ui) return;
    e.preventDefault(); e.stopPropagation();
    const a = ui.closest('a.tile'), id = a.dataset.id;
    if (ui.classList.contains('tile__fiyat')) {
      kutuAc(ui, String(sayi(ui.textContent) || ''), async (n) => { await gonder({ islem: 'guncelle', id, alanlar: { fiyat: n } }); ui.textContent = tl(n); bildir('Fiyat kaydedildi.'); });
    } else if (ui.classList.contains('tile__gizle')) {
      const gizli = !a.classList.contains('is-gizli');
      ui.disabled = true;
      gonder({ islem: 'guncelle', id, alanlar: { gizle: gizli } }).then(() => {
        a.classList.toggle('is-gizli', gizli); ui.textContent = gizli ? 'Göster' : 'Gizle'; ui.disabled = false;
        const rozet = a.querySelector('.tile__badge--gizli');
        if (gizli && !rozet) a.querySelector('.tile__frame').append(el('span', { class: 'tile__badge tile__badge--gizli', text: 'Gizli' }));
        if (!gizli && rozet) rozet.remove();
        bildir(gizli ? 'Ürün ziyaretçilerden gizlendi.' : 'Ürün yeniden görünüyor.');
      }).catch((err) => { ui.disabled = false; bildir(err.message, true); });
    } else if (ui.classList.contains('tile__sil')) {
      if (!ui.classList.contains('is-emin')) {
        ui.classList.add('is-emin'); ui.textContent = 'Silinsin mi?';
        setTimeout(() => { ui.classList.remove('is-emin'); ui.textContent = 'Sil'; }, 3500);
        return;
      }
      ui.disabled = true;
      gonder({ islem: 'sil', id }).then(() => { document.querySelectorAll(`a.tile[data-id="${CSS.escape(id)}"]`).forEach((t) => (t.closest('.kart') || t).remove()); bildir('Ürün silindi. “Silinenler”den geri alabilirsiniz.'); })
        .catch((err) => { ui.disabled = false; bildir(err.message, true); });
    }
  }, true);
  kartlar();
  new MutationObserver(kartlar).observe(document.body, { childList: true, subtree: true });

  // ---------- ürün sayfası: yazılar yerinde düzenlenir ----------
  function urunDuzen(u) {
    const kok = $('#urun');
    if (!TR || !kok || !u || kok.querySelector('.duzen-urun')) return;
    const alanlar = [...kok.querySelectorAll('.product__info [data-alan]')];
    const ilk = new Map();
    alanlar.forEach((n) => {
      ilk.set(n, n.textContent.trim());
      n.contentEditable = 'true';
      // fiyat: sayı klavyesi açılır, yalnızca rakam ve virgül yazılır; boş bırakılırsa "-"
      if (n.dataset.alan === 'fiyat') {
        n.inputMode = 'decimal';
        n.addEventListener('focus', () => { if (!sayi(n.textContent)) n.textContent = ''; });
        n.addEventListener('beforeinput', (e) => { if (e.data && /[^\d,.]/.test(e.data)) e.preventDefault(); });
        n.addEventListener('blur', () => { const f = sayi(n.textContent); n.textContent = tl(f); });
      }
      n.spellcheck = true;
      n.classList.add('duzen-alan');
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' && n.dataset.alan !== 'aciklama') { e.preventDefault(); n.blur(); } });
      // yapıştırılan biçimli metin düz yazıya çevrilir
      n.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
    });
    alanlar[0] && (alanlar[0].title = 'Yazıya dokunup değiştirin');

    let fotolar = [...u.gorseller];
    const kutu = el('section', { class: 'duzen-urun', 'aria-label': 'Ürünü düzenle' });
    const satir = (etiket, girdi) => el('label', { class: 'duzen-satir' }, [el('span', { text: etiket }), girdi]);
    const kisa = el('input', { type: 'text', value: u.kisa || '', maxlength: '120', placeholder: 'ör. 4-9 yaş, yeni sezon' });
    const kat = el('select', {}, Object.entries(KATEGORI).map(([k, v]) => el('option', { value: k, text: v, selected: u.kategori === k })));
    const cins = el('select', {}, Object.entries(CINSIYET).map(([k, v]) => el('option', { value: k, text: v, selected: (u.cinsiyet || 'unisex') === k })));
    const yas1 = el('input', { type: 'number', min: '0', max: '18', value: u.yas_araligi ? u.yas_araligi[0] : '', inputmode: 'numeric' });
    const yas2 = el('input', { type: 'number', min: '0', max: '18', value: u.yas_araligi ? u.yas_araligi[1] : '', inputmode: 'numeric' });
    const durum = el('select', {}, [el('option', { value: '', text: 'Stokta', selected: u.durum !== 'tükendi' }), el('option', { value: 'tükendi', text: 'Tükendi', selected: u.durum === 'tükendi' })]);
    const eski = el('input', { type: 'text', inputmode: 'decimal', value: u.eski_fiyat || '', placeholder: 'İndirim yoksa boş bırakın' });
    const isaret = (etiket, acik) => { const c = el('input', { type: 'checkbox', checked: !!acik }); return [c, el('label', { class: 'duzen-isaret' }, [c, el('span', { text: etiket })])]; };
    const [gizle, gizleSatir] = isaret('Sitede gizle (ziyaretçiler görmez, silinmez)', u.gizle);
    const [vitrin, vitrinSatir] = isaret('Ana sayfada “Bu hafta askıda” vitrininde göster', u.vitrin);
    const fotoListe = el('ul', { class: 'duzen-fotolar' });
    const fotoSec = el('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', id: 'duzen-foto' });
    const fotoCiz = () => {
      fotoListe.replaceChildren(...fotolar.map((g, i) => {
        const x = el('button', { type: 'button', 'aria-label': `${i + 1}. fotoğrafı çıkar`, text: '×' });
        x.addEventListener('click', () => { if (fotolar.length < 2) { bildir('En az bir fotoğraf kalmalı.', true); return; } fotolar.splice(i, 1); fotoCiz(); });
        return el('li', {}, [el('img', { src: g, alt: '', width: '64', height: '80' }), x]);
      }));
    };
    fotoCiz();
    fotoSec.addEventListener('change', async () => {
      for (const d of fotoSec.files) {
        bildir('Fotoğraf yükleniyor…');
        try { fotolar.push(await fotoYukle(d, u.id)); fotoCiz(); } catch (err) { bildir(err.message, true); }
      }
      fotoSec.value = '';
      bildir('Fotoğraf eklendi. Kaydetmeyi unutmayın.');
    });
    const kaydet = el('button', { type: 'button', class: 'button', text: 'Değişiklikleri kaydet' });
    const sil = el('button', { type: 'button', class: 'button button--paper duzen-sil', text: 'Ürünü sil' });
    kutu.append(
      el('h2', { text: 'Ürünü düzenle' }),
      el('p', { class: 'muted', text: 'Yukarıdaki yazılara dokunup değiştirebilirsiniz. Bitince kaydedin.' }),
      satir('Kart yazısı', kisa), satir('Tür', kat), satir('Kimin için (menüde Kız / Erkek Çocuk)', cins),
      el('div', { class: 'duzen-ikili' }, [satir('En küçük yaş', yas1), satir('En büyük yaş', yas2)]),
      satir('Stok durumu', durum),
      satir('İndirimden önceki fiyat (üstü çizili görünür)', eski),
      gizleSatir, vitrinSatir,
      el('p', { class: 'duzen-baslik', text: 'Fotoğraflar' }), fotoListe,
      fotoSec, el('label', { for: 'duzen-foto', class: 'button button--paper duzen-fotoekle', text: 'Fotoğraf ekle' }),
      el('div', { class: 'duzen-dugmeler' }, [kaydet, sil])
    );
    kok.querySelector('.product__info').append(kutu);

    kaydet.addEventListener('click', async () => {
      const a = {};
      alanlar.forEach((n) => {
        const t = n.textContent.replace(/\s+\n/g, '\n').trim();
        if (t === ilk.get(n)) return;
        const k = n.dataset.alan;
        if (k === 'fiyat') { a.fiyat = sayi(t); return; }
        a[k] = t === BOS ? null : t;
      });
      if (a.ad === null) { bildir('Ürün adı boş olamaz.', true); return; }
      if ((kisa.value || '') !== (u.kisa || '')) a.kisa = kisa.value;
      if (kat.value !== u.kategori) a.kategori = kat.value;
      if (cins.value !== (u.cinsiyet || 'unisex')) a.cinsiyet = cins.value;
      const y1 = yas1.value === '' ? null : Number(yas1.value), y2 = yas2.value === '' ? null : Number(yas2.value);
      const eskiYas = u.yas_araligi || [null, null];
      if (y1 !== eskiYas[0] || y2 !== eskiYas[1]) a.yas_araligi = y1 == null || y2 == null ? null : [Math.min(y1, y2), Math.max(y1, y2)];
      if (durum.value !== (u.durum === 'tükendi' ? 'tükendi' : '')) a.durum = durum.value || null;
      if (fotolar.join() !== u.gorseller.join()) a.gorseller = fotolar;
      if ((sayi(eski.value) || null) !== (u.eski_fiyat || null)) a.eski_fiyat = sayi(eski.value);
      if (gizle.checked !== !!u.gizle) a.gizle = gizle.checked;
      if (vitrin.checked !== !!u.vitrin) a.vitrin = vitrin.checked;
      if (!Object.keys(a).length) { bildir('Değişiklik yok.'); return; }
      kaydet.disabled = true;
      try { await gonder({ islem: 'guncelle', id: u.id, alanlar: a }); bildir('Kaydedildi.'); setTimeout(() => location.reload(), 600); }
      catch (err) { bildir(err.message, true); kaydet.disabled = false; }
    });
    sil.addEventListener('click', async () => {
      if (!sil.classList.contains('is-emin')) {
        sil.classList.add('is-emin'); sil.textContent = 'Emin misiniz? Bir daha dokunun';
        setTimeout(() => { sil.classList.remove('is-emin'); sil.textContent = 'Ürünü sil'; }, 4000);
        return;
      }
      sil.disabled = true;
      try { await gonder({ islem: 'sil', id: u.id }); bildir('Ürün silindi.'); setTimeout(() => { location.href = '/#askidakiler'; }, 700); }
      catch (err) { bildir(err.message, true); sil.disabled = false; }
    });
  }
  document.addEventListener('mb:urun', (e) => urunDuzen(e.detail));
  if (window.mbUrun) urunDuzen(window.mbUrun);

  // ---------- ortak pencere ----------
  function pencere(baslik, govde, sonra) {
    $('.duzen-modal') && $('.duzen-modal').remove();
    const m = el('div', { class: 'mb-giris duzen-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': baslik });
    const k = el('div', { class: 'mb-giris__kutu duzen-form' }, [el('h2', { text: baslik }), ...govde,
      el('div', { class: 'mb-giris__dugmeler' }, [el('button', { type: 'button', class: 'button mb-giris__vazgec', 'data-kapat': '', text: 'Kapat' })])]);
    m.append(k);
    const kapat = () => { m.remove(); document.removeEventListener('keydown', esc); if (sonra) sonra(); };
    const esc = (e) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-kapat]')) kapat(); });
    document.body.append(m);
    (k.querySelector('input, button') || k).focus();
  }
  const tazeVeri = () => fetch(`/api/urunler?taze=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' }).then((r) => r.json());

  // ---------- fiyat ayarı: fiyatı girilmemiş ürünler bu fiyatla görünür; istenirse hepsine ----------
  async function fiyatAyarAc() {
    const d = await tazeVeri().catch(() => ({}));
    const inp = el('input', { type: 'text', inputmode: 'decimal', value: d.ortak_fiyat ? String(d.ortak_fiyat) : '', placeholder: 'Boş: fiyat belli değil (-)' });
    const hepsi = el('input', { type: 'checkbox' });
    const btn = el('button', { type: 'submit', class: 'button', text: 'Kaydet' });
    const f = el('form', { class: 'duzen-urun', style: 'margin:0' }, [
      el('label', { class: 'duzen-satir' }, [el('span', { text: 'Ortak fiyat (TL)' }), inp]),
      el('p', { class: 'muted', text: 'Fiyatı ayrıca girilmemiş her ürün bu fiyatla görünür. Boş bırakılırsa "-" yazar.' }),
      el('label', { class: 'duzen-isaret' }, [hepsi, el('span', { text: 'Tek tek girilmiş fiyatlar dahil, tüm ürünler bu fiyat olsun' })]),
      btn
    ]);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = sayi(inp.value);
      if (!n && /\d/.test(inp.value)) { bildir('Geçerli bir fiyat yazın.', true); return; }
      btn.disabled = true;
      try { await gonder({ islem: 'varsayilan', fiyat: n, sifirla: hepsi.checked }); bildir('Fiyatlar güncellendi.'); setTimeout(() => location.reload(), 600); }
      catch (err) { bildir(err.message, true); btn.disabled = false; }
    });
    pencere('Fiyat ayarı', [f]);
  }

  // ---------- silinenler: yanlışlıkla silineni geri al ----------
  async function silinenlerAc() {
    const [d, temel] = await Promise.all([tazeVeri(), fetch('/data/urunler.json').then((r) => r.json())]).catch(() => [{}, { urunler: [] }]);
    const hepsi = [...(d.yeni || []), ...temel.urunler];
    const liste = (d.silinen || []).map((id) => hepsi.find((u) => u.id === id)).filter(Boolean);
    const ul = el('ul', { class: 'duzen-silinen' });
    let geriAlindi = false;
    if (!liste.length) ul.append(el('li', { text: 'Silinen ürün yok.' }));
    liste.forEach((u) => {
      const g = el('button', { type: 'button', class: 'duzen-btn', text: 'Geri al' });
      g.addEventListener('click', async () => {
        g.disabled = true;
        try { await gonder({ islem: 'geri', id: u.id }); g.textContent = 'Geri alındı'; geriAlindi = true; bildir(`“${u.ad}” yeniden sitede.`); }
        catch (err) { bildir(err.message, true); g.disabled = false; }
      });
      const src = u.gorseller[0].startsWith('/assets/') ? u.gorseller[0].replace(/\.webp$/, '-400.webp') : u.gorseller[0];
      ul.append(el('li', {}, [el('img', { src, alt: '', width: '48', height: '60', loading: 'lazy' }), el('span', { text: u.ad }), g]));
    });
    // geri alınan ürünlerin listede görünmesi için kapatınca sayfa yenilenir
    pencere('Silinenler', [ul], () => { if (geriAlindi) location.reload(); });
  }

  // ---------- yeni ürün ----------
  const slug = (t) => t.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  function ekleAc() {
    if ($('.duzen-modal')) return;
    const m = el('div', { class: 'mb-giris duzen-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'duzen-ekle-baslik' });
    const f = el('form', { class: 'mb-giris__kutu duzen-form' });
    const g = (ad, etiket, girdi) => { girdi.name = ad; girdi.id = `duzen-${ad}`; return el('div', { class: 'duzen-satir' }, [el('label', { for: girdi.id, text: etiket }), girdi]); };
    f.append(
      el('h2', { id: 'duzen-ekle-baslik', text: 'Yeni ürün' }),
      g('ad', 'Ürün adı', el('input', { type: 'text', required: true, maxlength: '120' })),
      g('fiyat', 'Fiyat (TL)', el('input', { type: 'text', inputmode: 'decimal', value: '', placeholder: 'Belli değilse boş' })),
      g('kategori', 'Tür', el('select', {}, Object.entries(KATEGORI).map(([k, v]) => el('option', { value: k, text: v })))),
      g('cinsiyet', 'Kimin için', el('select', {}, Object.entries(CINSIYET).map(([k, v]) => el('option', { value: k, text: v })))),
      el('div', { class: 'duzen-ikili' }, [
        g('yas1', 'En küçük yaş', el('input', { type: 'number', min: '0', max: '18', inputmode: 'numeric' })),
        g('yas2', 'En büyük yaş', el('input', { type: 'number', min: '0', max: '18', inputmode: 'numeric' }))
      ]),
      g('kisa', 'Kart yazısı', el('input', { type: 'text', maxlength: '120', placeholder: 'ör. 2-5 yaş, yeni sezon' })),
      g('aciklama', 'Açıklama', el('textarea', { rows: '3', maxlength: '3000' })),
      g('kumas', 'Kumaş', el('input', { type: 'text', maxlength: '200' })),
      g('yikama', 'Yıkama', el('input', { type: 'text', maxlength: '200' })),
      g('foto', 'Fotoğraflar (en az bir)', el('input', { type: 'file', accept: 'image/*', multiple: true, required: true })),
      el('p', { class: 'mb-giris__hata', role: 'alert' }),
      el('div', { class: 'mb-giris__dugmeler' }, [el('button', { type: 'button', class: 'button mb-giris__vazgec', 'data-kapat': '', text: 'Vazgeç' }), el('button', { type: 'submit', class: 'button', text: 'Ekle' })])
    );
    m.append(f);
    const kapat = () => { m.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-kapat]')) kapat(); });
    const hata = f.querySelector('.mb-giris__hata'), btn = f.querySelector('[type="submit"]');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const dosyalar = [...f.querySelector('[name="foto"]').files];
      if (!dosyalar.length) { hata.textContent = 'En az bir fotoğraf seçin.'; return; }
      const id = `${slug(d.ad) || 'urun'}-${Date.now().toString(36)}`;
      btn.disabled = true; hata.textContent = '';
      try {
        const gorseller = [];
        for (const [i, dosya] of dosyalar.entries()) { btn.textContent = `Fotoğraf ${i + 1}/${dosyalar.length}…`; gorseller.push(await fotoYukle(dosya, id)); }
        btn.textContent = 'Kaydediliyor…';
        const y1 = d.yas1 === '' ? null : Number(d.yas1), y2 = d.yas2 === '' ? null : Number(d.yas2);
        await gonder({ islem: 'ekle', urun: {
          id, ad: d.ad, fiyat: sayi(d.fiyat), kategori: d.kategori, cinsiyet: d.cinsiyet, kisa: d.kisa, aciklama: d.aciklama, kumas: d.kumas, yikama: d.yikama, gorseller,
          yas_araligi: y1 == null || y2 == null ? null : [Math.min(y1, y2), Math.max(y1, y2)]
        } });
        location.href = `/urun?id=${encodeURIComponent(id)}`;
      } catch (err) { hata.textContent = err.message; btn.disabled = false; btn.textContent = 'Ekle'; }
    });
    document.body.append(m);
    f.querySelector('input').focus();
  }
})();
