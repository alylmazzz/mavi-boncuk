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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  // Yaş aralığı: [min, max]. Bilinmiyorsa her yaşta görünür.
  const yasUyar = (u, y) => {
    if (y.id === 'hepsi' || !u.yas_araligi) return true;
    const [a, b] = u.yas_araligi;
    return a <= y.max && b >= y.min;
  };
  const yasYazi = (u) => (u.yas_araligi ? `${u.yas_araligi[0]}-${u.yas_araligi[1]} yaş` : '');

  function tile(u, i) {
    const a = el('a', { class: 'tile', href: `/urun?id=${encodeURIComponent(u.id)}` });
    const f = el('div', { class: 'tile__frame' });
    f.append(img(u.gorseller[0], u.ad, 800, 1000, i > 3));
    if (u.gorseller[1]) f.append(img(u.gorseller[1], '', 800, 1000, true));
    a.append(f, el('span', { class: 'tile__name', text: u.ad }), el('span', { class: 'tile__fact', text: u.kisa || yasYazi(u) || TURLER[u.kategori] }));
    return a;
  }

  async function data() {
    const [u, s] = await Promise.all([
      fetch('/data/urunler.json').then((r) => r.json()),
      fetch('/data/site.json').then((r) => r.json())
    ]);
    return { urunler: u.urunler.filter((x) => !x.gizle), site: s };
  }

  // ---------- ana sayfa ----------
  function hero(site) {
    const names = $('#hero-names'), tileBox = $('#hero-tile'), fact = $('#hero-fact'), cta = $('#hero-cta');
    if (!names) return;
    const fields = ['var(--field-1)', 'var(--field-2)', 'var(--field-3)', 'var(--surface)'];
    const items = site.hero;
    let cur = 0, timer = null, frame = 0;
    const show = (i) => {
      cur = i;
      const it = items[i];
      names.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      tileBox.style.backgroundColor = fields[i % fields.length];
      tileBox.replaceChildren(...it.gorseller.map((g, j) => {
        const im = img(g, j === 0 ? it.alt : '', 900, 1125, i !== 0 || j !== 0);
        if (j === 0) im.classList.add('is-on');
        return im;
      }));
      fact.textContent = it.not;
      cta.href = waLink(`Merhaba, sitede ${it.ad.toLocaleLowerCase('tr')} bölümüne baktım. Elinizde neler var?`);
      cta.textContent = it.buton || 'WhatsApp’tan sor';
      frame = 0;
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
        imgs[frame].loading = 'eager';
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
      p.lastChild.className = 'showcase__img';
      const row = el('div', { class: 'showcase__row' }, [
        el('div', {}, [el('p', { class: 'showcase__name', text: u.ad }), el('p', { class: 'muted', text: u.kisa || yasYazi(u) })]),
        el('div', { class: 'showcase__actions' }, [
          el('a', { class: 'button', href: waLink(`Merhaba, “${u.ad}” için yazıyorum. Fiyatı ve bedenleri nedir?`), text: 'WhatsApp’tan sor' }),
          el('a', { class: 'button button--paper', href: `/urun?id=${encodeURIComponent(u.id)}`, text: 'Fotoğraflar' })
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
    let yas = YASLAR[0], tur = 'hepsi', shown = PAGE;
    const params = new URLSearchParams(location.search);
    if (params.get('yas')) yas = YASLAR.find((y) => y.id === params.get('yas')) || yas;
    if (params.get('tur') && TURLER[params.get('tur')]) tur = params.get('tur');

    const mevcutTurler = ['hepsi', ...Object.keys(TURLER).filter((k) => k !== 'hepsi' && urunler.some((u) => u.kategori === k))];
    YASLAR.forEach((y) => {
      const b = el('button', { type: 'button', class: 'divider', 'aria-pressed': String(y === yas), text: y.ad });
      b.addEventListener('click', () => { yas = y; shown = PAGE; draw(); });
      dividers.append(b);
    });
    mevcutTurler.forEach((k) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(k === tur), text: TURLER[k], 'data-k': k });
      b.addEventListener('click', () => { tur = k; shown = PAGE; draw(); });
      kinds.append(b);
    });
    more.addEventListener('click', () => { shown += PAGE; draw(); });

    function draw() {
      dividers.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(YASLAR[i] === yas)));
      kinds.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === tur)));
      const list = urunler.filter((u) => yasUyar(u, yas) && (tur === 'hepsi' || u.kategori === tur));
      grid.replaceChildren(...list.slice(0, shown).map((u, i) => {
        const t = tile(u, i);
        if (i % 7 === 3) t.classList.add('tile--wide');
        if (i < 16) { t.classList.add('is-new'); t.style.setProperty('--i', i); }
        return t;
      }));
      if (!list.length) grid.append(el('p', { class: 'catalogue__empty', text: 'Bu yaşta bu türden şu an sitede ürün yok. Bize yazın, dükkânda olanı söyleyelim.' }));
      count.textContent = `${list.length} ürün` + (yas.id !== 'hepsi' ? `, ${yas.ad}` : '');
      more.hidden = list.length <= shown;
      const u = new URL(location.href);
      yas.id === 'hepsi' ? u.searchParams.delete('yas') : u.searchParams.set('yas', yas.id);
      tur === 'hepsi' ? u.searchParams.delete('tur') : u.searchParams.set('tur', tur);
      history.replaceState(null, '', u);
    }
    draw();
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
      d.yorumlar.forEach((y) => ul.append(el('li', { class: 'review' }, [
        el('a', { href: y.instagram, rel: 'noopener' }, [
          el('blockquote', { text: `“${y.metin}”` }),
          el('p', { text: y.baglam })
        ])
      ])));
    }).catch(() => {});
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
    const id = new URLSearchParams(location.search).get('id');
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
    const satir = (k, v) => el('div', {}, [el('dt', { text: k }), el('dd', { text: v || bilinmiyor })]);
    const fiyat = u.fiyat ? `${u.fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : null;
    const facts = el('dl', { class: 'facts' }, [
      satir('Yaş', (u.yas_tahmini && u.yas_araligi ? 'Yaklaşık ' : '') + yasYazi(u) || (u.bedenler && u.bedenler.length ? u.bedenler.map((b) => b.beden).join(', ') : null)),
      satir('Fiyat', fiyat),
      satir('Kumaş', u.kumas),
      satir('Yıkama', u.yikama),
      satir('Stok', u.stok_notu),
      satir('Teslim', 'Mağazadan alabilir ya da gönderim için yazabilirsiniz'),
      satir('Değişim', 'Almadan önce sorun, ürüne göre söylüyoruz')
    ]);
    if (fiyat) facts.children[1].lastChild.className = 'price';
    const info = el('div', { class: 'product__info' }, [
      el('h1', { text: u.ad }),
      el('p', { class: 'lead', text: u.aciklama }),
      facts,
      el('div', { class: 'product__cta' }, [
        el('a', { class: 'button', href: waLink(`Merhaba, “${u.ad}” için yazıyorum (${location.href}). Fiyatı ve bedenleri nedir?`), text: 'WhatsApp’tan sor' }),
        u.instagram ? el('a', { class: 'button button--paper', href: u.instagram, rel: 'noopener', text: 'Instagram’da gör' }) : null
      ])
    ]);
    root.replaceChildren(el('div', { class: 'product' }, [el('div', { class: 'product__media' }, [main, thumbs]), info]));

    const benzer = urunler.filter((x) => x.id !== u.id && x.kategori === u.kategori).slice(0, 8);
    if (benzer.length) {
      const sec = el('section', { class: 'catalogue', style: 'padding-top:0' }, [
        el('h2', { class: 'head', text: 'Yanında bunlar da var', style: 'margin-bottom:2rem' }),
        el('div', { class: 'grid-tiles' }, benzer.map(tile))
      ]);
      root.append(sec);
    }
  }


  // imleç takibi ve imlece göre eğilen kartlar (yalnızca fareyle, hareket azaltılmamışsa)
  function hareket() {
    if (reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const dot = el("div", { class: "cursor", "aria-hidden": "true" });
    document.body.append(dot);
    let x = 0, y = 0, cx = 0, cy = 0;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; dot.classList.add("is-on"); }, { passive: true });
    document.addEventListener("pointerleave", () => dot.classList.remove("is-on"));
    (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; dot.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); })();

    const SEL = ".tile__frame, .shop__item figure, .hero__tile, .step__tile, .strip__row a, .showcase__panel, .product__main";
    let cur = null;
    const reset = (n) => { n.style.transform = ""; const im = n.querySelector("img.is-on, img"); n.querySelectorAll("img").forEach((i) => (i.style.transform = "")); };
    document.addEventListener("pointerover", (e) => {
      const n = e.target.closest(SEL);
      if (n === cur) return;
      if (cur) reset(cur);
      cur = n;
      if (n) { n.setAttribute("data-tilt", ""); dot.classList.add("is-big"); } else dot.classList.remove("is-big");
      const a = e.target.closest("a, button");
      if (a && !n) dot.classList.add("is-big");
    });
    document.addEventListener("pointermove", (e) => {
      if (!cur) return;
      const r = cur.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      const big = r.width > 700 ? 3 : 8; // büyük panellerde daha az
      // imlecin bulunduğu köşe içeri basar, karşı köşe öne gelir
      cur.style.transform = `perspective(900px) rotateX(${(py * big).toFixed(2)}deg) rotateY(${(-px * big).toFixed(2)}deg) scale(1.015)`;
      cur.querySelectorAll("img").forEach((i) => (i.style.transform = `translate(${(-px * 14).toFixed(1)}px, ${(-py * 14).toFixed(1)}px) scale(1.06)`));
    }, { passive: true });
  }

  document.querySelectorAll('[data-wa]').forEach((a) => {
    if (!a.href.includes('text=')) a.href = waLink('Merhaba, sitenizden yazıyorum.');
  });
  sorular();
  yorumlar();
  form();
  hareket();
  data().then(({ urunler, site }) => {
    hero(site);
    vitrin(urunler);
    katalog(urunler);
    seritler(site);
    urunSayfasi(urunler);
  }).catch(() => {
    const g = $('#grid') || $('#urun');
    if (g) g.append(el('p', { text: 'Ürünler yüklenemedi. Sayfayı yenileyin ya da Instagram’dan bakın: @maviboncuk_ortaca' }));
  });
})();
