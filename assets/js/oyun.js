// Mavi Boncuk — oyuncak katmanı: selam ve gökyüzü, boncuk imleç ve iz, süzülen arka plan, balon yaş seçici,
// konfeti, oyun yolu, beden bulucu, maskot, WhatsApp asistanı, hediye modu, titreşim ve ses.
// Hareket azaltılmışsa ya da bağlantı yavaşsa süslemeler kapanır; işlevler (beden bulucu, hediye modu) her zaman çalışır.
(function () {
  const WA = '905057458364';
  const $ = (s, r = document) => r.querySelector(s);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* gizli pencere */ } }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const slow = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  const motion = !reduced && !slow;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const COLORS = ['#7fe0dc', '#f7a8c4', '#ffd766', '#a9c8ff', '#cdb8ff', '#ffffff'];
  const waLink = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

  // ---------- konfeti (tek tuval, gerektiğinde çalışır) ----------
  let fx, ctx, parts = [], running = false;
  function ensureFx() {
    if (fx) return;
    fx = document.createElement('canvas');
    fx.className = 'fx';
    fx.setAttribute('aria-hidden', 'true');
    document.body.append(fx);
    ctx = fx.getContext('2d');
    const size = () => { const d = Math.min(1.5, devicePixelRatio); fx.width = innerWidth * d; fx.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
  }
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 30) * (p.a || 1); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.kind === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
      else if (p.kind === 'ring') { ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.stroke(); }
      else if (p.kind === 'star') { star(p.s); }
      else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function star(s) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s / 5 : s / 2; const a = (i * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function confetti(x, y, n = 70, spread = 1) {
    if (!motion) return;
    ensureFx();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 6) * spread;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, g: 0.18, s: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: COLORS[i % COLORS.length], life: 90 + Math.random() * 40, kind: i % 3 ? 'rect' : 'circle' });
    }
    kick();
  }
  function rain(n = 120) {
    if (!motion) return;
    ensureFx();
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.04, s: 7 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, c: COLORS[i % COLORS.length], life: 220, kind: i % 4 ? 'rect' : 'star' });
    kick();
  }

  // ---------- titreşim ve ses ----------
  let soundOn = store.get('mb-ses') === '1', ac;
  function bloop() {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.14);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.2);
    } catch (e) { /* ses desteklenmiyor */ }
  }
  const soundBtn = $('#sound');
  if (soundBtn) {
    const sync = () => { soundBtn.setAttribute('aria-pressed', String(soundOn)); soundBtn.setAttribute('aria-label', soundOn ? 'Tıklama sesini kapat' : 'Tıklama sesini aç'); };
    sync();
    soundBtn.addEventListener('click', () => { soundOn = !soundOn; store.set('mb-ses', soundOn ? '1' : '0'); sync(); bloop(); });
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, .tile');
    if (!t) return;
    if (!finePointer && navigator.vibrate) navigator.vibrate(8);
    if (t !== soundBtn) bloop();
  });

  // ---------- hediye modu ----------
  const gift = $('#gift');
  const GIFT_LINE = '\n\nHediye olarak alıyorum; paketleme ve hediye notu için yardımcı olur musunuz?';
  let giftOn = store.get('mb-hediye') === '1';
  const giftSync = () => { document.documentElement.classList.toggle('gift-on', giftOn); if (gift) gift.setAttribute('aria-pressed', String(giftOn)); };
  giftSync();
  if (gift) gift.addEventListener('click', () => { giftOn = !giftOn; store.set('mb-hediye', giftOn ? '1' : '0'); giftSync(); if (giftOn) rain(); });
  const withGift = (url) => {
    if (!giftOn || !/wa\.me\//.test(url) || /Hediye/.test(decodeURIComponent(url))) return url;
    const u = new URL(url);
    u.searchParams.set('text', (u.searchParams.get('text') || 'Merhaba,') + GIFT_LINE);
    return u.toString();
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="wa.me/"]');
    if (a) a.href = withGift(a.href);
  }, true);
  const open0 = window.open;
  window.open = (u, ...rest) => open0.call(window, typeof u === 'string' ? withGift(u) : u, ...rest);

  // ---------- selam ve gökyüzü ----------
  const hello = $('#hello'), sky = $('#sky');
  if (hello && sky) {
    const h = new Date().getHours();
    const gece = h >= 20 || h < 6;
    const selam = h >= 6 && h < 11 ? 'Günaydın! Bugünün kombini hazır mı?'
      : h < 17 ? 'İyi günler! Okul, parti, bayram; ne lazım?'
      : h < 20 ? 'İyi akşamlar! Yarınki oyunlar için kıyafet seçelim mi?'
      : 'İyi geceler! Minikler uyurken siz rahatça bakın.';
    hello.textContent = selam;
    sky.setAttribute('aria-label', gece ? 'Uykulu ay' : 'Güneş');
    sky.innerHTML = gece
      ? '<svg viewBox="0 0 100 100" aria-hidden="true"><g class="moon"><path d="M62 14a36 36 0 1 0 24 56A30 30 0 0 1 62 14z" fill="#ffe08a" stroke="#26357a" stroke-width="3.5"/><path d="M44 52q5 4 10 0" stroke="#26357a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M36 64q8 6 16 0" stroke="#26357a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="34" cy="58" r="4" fill="#f7a8c4"/></g><text class="zzz" x="74" y="22" font-family="Baloo 2, sans-serif" font-weight="800" font-size="16" fill="#26357a">z</text></svg>'
      : '<svg viewBox="0 0 100 100" aria-hidden="true"><g class="sun-rays">' + Array.from({ length: 10 }, (_, i) => `<rect x="47" y="2" width="6" height="16" rx="3" fill="#ffc93c" transform="rotate(${i * 36} 50 50)"/>`).join('') + '</g><circle cx="50" cy="50" r="27" fill="#ffd766" stroke="#26357a" stroke-width="3.5"/><circle cx="42" cy="47" r="3" fill="#26357a"/><circle cx="58" cy="47" r="3" fill="#26357a"/><path d="M41 57q9 8 18 0" stroke="#26357a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="35" cy="56" r="4" fill="#f7a8c4"/><circle cx="65" cy="56" r="4" fill="#f7a8c4"/></svg>';
    // sürpriz: art arda üç dokunuşta ekran balonla dolar
    let taps = [];
    sky.addEventListener('click', () => {
      const now = Date.now(); taps = taps.filter((t) => now - t < 1500); taps.push(now);
      if (taps.length >= 3) { taps = []; balloons(); }
    });
  }
  function balloons() {
    if (!motion) return;
    for (let i = 0; i < 18; i++) {
      const b = document.createElement('span');
      b.className = 'balloon-fly';
      b.style.left = `${Math.random() * 95}vw`;
      b.style.background = COLORS[i % 5];
      b.style.setProperty('--d', `${3 + Math.random() * 2.5}s`);
      b.style.setProperty('--x', `${(Math.random() - 0.5) * 30}vw`);
      b.style.setProperty('--r', `${(Math.random() - 0.5) * 40}deg`);
      b.style.animationDelay = `${Math.random() * 0.8}s`;
      document.body.append(b);
      setTimeout(() => b.remove(), 7000);
    }
  }

  // ---------- boncuk imleç ve iz ----------
  const dot = $('.cursor');
  if (dot && motion && finePointer) {
    dot.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#2f6fd6" stroke="#26357a" stroke-width="2"/><circle cx="16" cy="16" r="9" fill="#fff"/><circle cx="16" cy="16" r="5.5" fill="#7fe0dc"/><circle cx="16" cy="16" r="2.8" fill="#26357a"/><circle cx="11" cy="9" r="2.2" fill="#fff" opacity=".7"/></svg>';
    document.documentElement.classList.add('has-bead');
    const trail = document.createElement('canvas');
    trail.className = 'trail'; trail.setAttribute('aria-hidden', 'true');
    document.body.append(trail);
    const tc = trail.getContext('2d');
    const size = () => { trail.width = innerWidth; trail.height = innerHeight; };
    size(); addEventListener('resize', size);
    let bits = [], on = false, last = 0;
    const tick = () => {
      tc.clearRect(0, 0, innerWidth, innerHeight);
      bits = bits.filter((b) => b.l > 0);
      for (const b of bits) {
        b.l -= 1; b.y += b.vy; b.x += b.vx;
        tc.globalAlpha = (b.l / b.L) * 0.7;
        if (b.k === 'bubble') { tc.strokeStyle = b.c; tc.lineWidth = 1.2; tc.beginPath(); tc.arc(b.x, b.y, b.s * (1.4 - b.l / b.L * 0.4), 0, 7); tc.stroke(); }
        else { tc.fillStyle = b.c; tc.save(); tc.translate(b.x, b.y); tc.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? b.s / 4 : b.s; const a = i * Math.PI / 4; tc.lineTo(Math.cos(a) * r, Math.sin(a) * r); } tc.fill(); tc.restore(); }
      }
      tc.globalAlpha = 1;
      if (bits.length) requestAnimationFrame(tick); else on = false;
    };
    addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      bits.push({ x: e.clientX + (Math.random() - 0.5) * 8, y: e.clientY + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.5, s: 2 + Math.random() * 3, c: COLORS[(Math.random() * 5) | 0], l: 24, L: 24, k: Math.random() < 0.45 ? 'bubble' : 'spark' });
      if (bits.length > 18) bits.shift();
      if (!on) { on = true; requestAnimationFrame(tick); }
    }, { passive: true });
  }

  // ---------- süzülen arka plan ----------
  if (motion) {
    const SHAPES = {
      bow: '<svg viewBox="0 0 40 24"><path d="M20 12C14 2 2 0 2 12s12 10 18 0zm0 0c6-10 18-12 18 0s-12 10-18 0z" fill="#f7a8c4"/><circle cx="20" cy="12" r="4" fill="#f28db2"/></svg>',
      star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7 7 .6-5.3 4.6L18.4 22 12 18l-6.4 4 1.7-7.8L2 9.6 9 9z" fill="#ffd766"/></svg>',
      shoe: '<svg viewBox="0 0 40 24"><path d="M4 6c0-3 6-3 7 0 2 5 8 6 14 7 8 1 12 4 11 8H4z" fill="#7fe0dc"/><rect x="4" y="19" width="32" height="3" rx="1.5" fill="#fff"/></svg>',
      bead: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2f6fd6"/><circle cx="12" cy="12" r="7" fill="#fff"/><circle cx="12" cy="12" r="4" fill="#7fe0dc"/><circle cx="12" cy="12" r="2" fill="#26357a"/></svg>'
    };
    const kinds = ['bow', 'star', 'shoe', 'bead', 'star', 'bow', 'shoe'];
    const layer = document.createElement('div');
    layer.className = 'floaties'; layer.setAttribute('aria-hidden', 'true');
    const items = kinds.map((k, i) => {
      const s = document.createElement('span');
      const w = 34 + ((i * 37) % 40);
      s.style.width = `${w}px`; s.style.height = `${w}px`;
      s.style.left = `${(i * 97 + 13) % 92}vw`;
      s.innerHTML = SHAPES[k];
      layer.append(s);
      return { el: s, y: ((i * 61) % 100) / 100, f: 0.15 + (i % 4) * 0.12, r: (i * 47) % 360 };
    });
    document.body.prepend(layer);
    let lastY = scrollY, vel = 0, ticking = false;
    const place = () => {
      const H = innerHeight * 1.3;
      for (const it of items) {
        let y = (it.y * H - scrollY * it.f) % H; if (y < 0) y += H;
        it.el.style.transform = `translate3d(0, ${y - innerHeight * 0.15}px, 0) rotate(${it.r + vel * 2}deg)`;
      }
      ticking = false;
    };
    place();
    addEventListener('scroll', () => {
      vel = Math.max(-12, Math.min(12, scrollY - lastY)); lastY = scrollY;
      if (!ticking) { ticking = true; requestAnimationFrame(place); }
    }, { passive: true });
  }

  // ---------- yaş balonları: patla, konfeti, büyüyen sıra ----------
  const dividers = $('#dividers');
  if (dividers) {
    dividers.addEventListener('click', (e) => {
      const b = e.target.closest('.divider');
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
      confetti(r.left + r.width / 2, r.top + r.height / 2, 60, 0.9);
    });
    if (motion && finePointer) {
      let centers = null, mx = 0, q = false;
      const draw = () => {
        q = false;
        const list = dividers.querySelectorAll('.divider');
        if (!centers) centers = [...list].map((d) => { const r = d.getBoundingClientRect(); return r.left + r.width / 2; });
        list.forEach((d, k) => { const sc = 1 + Math.max(0, 1 - Math.abs(mx - centers[k]) / 160) * 0.28; d.style.transform = `scale(${sc.toFixed(3)})`; });
      };
      dividers.addEventListener('pointerenter', () => { centers = null; });
      dividers.addEventListener('pointermove', (e) => { mx = e.clientX; if (!q) { q = true; requestAnimationFrame(draw); } }, { passive: true });
      dividers.addEventListener('pointerleave', () => { centers = null; dividers.querySelectorAll('.divider').forEach((d) => (d.style.transform = '')); });
    }
  }

  // ---------- oyun yolu jetonları ----------
  document.querySelectorAll('.stop__token').forEach((t) => {
    t.addEventListener('click', () => {
      const r = t.getBoundingClientRect();
      if (t.dataset.token === 'heart') { t.classList.remove('is-wave'); void t.offsetWidth; t.classList.add('is-wave'); }
      confetti(r.left + r.width / 2, r.top + r.height / 3, 30, 0.6);
    });
  });

  // ---------- beden bulucu (genel tablo: beden = boy) ----------
  const boy = $('#boy'), kilo = $('#kilo');
  if (boy && kilo) {
    const TABLO = [
      [62, '0-3 ay', 5.5], [68, '3-6 ay', 7.5], [74, '6-9 ay', 8.8], [80, '9-12 ay', 9.8], [86, '12-18 ay', 11.2], [92, '18-24 ay', 12.6],
      [98, '3 yaş', 14.5], [104, '4 yaş', 16.5], [110, '5 yaş', 18.5], [116, '6 yaş', 21], [122, '7 yaş', 23.5], [128, '8 yaş', 26.5],
      [134, '9 yaş', 30], [140, '10 yaş', 33.5], [146, '11 yaş', 37.5], [152, '12 yaş', 42], [158, '13 yaş', 47], [164, '14 yaş', 52], [170, '15 yaş', 57], [176, '16 yaş', 61]
    ];
    const out = $('#sizer-out'), wa = $('#sizer-wa'), kid = $('#kid');
    const calc = () => {
      const b = +boy.value, k = +kilo.value;
      $('#boy-o').textContent = `${b} cm`; $('#kilo-o').textContent = `${k} kg`;
      let i = TABLO.findIndex((r) => b <= r[0]); if (i < 0) i = TABLO.length - 1;
      const row = TABLO[i];
      const agir = k > row[2] * 1.2 && i < TABLO.length - 1;
      const sonuc = agir ? `${row[1]} bedenine, bir de ${TABLO[i + 1][1]} bedenine bakın` : `${row[1]} bedenine bakın`;
      out.textContent = sonuc;
      wa.href = waLink(`Merhaba, sitedeki beden bulucudan yazıyorum. Çocuğumun boyu ${b} cm, kilosu ${k} kg. Tablo “${sonuc}” dedi. Baktığım ürün için hangi bedeni önerirsiniz?`);
      if (kid) {
        const sy = Math.max(0.55, Math.min(1.45, b / 115));
        const sx = Math.max(0.85, Math.min(1.3, Math.sqrt(k / row[2])));
        kid.style.transform = `scale(${sx.toFixed(2)}, ${sy.toFixed(2)})`;
      }
    };
    boy.addEventListener('input', calc); kilo.addEventListener('input', calc);
    calc();
  }

  // ---------- maskot: açılan soruya bakar ----------
  const mascot = $('#mascot');
  if (mascot) {
    const pupil = mascot.querySelector('.pupil');
    const look = (btn) => {
      const m = mascot.getBoundingClientRect(), r = btn.getBoundingClientRect();
      const dy = (r.top + r.height / 2) - (m.top + m.height / 2);
      const ang = Math.max(-25, Math.min(25, dy / 12));
      mascot.style.transform = `translateY(${Math.max(-40, Math.min(260, dy * 0.6))}px) rotate(${-ang * 0.4}deg)`;
      if (pupil) pupil.setAttribute('cx', '52'), pupil.setAttribute('cy', String(64 + Math.max(-8, Math.min(8, dy / 20))));
    };
    document.querySelectorAll('.card button').forEach((b) => b.addEventListener('click', () => look(b)));
  }

  // ---------- görünmeyen bölümlerde animasyonlar durur ----------
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((list) => list.forEach((en) => en.target.classList.toggle('is-offscreen', !en.isIntersecting)), { rootMargin: '120px' });
    document.querySelectorAll('.hero__top, .dividers, .board, .reviews, .faq').forEach((n) => io.observe(n));
  }
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('is-offscreen', document.hidden));

  // ---------- WhatsApp asistanı ----------
  if (!$('.fab')) {
    const IPUCU = [
      ['Kumaşını yakından görmek ister misiniz? Fotoğraf atalım.', 'Merhaba, bir ürünün kumaşını yakından görebilir miyim?'],
      ['Bedenden emin olamadınız mı? Ölçüleri yazın, bakalım.', 'Merhaba, beden konusunda yardım rica ediyorum. Çocuğumun boyu ve kilosu:'],
      ['Aradığınız model stokta mı? Hemen bakalım.', 'Merhaba, bir ürünün stoğunu sormak istiyorum:'],
      ['Hediye mi alıyorsunuz? Notunuzu yazın.', 'Merhaba, hediye olarak bir ürün almak istiyorum.']
    ];
    const fab = document.createElement('div');
    fab.className = 'fab';
    fab.innerHTML = `<a class="fab__tip is-hidden" href="#" rel="noopener"></a><a class="fab__btn" href="${waLink('Merhaba, sitenizden yazıyorum.')}" rel="noopener" aria-label="WhatsApp’tan yazın"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3z" fill="#fff"/><path d="M16 5.4a10.6 10.6 0 0 0-9 16.2l.3.4-1 3.8 3.9-1 .4.2A10.6 10.6 0 1 0 16 5.4z" fill="#25d366"/><path d="M12.2 10.2c-.3-.6-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.8c.2.3 2.6 4.1 6.3 5.6 3.1 1.2 3.7 1 4.4.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5l-2.3-1.1c-.3-.1-.6-.2-.8.2-.2.4-.9 1.1-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.1-2-2.5-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.3 0-.5 0-.7l-1-2.4z" fill="#fff"/></svg></a>`;
    document.body.append(fab);
    const tip = fab.querySelector('.fab__tip');
    let n = 0;
    const show = () => {
      const [metin, mesaj] = IPUCU[n % IPUCU.length]; n++;
      tip.textContent = metin; tip.href = waLink(mesaj);
      tip.classList.remove('is-hidden');
      setTimeout(() => tip.classList.add('is-hidden'), 6000);
    };
    setTimeout(() => { show(); setInterval(show, 10000); }, 4000);
  }
})();
