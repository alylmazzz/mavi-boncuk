// Mavi Boncuk — mağaza görünümü: üstteki arama, kayan afiş, çok satanlar, sepet, favoriler, hesabım ve bülten.
// Üyelik yok: sepet (mb-sepet), favoriler (mb-begen, ek.js ile ortak) ve sipariş mesajları (mb-siparisler) bu cihazda saklanır.
// Sipariş WhatsApp mesajıyla tamamlanır; ödeme altyapısı (PayTR) gelince "Siparişi gönder" adımı oraya bağlanır.
(function () {
  const WA = '905057458364';
  const KARGO_ESIK = 300; // TL; data/magaza.json "ucretsiz_kargo_siniri" ile aynı
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v; else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of [].concat(kids)) if (k) n.append(k);
    return n;
  };
  const waLink = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  const store = {
    get: (k, v) => { try { const x = JSON.parse(localStorage.getItem(k) || 'null'); return x == null ? v : x; } catch (e) { return v; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* gizli pencere */ } }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = document.documentElement.lang || 'tr';
  const DIL = lang === 'tr' ? '' : '/' + lang;
  const tl = (n) => (!n ? '- TL' : `${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} TL`);
  const kucuk = (u) => (u.gorseller[0].startsWith('/assets/') ? u.gorseller[0].replace(/\.webp$/, '-400.webp') : u.gorseller[0]);
  const yasYazi = (u) => u.yas_yazi || (u.yas_araligi ? `${u.yas_araligi[0]}-${u.yas_araligi[1]} yaş` : '');
  const urunUrl = (u) => (u.yeni ? `/urun?id=${encodeURIComponent(u.id)}` : `${DIL}/urun/${encodeURIComponent(u.id)}`);
  const olcu = () => { const o = store.get('mb-olcu', null); return o ? ` Çocuğumun boyu ${o.boy} cm, kilosu ${o.kilo} kg.` : ''; };
  const norm = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
  const IKON = {
    sepet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    kalp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>',
    kisi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
  };

  // ürün listesi: site.js yönetici değişiklikleri uygulanmış listeyi verir
  let liste = null;
  const urunler = () => liste || (liste = (window.mbUrunler || fetch('/data/urunler.json').then((r) => r.json()).then((d) => d.urunler.filter((u) => !u.gizle))).catch(() => []));
  const bul = (tum, id) => tum.find((u) => u.id === id);

  // ---------- sayaçlar ----------
  const sepet = () => store.get('mb-sepet', []).filter((x) => x && x.id && x.adet > 0);
  const sepetYaz = (l) => { store.set('mb-sepet', l); sayac(); };
  const favoriler = () => { const l = store.get('mb-begen', []); return Array.isArray(l) ? l : []; };
  function sayac() {
    const s = sepet().reduce((t, x) => t + x.adet, 0), f = favoriler().length;
    document.querySelectorAll('[data-sayi="sepet"]').forEach((b) => { b.textContent = s; });
    document.querySelectorAll('[data-sayi="favori"]').forEach((b) => { b.textContent = f; b.hidden = !f; });
  }
  sayac();
  document.addEventListener('mb:begen', sayac);
  addEventListener('storage', (e) => { if (e.key === 'mb-sepet' || e.key === 'mb-begen') { sayac(); if (acik) acik.ciz(); } });

  // ---------- bildirim balonu ----------
  let toastZaman;
  function toast(metin, dugme, f) {
    $('.toast') && $('.toast').remove();
    const t = el('div', { class: 'toast', role: 'status' }, [el('span', { text: metin })]);
    if (dugme) { const b = el('button', { type: 'button', text: dugme }); b.addEventListener('click', () => { t.remove(); f(); }); t.append(b); }
    document.body.append(t);
    clearTimeout(toastZaman); toastZaman = setTimeout(() => t.remove(), 3800);
  }

  // ---------- çekmece (sağdan açılan panel) ----------
  let acik = null;
  function cekmece(baslik, ikon, ciz) {
    if (acik) acik.kapat(true);
    const once = document.activeElement;
    const ort = el('div', { class: 'cekmece-ort' });
    const kapatBtn = el('button', { type: 'button', class: 'cekmece__kapat', 'aria-label': 'Kapat', text: '×' });
    const govde = el('div', { class: 'cekmece__govde' }), alt = el('div', { class: 'cekmece__alt' });
    const kok = el('aside', { class: 'cekmece', role: 'dialog', 'aria-modal': 'true', 'aria-label': baslik }, [
      el('div', { class: 'cekmece__bas' }, [el('h2', { html: ikon }, [baslik]), kapatBtn]), govde, alt
    ]);
    const c = {
      kok, govde, alt,
      ciz: () => ciz(c),
      kapat: (hemen) => {
        document.removeEventListener('keydown', tus);
        document.documentElement.classList.remove('cekmece-acik');
        acik = null;
        if (hemen || reduced) { kok.remove(); ort.remove(); } else {
          kok.classList.remove('is-on'); ort.classList.remove('is-on');
          setTimeout(() => { kok.remove(); ort.remove(); }, 280);
        }
        if (!hemen && once && once.focus) once.focus({ preventScroll: true });
      }
    };
    const tus = (e) => {
      if (e.key === 'Escape') c.kapat();
      // odak çekmecenin içinde döner
      if (e.key === 'Tab') {
        const f = [...kok.querySelectorAll('a[href], button:not([disabled]), textarea, input')].filter((x) => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    kapatBtn.addEventListener('click', () => c.kapat());
    ort.addEventListener('click', () => c.kapat());
    document.addEventListener('keydown', tus);
    document.body.append(ort, kok);
    document.documentElement.classList.add('cekmece-acik');
    acik = c;
    c.ciz();
    requestAnimationFrame(() => { ort.classList.add('is-on'); kok.classList.add('is-on'); });
    kapatBtn.focus({ preventScroll: true });
    return c;
  }
  const bos = (ikon, metin, kids = []) => el('div', { class: 'cekmece__bos' }, [el('span', { html: ikon }), el('p', { text: metin }), ...kids]);

  // ---------- sepet ----------
  function sepeteEkle(id, adet = 1) {
    const l = sepet(); const v = l.find((x) => x.id === id);
    if (v) v.adet = Math.min(20, v.adet + adet); else l.push({ id, adet });
    sepetYaz(l);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sepet]');
    if (!b) return;
    e.preventDefault();
    if (b.disabled) return;
    sepeteEkle(b.dataset.sepet);
    // düğmede kısa onay
    const metin = [...b.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (metin && !b.classList.contains('is-eklendi')) {
      const eski = metin.nodeValue; b.classList.add('is-eklendi'); metin.nodeValue = 'Sepete eklendi';
      setTimeout(() => { b.classList.remove('is-eklendi'); metin.nodeValue = eski; }, 1600);
    }
    if (acik && acik.tur === 'sepet') acik.ciz(); else toast('Ürün sepete eklendi.', 'Sepete git', sepetAc);
  });

  function sepetAc() {
    const c = cekmece('Sepetim', IKON.sepet, async (c) => {
      const tum = await urunler();
      const l = sepet().map((x) => ({ ...x, u: bul(tum, x.id) })).filter((x) => x.u);
      c.govde.replaceChildren(); c.alt.replaceChildren();
      if (!l.length) {
        c.govde.append(bos(IKON.sepet, 'Sepetiniz boş. Beğendiğiniz ürünlerde “Sepete Ekle”ye dokunun.', [el('a', { class: 'button', href: `${DIL || ''}/#askidakiler`, text: 'Ürünlere bak' })]));
        c.govde.querySelector('a').addEventListener('click', () => c.kapat(true));
        return;
      }
      const ul = el('ul', { class: 'sepet-liste' });
      for (const x of l) {
        const out = el('output', { text: x.adet });
        const eksi = el('button', { type: 'button', 'aria-label': 'Bir azalt', text: '−' });
        const arti = el('button', { type: 'button', 'aria-label': 'Bir artır', text: '+' });
        const sil = el('button', { type: 'button', class: 'sepet-oge__sil', 'aria-label': `${x.u.ad} sepetten çıkar`, text: '×' });
        const degis = (d) => { const s = sepet(); const v = s.find((y) => y.id === x.id); if (!v) return; v.adet = Math.max(0, Math.min(20, v.adet + d)); sepetYaz(s.filter((y) => y.adet > 0)); c.ciz(); };
        eksi.addEventListener('click', () => degis(-1)); arti.addEventListener('click', () => degis(1));
        sil.addEventListener('click', () => { sepetYaz(sepet().filter((y) => y.id !== x.id)); c.ciz(); });
        ul.append(el('li', { class: 'sepet-oge' }, [
          el('img', { src: kucuk(x.u), alt: '', width: '84', height: '105', loading: 'lazy' }),
          el('div', {}, [
            el('a', { href: urunUrl(x.u), text: x.u.ad }),
            el('small', { text: yasYazi(x.u) }),
            el('strong', { text: tl(x.u.fiyat ? x.u.fiyat * x.adet : null) }),
            el('div', { class: 'adet', role: 'group', 'aria-label': 'Adet' }, [eksi, out, arti])
          ]),
          sil
        ]));
      }
      c.govde.append(ul);
      ul.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => c.kapat(true)));

      const fiyatli = l.every((x) => x.u.fiyat);
      const toplam = l.reduce((t, x) => t + (x.u.fiyat || 0) * x.adet, 0);
      const ozet = el('div', { class: 'sepet-ozet' });
      if (fiyatli) {
        ozet.append(el('div', { class: 'toplam' }, [el('span', { text: 'Toplam' }), el('span', { text: tl(toplam) })]));
        const kalan = KARGO_ESIK - toplam;
        ozet.append(el('div', { class: 'kargo-cubuk', 'aria-hidden': 'true' }, [el('i', { style: `width:${Math.min(100, (toplam / KARGO_ESIK) * 100)}%` })]));
        ozet.append(el('p', { class: 'kargo-yazi' + (kalan <= 0 ? ' is-ok' : ''), text: kalan <= 0 ? 'Kargo ücretsiz.' : `Ücretsiz kargoya ${tl(kalan)} kaldı.` }));
      } else {
        ozet.append(el('p', { class: 'kargo-yazi', text: 'Bazı ürünlerin fiyatı sitede yazmıyor; güncel fiyatı ve toplamı mesajda söylüyoruz. 300 TL ve üzeri siparişte kargo ücretsiz.' }));
      }
      const notAlan = el('textarea', { id: 'sepet-not', maxlength: '300', placeholder: 'ör. 5 yaş, boyu 110 cm; lacivert olsun' });
      notAlan.value = store.get('mb-sepet-not', '') || '';
      notAlan.addEventListener('input', () => store.set('mb-sepet-not', notAlan.value));
      c.govde.append(el('label', { class: 'not', for: 'sepet-not' }, [el('span', { text: 'Çocuğun yaşı, bedeni ya da notunuz' }), notAlan]));

      const gonder = el('a', { class: 'button', href: '#', target: '_blank', rel: 'noopener', text: 'Siparişi WhatsApp’tan gönder' });
      const mesaj = () => {
        const satir = ['Merhaba, sitedeki sepetimden sipariş vermek istiyorum:'];
        for (const x of l) satir.push(`• ${x.u.ad}${x.adet > 1 ? ` (${x.adet} adet)` : ''}${x.u.fiyat ? `, ${tl(x.u.fiyat * x.adet)}` : ''}`);
        if (fiyatli) satir.push(`Toplam: ${tl(toplam)}`);
        if (notAlan.value.trim()) satir.push(`Not: ${notAlan.value.trim()}`);
        satir.push('Bedeni ve kargoyu konuşalım.' + olcu());
        return satir.join('\n');
      };
      gonder.addEventListener('click', () => {
        const m = mesaj();
        gonder.href = waLink(m);
        const s = store.get('mb-siparisler', []);
        s.unshift({ t: Date.now(), n: l.reduce((t, x) => t + x.adet, 0), m });
        store.set('mb-siparisler', s.slice(0, 10));
      });
      const bosalt = el('button', { type: 'button', class: 'cekmece__ikinci', text: 'Sepeti boşalt' });
      bosalt.addEventListener('click', () => { sepetYaz([]); c.ciz(); });
      c.alt.append(ozet, gonder, bosalt);
    });
    c.tur = 'sepet';
  }

  // ---------- favoriler (ek.js'teki kalplerle aynı liste) ----------
  const favoriYaz = (l) => { store.set('mb-begen', l); document.dispatchEvent(new Event('mb:begen-yenile')); sayac(); };
  function favoriAc() {
    const c = cekmece('Favorilerim', IKON.kalp, async (c) => {
      const tum = await urunler();
      const l = favoriler().map((id) => bul(tum, id)).filter(Boolean);
      c.govde.replaceChildren(); c.alt.replaceChildren();
      if (!l.length) {
        c.govde.append(bos(IKON.kalp, 'Henüz favoriniz yok. Ürün fotoğrafının köşesindeki kalbe dokunarak ekleyebilirsiniz.'));
        return;
      }
      const ul = el('ul', { class: 'sepet-liste' });
      for (const u of l) {
        const sil = el('button', { type: 'button', class: 'sepet-oge__sil', 'aria-label': `${u.ad} favorilerden çıkar`, text: '×' });
        sil.addEventListener('click', () => { favoriYaz(favoriler().filter((x) => x !== u.id)); c.ciz(); });
        const ekle = el('button', { type: 'button', class: 'sepete-ekle', 'data-sepet': u.id, disabled: u.durum === 'tükendi', text: u.durum === 'tükendi' ? 'Tükendi' : 'Sepete ekle' });
        ul.append(el('li', { class: 'sepet-oge' }, [
          el('img', { src: kucuk(u), alt: '', width: '84', height: '105', loading: 'lazy' }),
          el('div', {}, [el('a', { href: urunUrl(u), text: u.ad }), el('small', { text: yasYazi(u) }), el('strong', { text: tl(u.fiyat) }), ekle]),
          sil
        ]));
      }
      c.govde.append(ul);
      ul.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => c.kapat(true)));
      const hepsi = el('button', { type: 'button', class: 'button', text: 'Hepsini sepete ekle' });
      hepsi.addEventListener('click', () => { l.filter((u) => u.durum !== 'tükendi').forEach((u) => { if (!sepet().some((x) => x.id === u.id)) sepeteEkle(u.id); }); sepetAc(); });
      const sor = el('a', { class: 'button button--paper', href: waLink(['Merhaba, sitede beğendiğim ürünleri soruyorum:', ...l.map((u) => `• ${u.ad}`), 'Fiyat ve bedenleri nedir?' + olcu()].join('\n')), target: '_blank', rel: 'noopener', text: 'Hepsini WhatsApp’tan sor' });
      c.alt.append(hepsi, sor);
    });
    c.tur = 'favori';
  }

  // ---------- hesabım: üyelik yok, bu cihazdaki kayıtlar ----------
  function hesapAc() {
    const c = cekmece('Hesabım', IKON.kisi, (c) => {
      c.govde.replaceChildren(); c.alt.replaceChildren();
      c.govde.append(el('p', { class: 'hesap-bilgi', text: 'Üye olmanıza gerek yok. Sepetiniz, favorileriniz ve sipariş mesajlarınız bu cihazda saklanır; siparişi WhatsApp’tan birlikte tamamlıyoruz.' }));
      const s = store.get('mb-siparisler', []);
      c.govde.append(el('h3', { class: 'hesap-baslik', text: 'Siparişlerim' }));
      if (s.length) {
        c.govde.append(el('ul', { class: 'siparis-liste' }, s.map((x) => el('li', {}, [
          el('span', { text: new Date(x.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }),
          el('span', { text: `${x.n} ürün` }),
          el('a', { href: waLink(x.m), target: '_blank', rel: 'noopener', text: 'Mesajı yeniden aç' })
        ]))));
      } else c.govde.append(el('p', { class: 'muted', text: 'Bu cihazdan henüz sipariş mesajı gönderilmedi.' }));
      const o = store.get('mb-olcu', null);
      c.govde.append(el('h3', { class: 'hesap-baslik', text: 'Ölçülerim' }),
        el('p', { class: 'muted', text: o ? `Boy ${o.boy} cm, kilo ${o.kilo} kg. Genel tabloya göre ${o.beden} bedeni.` : 'Beden bulucuda boy ve kiloyu girerseniz burada saklanır, mesajlarınıza eklenir.' }));
      const btn = (t, f) => { const b = el('button', { type: 'button', text: t }); b.addEventListener('click', f); return el('li', {}, [b]); };
      const git = (t, h) => { const a = el('a', { href: h, text: t }); a.addEventListener('click', () => c.kapat(true)); return el('li', {}, [a]); };
      c.govde.append(el('ul', { class: 'hesap-linkler' }, [
        btn('Sepetim', sepetAc), btn('Favorilerim', favoriAc),
        git('Beden bulucu', `${DIL}/#beden`), git('Teslimat ve kargo', '/teslimat'), git('İptal, iade ve değişim', '/iade'), git('Hakkımızda ve iletişim', '/iletisim'),
        el('li', {}, [el('a', { href: waLink('Merhaba, sitenizden yazıyorum.'), target: '_blank', rel: 'noopener', text: 'WhatsApp’tan yazın' })])
      ]));
    });
    c.tur = 'hesap';
  }

  const AC = { sepet: sepetAc, favori: favoriAc, hesap: hesapAc };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cekmece]');
    if (b && AC[b.dataset.cekmece]) { e.preventDefault(); AC[b.dataset.cekmece](); }
  });

  // ---------- üstteki arama: öneriler ve sonuç sayfası ----------
  const form = $('[data-ara]');
  if (form) {
    const inp = form.querySelector('input'), oneri = form.querySelector('.ust__oneri');
    let secili = -1, zam;
    const kapat = () => { oneri.hidden = true; secili = -1; inp.setAttribute('aria-expanded', 'false'); };
    const ara = (q) => {
      const katalog = $('#ara');
      if (katalog && $('#askidakiler')) {
        if (window.mbFiltre) window.mbFiltre(null, false);
        katalog.value = q; katalog.dispatchEvent(new Event('input', { bubbles: true }));
        $('#askidakiler').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      } else location.href = `${DIL || ''}/?q=${encodeURIComponent(q)}#askidakiler`;
      kapat(); inp.blur();
    };
    inp.addEventListener('input', () => {
      clearTimeout(zam);
      zam = setTimeout(async () => {
        const q = norm(inp.value.trim());
        if (q.length < 2) { kapat(); return; }
        const tum = await urunler();
        const k = q.split(/\s+/);
        const bulunan = tum.filter((u) => k.every((w) => norm(`${u.ad} ${u.kisa || ''} ${u.kategori} ${yasYazi(u)}`).includes(w))).slice(0, 6);
        oneri.replaceChildren(...bulunan.map((u) => el('li', { role: 'none' }, [el('a', { href: urunUrl(u), role: 'option' }, [
          el('img', { src: kucuk(u), alt: '', width: '40', height: '50', loading: 'lazy' }),
          el('span', {}, [u.ad, el('small', { text: yasYazi(u) })])
        ])])));
        const tumu = el('a', { href: `${DIL || ''}/?q=${encodeURIComponent(inp.value.trim())}#askidakiler`, role: 'option', class: 'ust__tum', text: bulunan.length ? 'Bütün sonuçları göster' : 'Sitede bulunamadı; dükkânda olabilir. WhatsApp’tan sorun' });
        if (!bulunan.length) tumu.href = waLink(`Merhaba, sitede “${inp.value.trim()}” aradım. Elinizde var mı?`);
        else tumu.addEventListener('click', (e) => { e.preventDefault(); ara(inp.value.trim()); });
        oneri.append(el('li', { role: 'none' }, [tumu]));
        oneri.hidden = false; secili = -1; inp.setAttribute('aria-expanded', 'true');
      }, 140);
    });
    inp.addEventListener('keydown', (e) => {
      const ogeler = [...oneri.querySelectorAll('a')];
      if (e.key === 'Escape') { kapat(); return; }
      if (oneri.hidden || !ogeler.length || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      secili = (secili + (e.key === 'ArrowDown' ? 1 : -1) + ogeler.length) % ogeler.length;
      ogeler.forEach((a, i) => a.setAttribute('aria-selected', String(i === secili)));
      ogeler[secili].scrollIntoView({ block: 'nearest' });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ogeler = [...oneri.querySelectorAll('a')];
      if (!oneri.hidden && secili >= 0 && ogeler[secili]) { ogeler[secili].click(); return; }
      const q = inp.value.trim();
      if (q) ara(q);
    });
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) kapat(); });
  }

  // ---------- kayan afiş ----------
  const afis = $('#afis');
  if (afis) {
    const slaytlar = [...afis.querySelectorAll('.afis__slayt')], noktalar = [...afis.querySelectorAll('.afis__noktalar button')];
    let cur = 0, zaman = null, dur = false;
    const goster = (i) => {
      cur = (i + slaytlar.length) % slaytlar.length;
      slaytlar.forEach((s, j) => {
        const on = j === cur;
        s.classList.toggle('is-on', on);
        on ? s.removeAttribute('aria-hidden') : s.setAttribute('aria-hidden', 'true');
        s.querySelectorAll('a').forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
      });
      noktalar.forEach((n, j) => n.setAttribute('aria-current', String(j === cur)));
      // sıradaki fotoğraf önceden insin
      const sonraki = slaytlar[(cur + 1) % slaytlar.length].querySelector('img');
      if (sonraki) sonraki.loading = 'eager';
    };
    const basla = () => { clearInterval(zaman); if (!reduced) zaman = setInterval(() => { if (!dur && !document.hidden) goster(cur + 1); }, 6000); };
    afis.querySelectorAll('[data-afis]').forEach((b) => b.addEventListener('click', () => { goster(cur + Number(b.dataset.afis)); basla(); }));
    noktalar.forEach((n, j) => n.addEventListener('click', () => { goster(j); basla(); }));
    afis.addEventListener('mouseenter', () => { dur = true; });
    afis.addEventListener('mouseleave', () => { dur = false; });
    afis.addEventListener('focusin', () => { dur = true; });
    afis.addEventListener('focusout', () => { dur = false; });
    // telefonda kaydırarak geçiş
    let x0 = null, y0 = 0;
    afis.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
    afis.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { goster(cur + (dx < 0 ? 1 : -1)); basla(); }
    });
    if (document.readyState === 'complete') goster(0); else addEventListener('load', () => goster(0), { once: true });
    basla();
  }

  // ---------- çok satanlar: mağazanın vitrine koyduğu ürünler, eksik kalırsa en yeniler ----------
  const satanlar = $('#satanlar');
  if (satanlar && window.mbKart) {
    urunler().then((tum) => {
      // afiş görselli ürünler (yazılı kampanya görseli) kart dizisinde göze batıyor; burada gösterilmez
      const satista = tum.filter((u) => !u.gizle && !u.afis && u.durum !== 'tükendi');
      const vitrin = satista.filter((u) => u.vitrin);
      const yeni = satista.filter((u) => !u.vitrin).sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
      const sec = [...vitrin, ...yeni].slice(0, 5);
      satanlar.replaceChildren(...sec.map((u, i) => window.mbKart(u, i + 4)));
    });
  }

  // ---------- bülten: e-posta mağazaya Telegram'dan iletilir ----------
  const bulten = $('#bulten-form');
  if (bulten) {
    const inp = bulten.querySelector('input'), durum = bulten.querySelector('.bulten__durum'), btn = bulten.querySelector('button');
    const yaz = (t, ok) => { durum.textContent = t; durum.className = 'bulten__durum ' + (ok ? 'is-ok' : 'is-hata'); };
    bulten.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ep = inp.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ep)) { yaz('Geçerli bir e-posta adresi yazın.', false); inp.focus(); return; }
      btn.disabled = true;
      try {
        const r = await fetch('/api/bildir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tur: 'bulten', eposta: ep }) });
        if (r.status === 429) yaz('Çok fazla deneme oldu, biraz sonra tekrar deneyin.', false);
        else if (r.ok) { yaz('Teşekkürler, kaydınız alındı.', true); inp.value = ''; }
        else yaz('Gönderilemedi, biraz sonra tekrar deneyin.', false);
      } catch (err) { yaz('Bağlantı kurulamadı, biraz sonra tekrar deneyin.', false); }
      btn.disabled = false;
    });
  }
})();
