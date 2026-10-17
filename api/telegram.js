// Telegram botu (@maviboncukortacabot) — yalnızca mağaza sahipleri için.
// POST + Telegram gizli başlığı   -> bot mesajları (webhook)
// POST + yönetim çerezi {islem}   -> panelden: etkinleştir, kod, durum, deneme
// GET  ?dosya=<file_id> + çerez   -> bota gönderilen fiş fotoğrafını/PDF'ini panele aktarır (OCR panelde çalışır)
// GET  ?gunluk=1 + CRON_SECRET    -> sabah özeti: vergi takvimi, günün blog yazısı, pazartesi yedek hatırlatması
// Bot anahtarı yalnızca Vercel ortam değişkeninde: TELEGRAM_BOT_TOKEN.
// Bağlı sohbetler veritabanı yerine webhook adresinde (?s=id1,id2) tutulur; adresi yalnızca Telegram bilir.
const crypto = require('crypto');
const { oturumGecerli } = require('./_lib/oturum');
const { yayindakiler, bugun, SITE } = require('./_lib/blog');

const { esc, tg, sahipler, gonder, DUYURU_ONEK } = require('./_lib/tg');
const WA = 'https://wa.me/905057458364';
const anahtar = (ad) => crypto.createHmac('sha256', process.env.MB_YONETIM_IMZA || '').update(ad).digest('hex');
const gizliBaslik = () => anahtar('telegram-webhook').slice(0, 48);
// 8 haneli bağlama kodu, 10 dakikalık pencerelerle değişir (önceki pencere de geçerli)
const kod = (pencere) => String(parseInt(anahtar('telegram-kod-' + pencere).slice(0, 12), 16) % 1e8).padStart(8, '0');
const pencere = () => Math.floor(Date.now() / 600000);
// TELEGRAM_IZINLI_TELEFON (Vercel): virgülle ayrılmış numaralar; son 10 hane karşılaştırılır
const izinliTelefon = (t) => {
  const son10 = (x) => String(x || '').replace(/\D/g, '').slice(-10);
  const l = (process.env.TELEGRAM_IZINLI_TELEFON || '').split(',').map(son10).filter((x) => x.length === 10);
  return l.includes(son10(t));
};
const kodGecerli = (k) => k === kod(pencere()) || k === kod(pencere() - 1);

const webhookKur = (ids) => tg('setWebhook', {
  url: `${SITE}/api/telegram?s=${ids.join(',')}`, secret_token: gizliBaslik(), allowed_updates: ['message'], drop_pending_updates: false
});

// ---------- vergi takvimi ----------
// Genel takvim; hafta sonuna denk gelen son gün ilk iş gününe kayar. Resmî tatil kaymaları için müşavire danışın.
function sonGunler(yil, ay) {
  const l = [];
  const ayAdi = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const onceki = ayAdi[(ay + 10) % 12];
  l.push([26, `Muhtasar ve prim hizmet beyannamesi (${onceki} ayı) — çalışan ya da kira stopajı varsa`]);
  l.push([28, `KDV beyannamesi ve ödemesi (${onceki} ayı)`]);
  l.push([new Date(Date.UTC(yil, ay, 0)).getUTCDate(), 'Bağ-Kur primi son ödeme günü']);
  if ([5, 8, 11].includes(ay)) l.push([17, 'Geçici vergi beyannamesi ve ödemesi']);
  if (ay === 3) l.push([31, 'Yıllık gelir vergisi beyannamesi ve 1. taksit']);
  if (ay === 7) l.push([31, 'Yıllık gelir vergisi 2. taksit']);
  return l.map(([g, ad]) => {
    const d = new Date(Date.UTC(yil, ay - 1, g));
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return { tarih: d.toISOString().slice(0, 10), ad };
  });
}
function yaklasanlar(gun) {
  const b = bugun(); const [y, a] = b.split('-').map(Number);
  const sinir = new Date(Date.parse(b) + gun * 86400000).toISOString().slice(0, 10);
  const sonraki = a === 12 ? [y + 1, 1] : [y, a + 1];
  return [...sonGunler(y, a), ...sonGunler(...sonraki)].filter((x) => x.tarih >= b && x.tarih <= sinir).sort((p, q) => p.tarih.localeCompare(q.tarih));
}
const takvimMetni = (gun) => {
  const l = yaklasanlar(gun);
  if (!l.length) return `Önümüzdeki ${gun} günde vergi son günü yok.`;
  return l.map((x) => `• <b>${x.tarih.split('-').reverse().join('.')}</b> ${x.ad}`).join('\n');
};
const blogMetni = () => {
  const y = yayindakiler().find((x) => x.tarih === bugun());
  return y ? `Bugünün blog yazısı yayında: <a href="${SITE}/blog/${y.slug}">${esc(y.baslik || y.slug)}</a>\nInstagram hikâyesinde paylaşmak isteyebilirsiniz.` : '';
};
const YARDIM = [
  '<b>Mavi Boncuk yönetim botu</b>',
  '',
  '📷 Fiş ya da fatura fotoğrafı (veya PDF) gönderin; “Panelde oku” düğmesiyle yönetim paneline aktarılır, orada okunup kaydedilir.',
  '/takvim — önümüzdeki 30 günün vergi son günleri',
  '/blog — bugünün blog yazısı',
  '/panel — yönetim paneli bağlantısı',
  '/duyuru &lt;metin&gt; — sitenin üstünde duyuru gösterir (en fazla 200 karakter); /duyurukapat kaldırır',
  '',
  'Her sabah 09.00’da yaklaşan vergi günleri ve günün yazısı buraya gelir.'
].join('\n');

async function webhook(req, res, govde) {
  const ids = (new URL(req.url, 'http://x').searchParams.get('s') || '').split(',').filter(Boolean);
  const m = govde.message;
  if (!m || !m.chat) return res.end('ok');
  const chat = String(m.chat.id); const metin = (m.text || '').trim();
  if (!ids.includes(chat)) {
    const k = metin.replace(/\D/g, '');
    // izinli telefon: kişi kendi numarasını "Numaramı paylaş" ile gönderir (başkasının kartı kabul edilmez)
    const c = m.contact;
    const kendi = !!(c && m.from && c.user_id === m.from.id);
    if ((k.length === 8 && kodGecerli(k)) || (kendi && izinliTelefon(c.phone_number))) {
      await webhookKur([...ids, chat]);
      await gonder(chat, 'Bağlandı. Bu sohbet artık Mavi Boncuk yönetim bildirimlerini alacak.\n\n' + YARDIM, { reply_markup: { remove_keyboard: true } });
    } else if (c) {
      await gonder(chat, kendi ? 'Bu numara yetkili listesinde yok.' : 'Lütfen düğmeyle kendi numaranızı paylaşın.', { reply_markup: { remove_keyboard: true } });
    } else {
      await gonder(chat, `Merhaba! Bu bot mağaza içi işler için. Sipariş ve sorularınız için bize WhatsApp’tan yazabilirsiniz: ${WA}\n\nMağaza yetkilisiyseniz aşağıdaki düğmeyle numaranızı paylaşın.`, {
        reply_markup: { keyboard: [[{ text: 'Numaramı paylaş (yetkili girişi)', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }
      });
    }
    return res.end('ok');
  }
  const dosya = m.document || (m.photo && m.photo[m.photo.length - 1]);
  if (dosya) {
    if (m.document && !/^(image\/|application\/pdf)/.test(m.document.mime_type || '')) await gonder(chat, 'Yalnızca fotoğraf ya da PDF okuyabilirim.');
    else if ((dosya.file_size || 0) > 4 * 1024 * 1024) await gonder(chat, 'Dosya 4 MB’tan büyük. Daha küçük bir fotoğraf gönderebilir misiniz?');
    else await gonder(chat, 'Fiş alındı. Okumak ve kaydetmek için panelde açın (panele giriş yapmış olmanız gerekir).', {
      reply_to_message_id: m.message_id,
      reply_markup: { inline_keyboard: [[{ text: 'Panelde oku', url: `${SITE}/yonetim#tg=${encodeURIComponent(dosya.file_id)}` }]] }
    });
  } else if (/^\/takvim/.test(metin)) await gonder(chat, 'Önümüzdeki 30 gün:\n' + takvimMetni(30) + '\n\nHafta sonları ilk iş gününe kaydırıldı; resmî tatilleri müşavirinizle kontrol edin.');
  else if (/^\/duyurukapat/.test(metin)) {
    for (const id of ids) await tg('unpinAllChatMessages', { chat_id: id }).catch(() => {});
    await gonder(chat, 'Duyuru kaldırıldı. Sitede en geç 5 dakika içinde kaybolur.');
  } else if (/^\/duyuru(@\w+)?\s+\S/.test(metin)) {
    const t = metin.replace(/^\/duyuru(@\w+)?\s+/, '').trim().slice(0, 200);
    for (const id of ids) await tg('unpinAllChatMessages', { chat_id: id }).catch(() => {});
    const m = await tg('sendMessage', { chat_id: chat, text: DUYURU_ONEK + t });
    await tg('pinChatMessage', { chat_id: chat, message_id: m.message_id, disable_notification: true });
    await gonder(chat, 'Duyuru sitede en geç 5 dakika içinde görünür. Kaldırmak için /duyurukapat yazın.');
  } else if (/^\/duyuru/.test(metin)) {
    const c = await tg('getChat', { chat_id: chat });
    const p = c.pinned_message && (c.pinned_message.text || '').startsWith(DUYURU_ONEK) ? c.pinned_message.text.slice(DUYURU_ONEK.length) : '';
    await gonder(chat, p ? 'Şu an sitede görünen duyuru:\n' + esc(p) + '\n\nKaldırmak için /duyurukapat yazın.' : 'Sitede duyuru yok. Eklemek için örneğin: /duyuru Bayramda pazar günü de açığız');
  }
  else if (/^\/blog/.test(metin)) await gonder(chat, blogMetni() || 'Bugün yeni yazı yok.');
  else if (/^\/panel/.test(metin)) await gonder(chat, `${SITE}/yonetim\nGiriş: sitede WhatsApp butonunun üstündeki MB logosuna üç kez dokunun.`);
  else await gonder(chat, YARDIM);
  return res.end('ok');
}

async function gunluk(res) {
  const { ids } = await sahipler();
  const parcalar = [];
  const t = yaklasanlar(3);
  if (t.length) parcalar.push('⏰ <b>Yaklaşan vergi günleri</b>\n' + t.map((x) => `• <b>${x.tarih.split('-').reverse().join('.')}</b> ${x.ad}`).join('\n'));
  const b = blogMetni(); if (b) parcalar.push('📝 ' + b);
  if (new Date(Date.parse(bugun())).getUTCDay() === 1) parcalar.push('💾 Pazartesi hatırlatması: panelde Rapor ve yedek → “Yedeği indir”.');
  for (const id of ids) if (parcalar.length) await gonder(id, 'Günaydın!\n\n' + parcalar.join('\n\n')).catch(() => {});
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify({ gonderilen: parcalar.length ? ids.length : 0 }));
}

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://x');
  const hazir = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.MB_YONETIM_IMZA);
  try {
    // Telegram webhook
    if (req.method === 'POST' && req.headers['x-telegram-bot-api-secret-token']) {
      const h = String(req.headers['x-telegram-bot-api-secret-token']); const g = gizliBaslik();
      if (!hazir || h.length !== g.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(g))) { res.statusCode = 401; return res.end(); }
      let govde = ''; for await (const p of req) { govde += p; if (govde.length > 200000) break; }
      return await webhook(req, res, JSON.parse(govde || '{}'));
    }
    // sabah özeti (Vercel zamanlayıcısı)
    if (req.method === 'GET' && url.searchParams.get('gunluk')) {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) { res.statusCode = 401; return res.end(); }
      if (!hazir) return res.end('{"gonderilen":0}');
      return await gunluk(res);
    }
    // buradan sonrası yalnızca panele giriş yapmış kişi için
    if (!oturumGecerli(req)) { res.statusCode = 401; return res.end('{"ok":false}'); }
    if (!hazir) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end('{"ok":false,"hata":"TELEGRAM_BOT_TOKEN tanımlı değil"}'); }

    if (req.method === 'GET' && url.searchParams.get('dosya')) {
      const f = await tg('getFile', { file_id: url.searchParams.get('dosya') });
      if (!f.file_path || (f.file_size || 0) > 4 * 1024 * 1024) { res.statusCode = 413; return res.end(); }
      const r = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${f.file_path}`);
      const tur = /\.pdf$/i.test(f.file_path) ? 'application/pdf' : /\.png$/i.test(f.file_path) ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', tur);
      return res.end(Buffer.from(await r.arrayBuffer()));
    }

    if (req.method === 'POST') {
      let govde = ''; for await (const p of req) { govde += p; if (govde.length > 2000) break; }
      const { islem } = JSON.parse(govde || '{}');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const { url: wurl, ids } = await sahipler();
      if (islem === 'etkinlestir' || (islem === 'kod' && !wurl)) await webhookKur(ids);
      if (islem === 'kod' || islem === 'etkinlestir') {
        const me = await tg('getMe');
        return res.end(JSON.stringify({ ok: true, kod: kod(pencere()), bot: me.username, bagli: ids.length }));
      }
      if (islem === 'durum') return res.end(JSON.stringify({ ok: true, etkin: !!wurl, bagli: ids.length }));
      if (islem === 'deneme') { for (const id of ids) await gonder(id, 'Deneme mesajı: panel ile bot arasındaki bağlantı çalışıyor. ✅'); return res.end(JSON.stringify({ ok: true, bagli: ids.length })); }
      if (islem === 'sifirla') { await webhookKur([]); return res.end(JSON.stringify({ ok: true, bagli: 0 })); }
      res.statusCode = 400; return res.end('{"ok":false}');
    }
    res.statusCode = 405; return res.end();
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, hata: e.message }));
  }
};
