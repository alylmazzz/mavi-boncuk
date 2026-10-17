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

  // ---------- yakınlık bildirimi (il düzeyinde, izin istemeden) ----------
  if (!ses.get('mb-konum-kapat') && $('.hero')) {
    fetch('/api/konum').then((r) => r.json()).then((k) => {
      if (!k || k.ulke !== 'TR') return;
      const kutu = document.createElement('div');
      kutu.className = 'konum'; kutu.setAttribute('role', 'status');
      kutu.innerHTML = k.yakin
        ? `<p>Size yakınız. Ortaca’daki dükkânımıza gelip beğendiğinizi çocuğunuzun üstünde deneyebilirsiniz.</p><a class="link" href="https://www.google.com/maps/search/?api=1&amp;query=Mavi+Boncuk+Bebe+Ma%C4%9Fazas%C4%B1+Ortaca" rel="noopener">Yol tarifi</a>`
        : `<p>Ortaca dışındaysanız da sipariş alıyoruz. Ürünü seçin, WhatsApp’tan yazın, gönderimi birlikte konuşalım.</p><a class="link" href="/teslimat">Teslimat</a>`;
      const kapat = document.createElement('button');
      kapat.type = 'button'; kapat.className = 'konum__kapat'; kapat.setAttribute('aria-label', 'Bildirimi kapat'); kapat.textContent = '×';
      kapat.addEventListener('click', () => { kutu.remove(); ses.set('mb-konum-kapat', '1'); });
      kutu.append(kapat);
      $('.hero').prepend(kutu);
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

  // ---------- kaydırınca beliren bölümler (bir kez) ----------
  if (!reduced && 'IntersectionObserver' in window) {
    const hedefler = document.querySelectorAll('.catalogue__head, .strip__title, .steps__head, .board, .sizer__box, .shop h2, .shop__grid > li, .reviews__head, .latest__head, .faq h2, .coupon, .postcard, .kombinler__head, .kombin');
    root.classList.add('js-reveal');
    const io = new IntersectionObserver((list) => list.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    hedefler.forEach((n, i) => { n.classList.add('reveal'); n.style.setProperty('--d', `${(i % 4) * 70}ms`); io.observe(n); });
    // kombinler sonradan geldiği için onları da izle
    if (kombinKutu) new MutationObserver(() => kombinKutu.querySelectorAll('.kombin:not(.reveal)').forEach((n, i) => { n.classList.add('reveal'); n.style.setProperty('--d', `${i * 80}ms`); io.observe(n); })).observe(kombinKutu, { childList: true });
  }
})();
