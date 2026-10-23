// Mavi Boncuk — sayfa davranışları. Ürünler data/urunler.json, sayfa görselleri data/site.json içinden gelir.
(function () {
  const WA = '905057458364';
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
  const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  // Beden bulucuda girilen ölçü varsa ürün mesajına eklenir
  const olcu = () => { try { const o = JSON.parse(localStorage.getItem('mb-olcu') || 'null'); return o ? ` Çocuğumun boyu ${o.boy} cm, kilosu ${o.kilo} kg.` : ''; } catch (e) { return ''; } };
  // fiyatı henüz belli olmayan ürünlerde "-" yazar
  const tl = (n) => !n ? '- TL' : `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} TL`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // yerel fotoğrafların küçük boyları var (-400/-600.webp); yönetici modunda yüklenenlerin yok
  const boyut = (g, n) => (g.startsWith('/assets/') ? g.replace(/\.webp$/, `-${n}.webp`) : g);
  const yonetici = (() => { try { return localStorage.getItem('mb-admin') === '1'; } catch (e) { return false; } })();
  const img = (src, alt, w = 800, h = 1000, lazy = true) =>
    el('img', { src, alt, width: w, height: h, loading: lazy ? 'lazy' : null, decoding: 'async' });

  const YASLAR = [
    { id: 'hepsi', ad: 'Hepsi', min: 0, max: 16 },
    { id: '0-3', ad: '0-3 yaş', min: 0, max: 3 },
    { id: '4-8', ad: '4-8 yaş', min: 4, max: 8 },
    { id: '9-12', ad: '9-12 yaş', min: 9, max: 12 },
    { id: '13-16', ad: '13-16 yaş', min: 13, max: 16 }
  ];
  const TURLER = {
    hepsi: 'Hepsi', abiye: 'Abiye', 'takim-elbise': 'Takım elbise', gunluk: 'Günlük takımlar',
    okul: 'Okul', bebek: 'Bebek', aksesuar: 'Aksesuar'
  };

  // Ürün türlerinin minik simgeleri (lacivert kenarlı, logo renkleri)
  const IKON = {
    hepsi: '<circle cx="12" cy="12" r="9" fill="#2f6fd6"/><circle cx="12" cy="12" r="6" fill="#fff"/><circle cx="12" cy="12" r="3.5" fill="#7fe0dc"/><circle cx="12" cy="12" r="1.8" fill="#26357a"/>',
    abiye: '<path d="M9 3h6l-1 5 5 13H5l5-13z" fill="#f7a8c4" stroke="#26357a" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 13h8" stroke="#fff" stroke-width="1.4"/>',
    'takim-elbise': '<path d="M5 6l4-3 3 4 3-4 4 3v15H5z" fill="#a9c8ff" stroke="#26357a" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 9l2 2 2-2-2 4z" fill="#26357a"/>',
    gunluk: '<path d="M12 5a2 2 0 112 2l-2 2-9 7h18l-9-7" fill="none" stroke="#26357a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16h18v2H3z" fill="#7fe0dc"/>',
    okul: '<rect x="5" y="6" width="14" height="15" rx="3" fill="#ffd766" stroke="#26357a" stroke-width="1.6"/><path d="M9 6V4h6v2M5 12h14" stroke="#26357a" stroke-width="1.6"/>',
    bebek: '<path d="M6 13c0-4 3-7 7-7v7z" fill="#cdb8ff" stroke="#26357a" stroke-width="1.6"/><path d="M13 13h7a7 3 0 01-14 0" fill="#f7a8c4" stroke="#26357a" stroke-width="1.6"/><circle cx="9" cy="19" r="2" fill="#fff" stroke="#26357a" stroke-width="1.4"/><circle cx="17" cy="19" r="2" fill="#fff" stroke="#26357a" stroke-width="1.4"/>',
    aksesuar: '<path d="M4 10h16v10H4z" fill="#f7a8c4" stroke="#26357a" stroke-width="1.6"/><path d="M12 10v10M4 14h16M12 10c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1" stroke="#26357a" stroke-width="1.4" fill="none"/>'
  };
  const ikon = (k) => { const s = document.createElement('span'); s.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IKON[k] || IKON.hepsi}</svg>`; return s.firstChild; };

  // Yaş aralığı: [min, max]. Bilinmiyorsa her yaşta görünür.
  const yasUyar = (u, y) => {
    if (y.id === 'hepsi' || !u.yas_araligi) return true;
    const [a, b] = u.yas_araligi;
    return a <= y.max && b >= y.min;
  };
  const yasYazi = (u) => u.yas_yazi || (u.yas_araligi ? `${u.yas_araligi[0]}-${u.yas_araligi[1]} yaş` : '');
  const urunLink = (u) => (u.yeni ? `/urun?id=${encodeURIComponent(u.id)}` : `/urun/${encodeURIComponent(u.id)}`);

  // menüdeki ve kategori dairelerindeki süzgeçler (/#kiz gibi bağlantılarla gelir)
  const ESYA = /arabas|besik|beşik|kucag|kucağ|karyola|yurutec|yürüteç|mama-sandal/;
  const kesisir = (u, a, b) => !u.yas_araligi || (u.yas_araligi[0] <= b && u.yas_araligi[1] >= a);
  const indirimde = (u) => u.fiyat && u.eski_fiyat > u.fiyat;
  const OZEL = {
    bebek: { ad: 'Bebek 0-2 Yaş', f: (u) => u.kategori === 'bebek' || (!!u.yas_araligi && u.yas_araligi[0] <= 2) },
    kiz: { ad: 'Kız Çocuk', f: (u) => u.cinsiyet !== 'erkek' && !ESYA.test(u.id) && kesisir(u, 2, 10) },
    erkek: { ad: 'Erkek Çocuk', f: (u) => u.cinsiyet !== 'kiz' && !ESYA.test(u.id) && kesisir(u, 2, 10) },
    genc: { ad: 'Genç 10-16 Yaş', f: (u) => !!u.yas_araligi && u.yas_araligi[1] >= 10 && !ESYA.test(u.id) },
    yeni: { ad: 'Yeni Gelenler', f: () => true },
    indirim: { ad: 'İndirim', f: indirimde }
  };
  // son 30 günde eklenenler "Yeni" rozeti alır
  const yeniMi = (u) => !!u.tarih && Date.now() - Date.parse(u.tarih) < 30 * 864e5;
  const SEPET_IKON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 10.2a1 1 0 001 .8h8.9a1 1 0 001-.8L20 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>';
  const sepetBtn = (u, metin) => {
    const b = el('button', { type: 'button', class: 'sepete-ekle', 'data-sepet': u.id, disabled: u.durum === 'tükendi' });
    b.innerHTML = SEPET_IKON; b.append(u.durum === 'tükendi' ? 'Tükendi' : metin);
    return b;
  };

  function tile(u, i) {
    const a = el('a', { class: 'tile', href: urunLink(u), 'data-id': u.id });
    const f = el('div', { class: 'tile__frame' });
    const kucukSet = (g) => {
      const im = img(boyut(g, 600), '', 600, 750, true);
      if (g.startsWith('/assets/')) { im.srcset = `${boyut(g, 400)} 400w, ${boyut(g, 600)} 600w`; im.sizes = '(min-width: 75em) 22vw, (min-width: 48em) 31vw, 48vw'; }
      return im;
    };
    const ilk = kucukSet(u.gorseller[0]); ilk.alt = u.ad; if (i <= 3) ilk.removeAttribute('loading');
    f.append(ilk);
    if (u.gorseller[1]) f.append(kucukSet(u.gorseller[1]));
    // tek rozet, sol üstte: tükendi > indirim > yeni (sağ üst köşe beğen kalbinin)
    if (u.durum === 'tükendi') { a.classList.add('is-tukendi'); f.append(el('span', { class: 'tile__badge', text: 'Tükendi' })); }
    else if (indirimde(u)) f.append(el('span', { class: 'rozet rozet--indirim', text: 'İndirim' }));
    else if (yeniMi(u)) f.append(el('span', { class: 'rozet rozet--yeni', text: 'Yeni' }));
    if (u.gizle) { a.classList.add('is-gizli'); f.append(el('span', { class: 'tile__badge tile__badge--gizli', text: 'Gizli' })); }
    // yönetici modunda kartın kendi fiyatı data-kendi'de durur (düzenleme kutusu buradan okur);
    // kendi fiyatı olmayıp ortak fiyatla görünenler is-ortak ile işaretlenir
    const fiyatEl = el('span', { class: 'tile__fiyat', 'data-alan': 'fiyat', text: tl(u.fiyat) });
    if (yonetici) {
      fiyatEl.dataset.kendi = u.kendi_fiyat || '';
      if (!u.kendi_fiyat && u.ortak_fiyat) { fiyatEl.classList.add('is-ortak'); fiyatEl.dataset.ortak = '1'; }
    }
    const ust = el('span', { class: 'tile__ust' }, [
      u.eski_fiyat > u.fiyat ? el('s', { class: 'tile__eski', text: tl(u.eski_fiyat) }) : null,
      fiyatEl
    ]);
    a.append(f, el('span', { class: 'tile__name', text: u.ad }), el('span', { class: 'tile__fact', text: yasYazi(u) || u.kisa || TURLER[u.kategori] || '' }), ust);
    return el('div', { class: 'kart', 'data-id': u.id }, [a, sepetBtn(u, 'Sepete Ekle')]);
  }
  window.mbKart = tile;

  async function data() {
    // yönetici modundaki değişiklikler (eklenen, silinen, düzenlenen ürünler); gelmezse temel liste kullanılır
    const duzen = fetch(`/api/urunler${yonetici ? `?taze=${Date.now()}` : ''}`, yonetici ? { cache: 'no-store', credentials: 'same-origin' } : {})
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [u, s, d] = await Promise.all([
      fetch('/data/urunler.json').then((r) => r.json()),
      fetch('/data/site.json').then((r) => r.json()),
      duzen
    ]);
    // Mağazanın stok tablosu (Google E-Tablolar) varsa fiyat ve durum oradan gelir; yoksa sessizce atlanır
    let stok = {};
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 2500);
      stok = await fetch('/api/stok', { signal: c.signal }).then((r) => (r.ok ? r.json() : {}));
      clearTimeout(t);
    } catch (e) { stok = {}; }
    const dz = d || { guncel: {}, yeni: [], silinen: [] };
    const ortak = dz.ortak_fiyat || null;
    window.mbOrtakFiyat = ortak; // duzen.js kendi fiyatı silinince buna düşeceğini bilsin
    const silinen = dz.silinen || [];
    const birles = [...(dz.yeni || []).map((x) => ({ ...x, yeni: true })), ...u.urunler].filter((x) => !silinen.includes(x.id)).map((x) => {
      const s2 = stok[x.id];
      const y = s2 ? { ...x, fiyat: s2.fiyat || x.fiyat, durum: s2.durum || x.durum, stok_notu: s2.not || x.stok_notu, gizle: x.gizle || s2.durum === 'gizle' } : x;
      // fiyat yalnızca yönetici modunda girilir (tek tek ya da "Fiyat ayarı"ndan hepsine); yoksa "-" görünür
      const g = (dz.guncel || {})[x.id] || {};
      const z = { ...y, ...g };
      const kendi = x.yeni ? x.fiyat : g.fiyat;
      if (!kendi) z.eski_fiyat = null;
      // kendi_fiyat: bu ürüne ayrıca girilmiş fiyat. Yönetici modu bunu düzenler;
      // görünen fiyat (fiyat) kendi fiyatı yoksa ortak fiyattır, onun üstüne yazılmamalı.
      return { ...z, fiyat: kendi || ortak, kendi_fiyat: kendi || null, ortak_fiyat: ortak };
    });
    // yönetici gizlenen ürünleri de görür (soluk ve "Gizli" etiketli)
    return { urunler: birles.filter((x) => yonetici || !x.gizle), site: s };
  }

  // ---------- ana sayfa ----------
  function hero(site) {
    const names = $('#hero-names'), tileBox = $('#hero-tile'), fact = $('#hero-fact'), cta = $('#hero-cta');
    if (!names) return;
    const fields = ['var(--field-1)', 'var(--field-2)', 'var(--field-3)', 'var(--surface)'];
    const items = site.hero;
    let cur = 0, timer = null, frame = 0;
    const yukle = (im) => { if (im && im.dataset.src) { im.srcset = im.dataset.srcset; im.src = im.dataset.src; delete im.dataset.src; } };
    // sayfa yüklendikten sonra sıradaki fotoğrafı önceden indir
    const sonraki = () => setTimeout(() => yukle(tileBox.querySelectorAll('img')[1]), 2500);
    const show = (i) => {
      cur = i;
      const it = items[i];
      names.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      tileBox.style.backgroundColor = fields[i % fields.length];
      // ilk fotoğraf hemen, diğerleri sırası gelince iner (açılış hızı)
      const set = (g) => `${g.replace(/.webp$/, '-500.webp')} 500w, ${g.replace(/.webp$/, '-700.webp')} 700w, ${g} 1000w`;
      const ilk = tileBox.querySelector('img[data-statik]');
      tileBox.replaceChildren(...it.gorseller.map((g, j) => {
        if (i === 0 && j === 0 && ilk) { ilk.classList.add('is-on'); return ilk; }
        const im = img(j === 0 ? g : 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', j === 0 ? it.alt : '', 900, 1125, false);
        im.sizes = '(min-width: 60em) 30rem, 90vw';
        if (j === 0) { im.srcset = set(g); im.classList.add('is-on'); } else { im.dataset.src = g; im.dataset.srcset = set(g); }
        return im;
      }));
      fact.textContent = it.not;
      cta.href = waLink(`Merhaba, sitede ${it.ad.toLocaleLowerCase('tr')} bölümüne baktım. Elinizde neler var?${olcu()}`);
      cta.textContent = it.buton || 'WhatsApp’tan sor';
      frame = 0;
      if (document.readyState === 'complete') sonraki(); else addEventListener('load', sonraki, { once: true });
    };
    items.forEach((it, i) => {
      const b = el('button', { type: 'button', 'aria-pressed': 'false', text: it.ad });
      b.addEventListener('click', () => { show(i); b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' }); });
      names.append(b);
    });
    show(0);
    // imza hareketi: aynı karede fotoğraflar yavaşça yer değiştirir
    if (!reduced) {
      timer = setInterval(() => {
        if (document.hidden) return;
        const imgs = tileBox.querySelectorAll('img');
        if (imgs.length < 2) return;
        imgs[frame].classList.remove('is-on');
        frame = (frame + 1) % imgs.length;
        yukle(imgs[frame]); yukle(imgs[(frame + 1) % imgs.length]);
        imgs[frame].classList.add('is-on');
      }, 5500);
    }
  }

  function vitrin(urunler) {
    const box = $('#vitrin');
    if (!box) return;
    const iki = urunler.filter((u) => u.vitrin).slice(0, 2);
    const list = iki.length === 2 ? iki : urunler.slice(0, 2);
    list.forEach((u, i) => {
      const p = el('article', { class: 'showcase__panel' });
      if (i === 0) p.append(el('h2', { class: 'showcase__title', text: 'Bu hafta askıda' }));
      p.append(img(u.gorseller[0], u.ad, 1200, 1500, true));
      if (u.gorseller[0].startsWith('/assets/')) { p.lastChild.srcset = `${boyut(u.gorseller[0], 600)} 600w, ${u.gorseller[0]} 1200w`; p.lastChild.sizes = '(min-width: 60em) 50vw, 100vw'; }
      p.lastChild.className = 'showcase__img';
      const row = el('div', { class: 'showcase__row' }, [
        el('div', {}, [el('p', { class: 'showcase__name', text: u.ad }), el('p', { class: 'muted', text: u.kisa || yasYazi(u) })]),
        el('div', { class: 'showcase__actions' }, [
          el('a', { class: 'button', href: waLink(`Merhaba, “${u.ad}” için yazıyorum. Fiyatı ve bedenleri nedir?${olcu()}`), text: 'WhatsApp’tan sor' }),
          el('a', { class: 'button button--paper', href: urunLink(u), text: 'Fotoğraflar' })
        ])
      ]);
      p.append(row);
      box.append(p);
    });
  }

  function katalog(urunler) {
    const grid = $('#grid');
    if (!grid) return;
    const dividers = $('#dividers'), kinds = $('#kinds'), count = $('#cat-count'), more = $('#more');
    const PAGE = 24;
    let yas = YASLAR[0], tur = 'hepsi', shown = PAGE, ozel = null;
    const params = new URLSearchParams(location.search);
    if (params.get('yas')) yas = YASLAR.find((y) => y.id === params.get('yas')) || yas;
    if (params.get('tur') && TURLER[params.get('tur')]) tur = params.get('tur');
    const hashOzel = () => { const h = decodeURIComponent(location.hash.slice(1)); return OZEL[h] ? h : null; };
    ozel = hashOzel();
    const cip = $('#filtre-cip');
    const kaydir = () => $('#askidakiler').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    // menü, daireler ve koleksiyon kartları buradan süzer; aynı sayfada kalır
    window.mbFiltre = (k, git = true) => {
      ozel = OZEL[k] ? k : null;
      if (ozel) { yas = YASLAR[0]; tur = 'hepsi'; q = ''; if (ara) ara.value = ''; }
      shown = PAGE; draw();
      if (git) kaydir();
    };
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-filtre]');
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      window.mbFiltre(a.dataset.filtre);
    });
    addEventListener('hashchange', () => { const h = hashOzel(); if (h) window.mbFiltre(h); });

    const mevcutTurler = ['hepsi', ...Object.keys(TURLER).filter((k) => k !== 'hepsi' && urunler.some((u) => u.kategori === k))];
    YASLAR.forEach((y) => {
      const b = el('button', { type: 'button', class: 'divider', 'aria-pressed': String(y === yas), text: y.ad, style: `--n:${YASLAR.indexOf(y)}` });
      b.addEventListener('click', () => { yas = y; shown = PAGE; draw(); });
      dividers.append(b);
    });
    mevcutTurler.forEach((k) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(k === tur), 'data-k': k }, [ikon(k), TURLER[k]]);
      b.addEventListener('click', () => { tur = k; shown = PAGE; draw(); });
      kinds.append(b);
    });
    more.addEventListener('click', () => { shown += PAGE; draw(); });
    // arama: ad, açıklama ve türde geçen kelimeler (Türkçe harf duyarsız)
    const ara = $('#ara');
    const norm = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
    let q = '';
    // üstteki arama kutusundan /?q= ile gelinir
    if (ara && params.get('q')) { ara.value = params.get('q'); q = norm(ara.value.trim()); ozel = null; }
    if (ara) {
      let zam;
      ara.addEventListener('input', () => { clearTimeout(zam); zam = setTimeout(() => { q = norm(ara.value.trim()); shown = PAGE; draw(); }, 160); });
    }
    // beden bulucu ve alt çubuk buradan yaş seçer
    window.mbYasSec = (id) => {
      const y = YASLAR.find((x) => x.id === id); if (!y) return;
      yas = y; shown = PAGE; draw();
      $('#askidakiler').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    };

    function draw() {
      dividers.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(YASLAR[i] === yas)));
      kinds.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === tur)));
      const kelimeler = q ? q.split(/\s+/) : [];
      let list = urunler.filter((u) => yasUyar(u, yas) && (tur === 'hepsi' || u.kategori === tur) && (!ozel || OZEL[ozel].f(u)) &&
        (!kelimeler.length || kelimeler.every((k) => norm(`${u.ad} ${u.aciklama} ${TURLER[u.kategori]} ${u.kisa}`).includes(k))));
      if (ozel === 'yeni') list = list.filter((u) => u.tarih || u.yeni).sort((p, r) => String(r.tarih || '9').localeCompare(String(p.tarih || '9'))).slice(0, 12);
      grid.replaceChildren(...list.slice(0, shown).map((u, i) => {
        const t = tile(u, i);
        if (i < 16) { t.classList.add('is-drop'); t.style.setProperty('--i', i); }
        return t;
      }));
      if (!list.length) {
        const aranan = ara && ara.value.trim();
        const metin = aranan ? `“${aranan}” şu an sitede yok, ama dükkânda olabilir. Sitede her ürünü göstermiyoruz.`
          : ozel === 'indirim' ? 'Şu an indirimde ürün yok. İndirim başlayınca sitenin üstündeki duyuruda ve Instagram’da yazıyoruz.'
          : 'Bu yaşta bu türden şu an sitede ürün yok. Bize yazın, dükkânda olanı söyleyelim.';
        grid.append(el('div', { class: 'catalogue__empty' }, [
          el('p', { text: metin }),
          el('a', { class: 'button', style: 'margin-top:1rem', href: waLink(aranan ? `Merhaba, sitede “${aranan}” aradım, bulamadım. Elinizde var mı?${olcu()}` : `Merhaba, ${ozel ? OZEL[ozel].ad : yas.ad} için elinizde neler var?${olcu()}`), text: 'WhatsApp’tan sor' })
        ]));
      }
      count.textContent = `${list.length} ürün` + (yas.id !== 'hepsi' ? `, ${yas.ad}` : '');
      more.hidden = list.length <= shown;
      if (cip) {
        cip.replaceChildren();
        if (ozel) {
          const b = el('button', { type: 'button', class: 'filtre-cip', 'aria-label': `${OZEL[ozel].ad} süzgecini kaldır` }, [OZEL[ozel].ad, el('span', { 'aria-hidden': 'true', text: '×' })]);
          b.addEventListener('click', () => window.mbFiltre(null, false));
          cip.append(b);
        }
      }
      document.querySelectorAll('.kat-nav a[data-filtre]').forEach((a) => (a.dataset.filtre === ozel ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
      const u = new URL(location.href);
      yas.id === 'hepsi' ? u.searchParams.delete('yas') : u.searchParams.set('yas', yas.id);
      tur === 'hepsi' ? u.searchParams.delete('tur') : u.searchParams.set('tur', tur);
      if (!q) u.searchParams.delete('q');
      u.hash = ozel ? ozel : (OZEL[u.hash.slice(1)] ? '' : u.hash);
      history.replaceState(null, '', u);
    }
    draw();
    // başka sayfadan /#kiz ya da /?q= ile gelindiyse: üstteki görseller yerleşince listeye in (yumuşak kaydırma yükleme sırasında kesiliyor)
    if (ozel || params.get('q')) {
      const in_ = () => $('#askidakiler').scrollIntoView({ behavior: 'auto' });
      if (document.readyState === 'complete') setTimeout(in_, 60); else addEventListener('load', () => setTimeout(in_, 60), { once: true });
    }
  }

  function seritler(site) {
    const strip = $('#strip');
    if (strip) {
      site.kareler.forEach((k) => {
        const a = el('a', { href: k.instagram, rel: 'noopener', 'aria-label': k.alt });
        a.append(img(k.src, '', 400, 600));
        strip.append(a);
      });
      $('#strip-count').textContent = `(${site.kareler.length})`;
    }
    document.querySelectorAll('[data-step]').forEach((im) => {
      const s = site.adimlar[+im.dataset.step];
      if (s) { im.src = s.src; im.alt = s.alt; }
    });
    const shop = $('#shop');
    if (shop) site.dukkan.forEach((d) => {
      shop.append(el('li', { class: 'shop__item' }, [
        el('figure', {}, [img(d.src, d.alt, 600, 750)]),
        el('h3', { text: d.ad }),
        el('p', { text: d.not })
      ]));
    });
  }

  function yorumlar() {
    const ul = $('#reviews');
    if (!ul) return;
    fetch('/data/yorumlar.json').then((r) => r.json()).then((d) => {
      const muhur = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3l6 6 8-2 3 8 8 3-2 8 6 6-6 6 2 8-8 3-3 8-8-2-6 6-6-6-8 2-3-8-8-3 2-8-6-6 6-6-2-8 8-3 3-8 8 2z" fill="#ffcf4a" stroke="#c98a00" stroke-width="2"/><circle cx="32" cy="32" r="15" fill="#ffe08a" stroke="#c98a00" stroke-width="1.5"/><path d="M25 32l5 5 9-10" stroke="#26357a" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path class="shine" d="M50 10l1.5 3.5L55 15l-3.5 1.5L50 20l-1.5-3.5L45 15l3.5-1.5z" fill="#fff"/></svg>';
      const tek = (y, gizli) => {
        const li = el('li', { 'aria-hidden': gizli ? 'true' : null });
        const a = el('a', { class: 'bubble', href: y.instagram, rel: 'noopener', tabindex: gizli ? '-1' : null }, [
          el('blockquote', { text: `“${y.metin}”` }),
          el('p', { text: `${y.baglam} · Instagram’dan gerçek yorum` })
        ]);
        const m = el('span', { class: 'seal', title: 'Instagram’dan gerçek yorum' }); m.innerHTML = muhur; a.append(m);
        li.append(a);
        return li;
      };
      // kesintisiz kayma için liste iki kez yazılır; ikinci kopya ekran okuyucudan gizli
      d.yorumlar.forEach((y) => ul.append(tek(y, false)));
      d.yorumlar.forEach((y) => ul.append(tek(y, true)));
      ul.style.setProperty('--dur', `${d.yorumlar.length * 8}s`);
    }).catch(() => {});
  }

  function sonYazilar() {
    const ul = $('#latest');
    if (!ul) return;
    fetch(`/api/blog?format=json&adet=${ul.dataset.kategori ? 6 : 3}${ul.dataset.kategori ? `&kategori=${ul.dataset.kategori}` : ''}`).then((r) => r.json()).then((list) => {
      if (!list.length) { ul.closest('section').hidden = true; return; }
      const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const t = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${AY[m - 1]}`; };
      list.forEach((y) => ul.append(el('li', {}, [el('a', { href: `/blog/${y.slug}` }, [
        el('span', { class: 'latest__date', text: t(y.tarih) }), el('h3', { text: y.baslik }), el('p', { text: y.ozet })
      ])])));
    }).catch(() => { ul.closest('section').hidden = true; });
  }

  function sorular() {
    const btns = document.querySelectorAll('.card button');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((o) => {
        const open = o === b;
        o.setAttribute('aria-expanded', String(open));
        document.getElementById(o.getAttribute('aria-controls')).hidden = !open;
      });
    }));
  }

  function form() {
    const f = $('#wa-form');
    if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const satirlar = ['Merhaba,'];
      if (d.ad) satirlar.push(`Ben ${d.ad}.`);
      if (d.yas) satirlar.push(`Çocuğum ${d.yas}.`);
      if (d.boy) satirlar.push(`Boyu/kilosu: ${d.boy}.`);
      satirlar.push(d.ne ? `Aradığım: ${d.ne}` : 'Elinizde neler var, bakabilir miyim?');
      window.open(waLink(satirlar.join('\n')), '_blank', 'noopener');
    });
  }

  // ---------- ürün sayfası ----------
  function urunSayfasi(urunler) {
    const root = $('#urun');
    if (!root) return;
    const id = root.dataset.id || new URLSearchParams(location.search).get('id') || (location.pathname.match(/^\/urun\/([^/]+)/) || [])[1];
    const u = urunler.find((x) => x.id === id);
    if (!u) {
      root.replaceChildren(el('div', { class: 'product' }, [el('div', {}, [
        el('h1', { class: 'head', text: 'Bu ürün artık askıda değil' }),
        el('p', { class: 'lead', text: 'Satılmış ya da kaldırılmış olabilir. Benzerini sormak isterseniz yazın.' }),
        el('p', { style: 'margin-top:1.5rem' }, [el('a', { class: 'button', href: waLink('Merhaba, sitede baktığım bir ürün kalkmış. Benzeri var mı?'), text: 'WhatsApp’tan sor' })])
      ])]));
      return;
    }
    document.title = `${u.ad} · Mavi Boncuk`;
    const main = el('div', { class: 'product__main' }, [img(u.gorseller[0], u.ad, 1200, 1500, false)]);
    const thumbs = el('div', { class: 'product__thumbs', role: 'group', 'aria-label': 'Fotoğraflar' });
    u.gorseller.forEach((g, i) => {
      const b = el('button', { type: 'button', 'aria-current': String(i === 0), 'aria-label': `${i + 1}. fotoğraf` }, [img(g, '', 120, 150)]);
      b.addEventListener('click', () => {
        main.firstChild.src = g;
        thumbs.querySelectorAll('button').forEach((o) => o.setAttribute('aria-current', String(o === b)));
      });
      thumbs.append(b);
    });
    const bilinmiyor = 'Yazın, bakıp söyleyelim';
    // data-alan: yönetici modunda (duzen.js) bu metinler yerinde düzenlenir
    const satir = (k, v, alan) => el('div', {}, [el('dt', { text: k }), el('dd', { 'data-alan': alan, text: v || bilinmiyor })]);
    const facts = el('dl', { class: 'facts' }, [
      satir('Yaş', u.yas_yazi || ((u.yas_tahmini && u.yas_araligi ? 'Yaklaşık ' : '') + yasYazi(u)) || (u.bedenler && u.bedenler.length ? u.bedenler.map((b) => b.beden).join(', ') : null), 'yas_yazi'),
      satir('Fiyat', tl(u.fiyat), 'fiyat'),
      satir('Kumaş', u.kumas, 'kumas'),
      satir('Yıkama', u.yikama, 'yikama'),
      satir('Stok', u.durum === 'tükendi' ? 'Şu an tükendi, gelince haber verelim' : u.stok_notu, 'stok_notu'),
      satir('Teslim', u.teslim || 'Mağazadan alabilir ya da gönderim için yazabilirsiniz', 'teslim'),
      satir('Değişim', u.degisim || 'Almadan önce sorun, ürüne göre söylüyoruz', 'degisim')
    ]);
    facts.children[1].lastChild.className = 'price';
    // yönetici modu: kendi fiyatı data-kendi'de; ortak fiyatla görünüyorsa işaretli
    if (yonetici) {
      const fd = facts.children[1].lastChild;
      fd.dataset.kendi = u.kendi_fiyat || '';
      if (!u.kendi_fiyat && u.ortak_fiyat) { fd.classList.add('is-ortak'); fd.dataset.ortak = '1'; }
    }
    // indirim: eski fiyat düzenlenen alanın dışında (başlığın yanında) üstü çizili durur
    if (u.eski_fiyat > u.fiyat) facts.children[1].firstChild.append(' ', el('s', { class: 'eski-fiyat', text: tl(u.eski_fiyat) }));
    const info = el('div', { class: 'product__info' }, [
      el('h1', { 'data-alan': 'ad', text: u.ad }),
      el('p', { class: 'lead', 'data-alan': 'aciklama', text: u.aciklama || '' }),
      facts,
      el('div', { class: 'product__cta' }, [
        u.durum === 'tükendi'
          ? el('a', { class: 'button', 'data-stok-talep': u.id, href: waLink(`Merhaba, “${u.ad}” (${location.href}) tükenmiş görünüyor. Gelince haber verir misiniz?${olcu()}`), text: 'Gelince haber ver' })
          : (() => { const b = sepetBtn(u, 'Sepete ekle'); b.classList.add('button'); return b; })(),
        // data-wa-urun: vitrin.js beden/soru seçeneklerini açar; o yüklenmeden dokunulursa doğrudan WhatsApp açılır
        u.durum === 'tükendi' ? null : el('a', { class: 'button button--paper', 'data-wa-urun': u.id, href: waLink(`Merhaba, “${u.ad}” için yazıyorum (${location.href}). Fiyatı ve bedenleri nedir?${olcu()}`), text: 'WhatsApp’tan sor' }),
        el('button', { class: 'button button--paper begen-btn', type: 'button', 'data-begen': u.id, 'aria-pressed': 'false', text: 'Favorilere ekle' }),
        el('a', { class: 'button button--paper gift-note', href: waLink(`Merhaba, “${u.ad}” ürününü hediye olarak almak istiyorum (${location.href}). Hediye notu eklemek istiyorum: `), text: 'Hediye notu ekle' }),
        u.instagram ? el('a', { class: 'button button--paper', href: u.instagram, rel: 'noopener', text: 'Instagram’da gör' }) : null
      ])
    ]);
    root.replaceChildren(el('div', { class: 'product' }, [el('div', { class: 'product__media' }, [main, thumbs]), info]));
    // duzen.js sonradan yüklenirse ürünü buradan alır
    window.mbUrun = u;
    document.dispatchEvent(new CustomEvent('mb:urun', { detail: u }));

    const benzer = urunler.filter((x) => x.id !== u.id && x.kategori === u.kategori).slice(0, 8);
    if (benzer.length) {
      const sec = el('section', { class: 'catalogue', style: 'padding-top:0' }, [
        el('h2', { class: 'head', text: 'Yanında bunlar da var', style: 'margin-bottom:2rem' }),
        el('div', { class: 'grid-tiles' }, benzer.map((x, i) => tile(x, i + 4)))
      ]);
      root.append(sec);
    }
  }


  // imleç takibi ve imlece göre eğilen kartlar (yalnızca fareyle, hareket azaltılmamışsa)
  function hareket() {
    // İmleç tarayıcının kendi imleci (CSS, gecikmesiz). Burada yalnızca kartların imlece göre eğilmesi var:
    // tek pointermove dinleyicisi, kare başına tek yazma, ölçüm kart başına bir kez.
    if (reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    // mağaza görünümünde (2026-10-19) ürün kartları eğilmez; yalnızca eski bölümler
    const SEL = ".shop__item figure, .hero__tile, .strip__row a, .showcase__panel";
    let x = 0, y = 0, queued = false, cur = null, rect = null, imgs = [], big = 8;
    const reset = (n) => {
      n.classList.remove("is-tilting");
      n.style.transform = "";
      for (const i of n.querySelectorAll("img")) i.style.transform = "";
    };
    const paint = () => {
      queued = false;
      if (!cur) return;
      if (!rect) { rect = cur.getBoundingClientRect(); big = rect.width > 700 ? 3 : 8; }
      const px = (x - rect.left) / rect.width - 0.5, py = (y - rect.top) / rect.height - 0.5;
      // imlecin bulunduğu köşe içeri basar, karşı köşe öne gelir
      cur.style.transform = `perspective(900px) rotateX(${(py * big).toFixed(2)}deg) rotateY(${(-px * big).toFixed(2)}deg) scale(1.015)`;
      const t = `translate3d(${(-px * 12).toFixed(1)}px, ${(-py * 12).toFixed(1)}px, 0) scale(1.05)`;
      for (const i of imgs) i.style.transform = t;
    };
    addEventListener("pointermove", (e) => {
      if (!cur) return;
      x = e.clientX; y = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
    addEventListener("scroll", () => { rect = null; }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      const n = e.target.closest(SEL);
      if (n === cur) return;
      if (cur) reset(cur);
      cur = n; rect = null;
      imgs = n ? [...n.querySelectorAll("img")] : [];
      if (n) n.classList.add("is-tilting");
    });
  }

  document.querySelectorAll('[data-wa]').forEach((a) => {
    if (!a.href.includes('text=')) a.href = waLink('Merhaba, sitenizden yazıyorum.');
  });
  // ilk ekran (hero) hemen; aşağıdaki bölümler tarayıcı boşalınca çizilir ki ilk görüntü gecikmesin
  const sonra = (f) => ('requestIdleCallback' in window ? requestIdleCallback(() => f(), { timeout: 1200 }) : setTimeout(f, 200));
  sorular();
  form();
  hareket();
  sonra(() => { yorumlar(); sonYazilar(); });
  const veri = data();
  // ek.js (beğendiklerim, kombinler) ve duzen.js aynı birleşik listeyi kullanır
  window.mbUrunler = veri.then((v) => v.urunler);
  veri.then(({ urunler, site }) => {
    hero(site);
    urunSayfasi(urunler);
    // hazır (statik) kategori ve özel gün sayfalarındaki kartlarda da yönetici modunda girilen fiyat görünsün
    document.querySelectorAll('a.tile[data-id] .tile__fiyat').forEach((f) => {
      const u = urunler.find((x) => x.id === f.closest('a.tile').dataset.id);
      if (u) f.textContent = tl(u.fiyat);
    });
    sonra(() => { vitrin(urunler); katalog(urunler); seritler(site); });
  }).catch(() => {
    const g = $('#grid') || $('#urun');
    if (g) g.append(el('p', { text: 'Ürünler yüklenemedi. Sayfayı yenileyin ya da Instagram’dan bakın: @maviboncuk_ortaca' }));
  });
})();
