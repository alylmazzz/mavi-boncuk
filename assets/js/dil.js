// Mavi Boncuk — dil desteği.
// Üst kısım (çeviri çekirdeği) hem tarayıcıda hem Node'da (tools/diller.js) kullanılır.
// Sözlük: { "Türkçe metin": "çeviri" }; {n} herhangi bir metin, {#n} sayı ya da sayı aralığı (5, 7-12, 6.500) yer tutucusudur.
(function (kok) {
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

  function sozlukHazirla(sozluk) {
    const tam = new Map(); const desen = [];
    for (const [k, v] of Object.entries(sozluk || {})) {
      if (!v) continue;
      const n = norm(k);
      if (/\{#?\d+\}/.test(n)) {
        const kac = n.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
          .replace(/\{#(\d+)\}/g, '(?<g$1>\\d[\\d.,]*(?:\\s?[-–]\\s?\\d[\\d.,]*)?)')
          .replace(/\{(\d+)\}/g, '(?<g$1>.+?)');
        try { desen.push({ re: new RegExp('^' + kac + '$'), v, uzunluk: n.length }); } catch (e) { /* bozuk desen */ }
      } else tam.set(n, v);
    }
    desen.sort((a, b) => b.uzunluk - a.uzunluk);
    return { tam, desen };
  }

  // tek parça çeviri; bulunamazsa null
  function cevir(s, sz, derin) {
    derin = derin || 0;
    const n = norm(s);
    if (!n) return null;
    if (sz.tam.has(n)) return sz.tam.get(n);
    if (derin > 2) return null;
    for (const d of sz.desen) {
      const m = n.match(d.re);
      if (m) return d.v.replace(/\{#?(\d+)\}/g, (_, i) => { const x = m.groups['g' + i]; if (x == null) return ''; const c = cevir(x, sz, derin + 1); return c == null ? x : x.match(/^\s*/)[0] + c + x.match(/\s*$/)[0]; });
    }
    return null;
  }

  // baştaki/sondaki boşluğu koruyarak çevir
  function cevirKoru(s, sz) {
    // baştaki ayraç (ör. kırıntıdaki "/ ") ve boşluklar olduğu gibi kalır
    const bas = s.match(/^[\s/·|›»,–-]*/)[0], son = s.match(/\s*$/)[0];
    const t = cevir(s, sz) ?? (bas.trim() ? cevir(s.slice(bas.length), sz) : null);
    if (t == null) return null;
    return (cevir(s, sz) != null ? s.match(/^\s*/)[0] : bas) + t + son;
  }

  // WhatsApp mesajı: satır satır; satır tutmazsa cümle cümle
  function mesajCevir(s, sz) {
    let degisti = false;
    const satir = (x) => {
      const t = cevir(x, sz);
      if (t != null) { degisti = true; return t; }
      return x.split(/(?<=[.?!:])\s+/).map((p) => { const c = cevir(p, sz); if (c != null) { degisti = true; return c; } return p; }).join(' ');
    };
    const out = String(s).split('\n').map(satir).join('\n');
    return degisti ? out : null;
  }

  const DILLER = {
    tr: { ad: 'Türkçe', locale: 'tr_TR' },
    en: { ad: 'English', locale: 'en_GB' },
    de: { ad: 'Deutsch', locale: 'de_DE' },
    ru: { ad: 'Русский', locale: 'ru_RU' },
    nl: { ad: 'Nederlands', locale: 'nl_NL' },
    it: { ad: 'Italiano', locale: 'it_IT' },
    es: { ad: 'Español', locale: 'es_ES' },
    fr: { ad: 'Français', locale: 'fr_FR' },
    pt: { ad: 'Português', locale: 'pt_BR' },
    ar: { ad: 'العربية', locale: 'ar_AR', yon: 'rtl' }
  };
  // çevrilmiş sürümü olan yollar
  const cevrilir = (yol) => /^\/(urunler|urun\/[^/]+|kategori\/[^/]+|sezon\/[^/]+)?\/?$/.test(yol);

  const cekirdek = { norm, sozlukHazirla, cevir, cevirKoru, mesajCevir, DILLER, cevrilir };
  if (typeof module !== 'undefined' && module.exports) { module.exports = cekirdek; return; }
  kok.mbCeviri = cekirdek;
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- tarayıcı ----------
(function () {
  if (typeof window === 'undefined' || !window.mbCeviri) return;
  const C = window.mbCeviri;
  const root = document.documentElement;
  const DIL = C.DILLER[root.lang] ? root.lang : 'tr';
  const SURUM = ((document.currentScript && document.currentScript.src.match(/[?&]v=(w+)/)) || [])[1] || '1';
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* gizli pencere */ } }
  };
  // dil öneki olmadan yol: /en/urun/x -> /urun/x
  const yalinYol = location.pathname.replace(/^\/(en|de|ru|nl|it|es|fr|pt|ar)(?=\/|$)/, '') || '/';
  const hedef = (kod) => {
    const yol = C.cevrilir(yalinYol) ? yalinYol : '/';
    return (kod === 'tr' ? (yol === '/' ? '/' : yol) : '/' + kod + (yol === '/' ? '' : yol)) + (C.cevrilir(yalinYol) ? location.hash : '');
  };

  // ---------- dil seçici ----------
  // bayraklar (emoji bayraklar Windows'ta görünmediği için SVG); İngilizce: Birleşik Krallık, Portekizce: Brezilya, Arapça: BAE
  const B = (ic) => '<svg class="dil__bayrak" viewBox="0 0 30 20" aria-hidden="true" focusable="false">' + ic + '</svg>';
  const yatay = (r) => r.map((c, i) => '<rect y="' + (20 / r.length) * i + '" width="30" height="' + (20 / r.length + 0.1) + '" fill="' + c + '"/>').join('');
  const dikey = (r) => r.map((c, i) => '<rect x="' + 10 * i + '" width="10.1" height="20" fill="' + c + '"/>').join('');
  const BAYRAK = {
    tr: B('<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/><polygon fill="#fff" points="14.90,10.00 16.59,9.41 16.63,7.62 17.71,9.05 19.42,8.53 18.40,10.00 19.42,11.47 17.71,10.95 16.63,12.38 16.59,10.59"/>'),
    en: B('<rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.6"/>'),
    de: B(yatay(['#000', '#dd0000', '#ffce00'])),
    ru: B(yatay(['#fff', '#0039a6', '#d52b1e'])),
    nl: B(yatay(['#ae1c28', '#fff', '#21468b'])),
    it: B(dikey(['#009246', '#fff', '#ce2b37'])),
    es: B('<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>'),
    fr: B(dikey(['#002395', '#fff', '#ed2939'])),
    pt: B('<rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5L27 10 15 17.5 3 10z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.2" fill="#002776"/>'),
    ar: B(yatay(['#00732f', '#fff', '#000']) + '<rect width="8" height="20" fill="#ff0000"/>')
  };
  const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
  function seciciKur(etiket) {
    const menu = document.getElementById('menu');
    if (!menu || document.querySelector('.dil')) return;
    const kutu = document.createElement('div'); kutu.className = 'dil';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dil__btn'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-haspopup', 'true');
    b.setAttribute('aria-label', etiket || 'Dil seçin');
    b.innerHTML = (BAYRAK[DIL] || SVG) + '<span>' + DIL.toUpperCase() + '</span>';
    const panel = document.createElement('ul'); panel.className = 'dil__panel'; panel.hidden = true; panel.setAttribute('translate', 'no');
    for (const [kod, d] of Object.entries(C.DILLER)) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = hedef(kod); a.lang = kod; a.hreflang = kod; a.innerHTML = (BAYRAK[kod] || '') + '<span></span>'; a.lastChild.textContent = d.ad; if (d.yon) a.dir = d.yon;
      a.dataset.mbDilLink = '1';
      if (kod === DIL) a.setAttribute('aria-current', 'true');
      a.addEventListener('click', () => store.set('mb-dil', kod));
      li.append(a); panel.append(li);
    }
    const kapat = () => { panel.hidden = true; b.setAttribute('aria-expanded', 'false'); };
    b.addEventListener('click', (e) => { e.stopPropagation(); const ac = panel.hidden; panel.hidden = !ac; b.setAttribute('aria-expanded', String(ac)); });
    document.addEventListener('click', (e) => { if (!kutu.contains(e.target)) kapat(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });
    kutu.append(b, panel);
    const wa = menu.querySelector('a.button[data-wa]');
    wa ? wa.before(kutu) : menu.append(kutu);
  }

  // ---------- Türkçe sayfada dil önerisi ----------
  function oneri() {
    if (DIL !== 'tr' || store.get('mb-dil') === 'tr') return;
    const tercih = store.get('mb-dil') || (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase()).find((l) => C.DILLER[l]);
    if (!tercih || tercih === 'tr' || !C.DILLER[tercih]) return;
    try { if (sessionStorage.getItem('mb-dil-oneri')) return; } catch (e) { /* */ }
    const k = document.createElement('div');
    k.className = 'dil-oneri'; k.setAttribute('role', 'status'); k.lang = tercih; if (C.DILLER[tercih].yon) k.dir = C.DILLER[tercih].yon;
    k.innerHTML = '<p></p><a class="button"></a><button type="button" class="dil-oneri__kapat" aria-label="×">×</button>';
    k.querySelector('p').textContent = ONERI_METIN[tercih];
    const a = k.querySelector('a'); a.href = hedef(tercih); a.innerHTML = (BAYRAK[tercih] || '') + '<span></span>'; a.lastChild.textContent = C.DILLER[tercih].ad;
    a.addEventListener('click', () => store.set('mb-dil', tercih));
    k.querySelector('button').addEventListener('click', () => { k.remove(); try { sessionStorage.setItem('mb-dil-oneri', '1'); } catch (e) { /* */ } });
    const h = document.querySelector('header.bar'); h ? h.after(k) : document.body.prepend(k);
  }
  const ONERI_METIN = {
    en: 'This page is also available in English.', de: 'Diese Seite gibt es auch auf Deutsch.', ru: 'Эта страница есть и на русском.',
    nl: 'Deze pagina is ook in het Nederlands.', it: 'Questa pagina è disponibile anche in italiano.', es: 'Esta página también está en español.',
    fr: 'Cette page existe aussi en français.', pt: 'Esta página também está em português.',
    ar: 'هذه الصفحة متوفرة أيضاً باللغة العربية.'
  };

  if (DIL === 'tr') {
    const basla = () => { seciciKur(); oneri(); };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', basla) : basla();
    return;
  }

  // ---------- yabancı dil sayfası: dinamik metinleri çevir ----------
  let SZ = null; const bekleyen = new Set();
  const OZN = ['alt', 'aria-label', 'placeholder', 'title'];
  const ATLA = /^(SCRIPT|STYLE|SVG|TEXTAREA|CODE)$/;
  const DAHILI = /^\/(urunler|urun\/[^/?#]+|kategori\/[^/?#]+|sezon\/[^/?#]+)?(?=$|[?#])/;
  function ogeIsle(n) {
    for (const a of OZN) { const v = n.getAttribute(a); if (v) { const t = C.cevir(v, SZ); if (t != null && t !== v) n.setAttribute(a, t); } }
    if (n.tagName === 'A' && !n.dataset.mbDilLink) { const h = n.getAttribute('href'); if (h && DAHILI.test(h)) n.setAttribute('href', '/' + DIL + (h === '/' ? '' : h.replace(/^\/(?=#)/, ''))); }
  }
  function metinIsle(n) {
    const p = n.parentElement; if (!p || ATLA.test(p.tagName) || p.closest('[data-cevirme]')) return;
    const t = C.cevirKoru(n.nodeValue, SZ); if (t != null && t !== n.nodeValue) n.nodeValue = t;
  }
  function dugum(n) {
    if (n.nodeType === 3) return metinIsle(n);
    if (n.nodeType !== 1 || ATLA.test(n.tagName) || n.closest('[data-cevirme]')) return;
    ogeIsle(n);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (x) => (x.nodeType === 1 && ATLA.test(x.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let x = w.nextNode();
    while (x) { x.nodeType === 3 ? metinIsle(x) : ogeIsle(x); x = w.nextNode(); }
  }
  const gozcu = new MutationObserver((l) => {
    for (const m of l) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => (SZ ? dugum(n) : bekleyen.add(n)));
      else if (m.type === 'characterData') SZ ? dugum(m.target) : bekleyen.add(m.target);
      else if (m.type === 'attributes') SZ ? ogeIsle(m.target) : bekleyen.add(m.target);
    }
  });
  gozcu.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: OZN.concat('href') });

  // WhatsApp mesajları: ziyaretçinin dilinde + altında Türkçesi (dükkân okuyabilsin)
  const ISARET = '\n\n— Türkçe —\n';
  function waCevir(u) {
    if (!SZ || typeof u !== 'string' || !/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(u)) return u;
    try {
      const url = new URL(u); const metin = url.searchParams.get('text');
      if (!metin || metin.includes(ISARET)) return u;
      const c = C.mesajCevir(metin, SZ);
      if (c == null) return u;
      url.searchParams.set('text', c + ISARET + metin);
      return url.toString();
    } catch (e) { return u; }
  }
  const ac0 = window.open;
  window.open = function (u) { const a = [].slice.call(arguments); a[0] = waCevir(u); return ac0.apply(window, a); };
  window.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]');
    if (a) a.href = waCevir(a.href);
  });

  const basla = () => {
    seciciKur();
    fetch('/assets/i18n/' + DIL + '.json?v=' + SURUM).then((r) => r.json()).then((s) => {
      SZ = C.sozlukHazirla(s);
      const b = document.querySelector('.dil__btn'); const e = C.cevir('Dil seçin', SZ); if (b && e) b.setAttribute('aria-label', e);
      dugum(document.body);
      bekleyen.forEach((n) => dugum(n)); bekleyen.clear();
    }).catch(() => {});
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', basla) : basla();
})();
