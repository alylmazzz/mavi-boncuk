// Sitedeki yönetici modunun ürün değişiklikleri (Vercel Blob: urunler/duzen.json).
// GET  /api/urunler              -> {guncel:{id:{alan}}, yeni:[ürün], silinen:[id], ortak_fiyat}
//                                   (herkese açık, 1 dk önbellek)
// GET  /api/urunler?taze=1       -> aynısı önbelleksiz (yalnızca yönetici çereziyle)
// POST /api/urunler {islem, ...} -> guncelle {id, alanlar} | sil {id} | geri {id} | ekle {urun}
//                                   | varsayilan {fiyat, sifirla}          (yönetici çerezi gerekir)
// POST /api/urunler?gorsel=1&id= -> gövde webp/jpeg fotoğraf, Blob'a yüklenir, {url} döner
// Temel liste data/urunler.json'da kalır; site.js açılışta bu değişiklikleri üstüne uygular.
// Silinen ürün kaybolmaz, "silinen"e yazılır; yönetici "Silinenler"den geri alabilir.
const crypto = require('crypto');
const { put, head, BlobNotFoundError, BlobPreconditionFailedError } = require('@vercel/blob');
const { oturumGecerli } = require('./_lib/oturum');

const BLOB = 'https://dzq8aevittl4dwp1.public.blob.vercel-storage.com';
const DOSYA = 'urunler/duzen.json';
const BOS = () => ({ guncel: {}, yeni: [], silinen: [], ortak_fiyat: null });
const METIN = ['ad', 'kisa', 'aciklama', 'kumas', 'yikama', 'stok_notu', 'teslim', 'degisim', 'yas_yazi'];
const KATEGORI = ['abiye', 'takim-elbise', 'gunluk', 'okul', 'bebek', 'aksesuar'];

// Ziyaretçi okuması: CDN'den, 1 dk önbellekli (ucuz).
async function okuCdn() {
  const r = await fetch(`${BLOB}/${DOSYA}`);
  if (r.status === 404) return BOS();
  if (!r.ok) throw new Error('blob ' + r.status);
  return { ...BOS(), ...(await r.json()) };
}

// Yazmadan önceki ve yönetici okuması: TAZE olduğu doğrulanmış içerik + güçlü etag.
// Önemli: public blob adresi önbelleklidir (yazmadan sonra 1 dakikaya kadar eski
// içerik gelir); oradan okuyup üstüne yazmak önceki kaydı siler. get({useCache:false})
// yalnızca private blob'da önbelleği atlar; public'te CDN'in ZAYIF etag'ini (W/"...")
// verir ve ifMatch onu hiç kabul etmez (23-26.10: her kayıt "ETag mismatch" ile düştü).
// Bu yüzden: head() güncel etag'i verir (etag = içeriğin md5'i); her yazmada içeriğin
// değişmez bir kopyası da adı md5'i olacak şekilde yazılır (urunler/surum/<md5>.json).
// O adres yalnızca o içeriği taşıdığı için önbellekte bayat kalamaz. Kopyası olmayan
// eski içerikte asıl adresten okunur, md5 tutana kadar beklenir.
const md5 = (b) => `"${crypto.createHash('md5').update(b).digest('hex')}"`;
const SURUM = (etag) => `urunler/surum/${String(etag).replace(/"/g, '')}.json`;

async function okuTaze() {
  for (let i = 0; i < 40; i++) {
    let h;
    try { h = await head(DOSYA); } catch (e) {
      if (e instanceof BlobNotFoundError) return { veri: BOS(), etag: null };
      throw e;
    }
    for (const u of [`${BLOB}/${SURUM(h.etag)}`, `${h.url}?t=${Date.now()}`]) {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) continue;
      const ham = Buffer.from(await r.arrayBuffer());
      if (md5(ham) === h.etag) return { veri: { ...BOS(), ...JSON.parse(ham.toString('utf8') || '{}') }, etag: h.etag };
    }
    await new Promise((s) => setTimeout(s, 1500));
  }
  throw new Error('Kayıt dosyası henüz güncellenmedi, birkaç saniye sonra yeniden deneyin.');
}

// Önce değişmez kopya, sonra asıl dosya (koşullu): okuyan, head()'in verdiği her
// etag için kopyayı hazır bulur. Asıl yazma çakışırsa kopya sahipsiz kalır, zararsız.
async function yaz(d, etag) {
  const metin = JSON.stringify(d);
  await put(SURUM(md5(Buffer.from(metin))), metin, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
  });
  return put(DOSYA, metin, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : {})
  });
}

// Değişikliği her zaman TAZE verinin üstüne uygular; araya başka bir kayıt
// girdiyse (etag tutmazsa) baştan okuyup yeniden dener. uygula() bir hata kodu
// döndürürse hiç yazılmaz.
async function degistir(uygula, kere = 4) {
  for (let i = 1; ; i++) {
    const { veri, etag } = await okuTaze();
    const kod = uygula(veri);
    if (kod) return { kod };
    try {
      await yaz(veri, etag);
      return { veri };
    } catch (e) {
      const cakisma = e instanceof BlobPreconditionFailedError || /precondition|412/i.test(String((e && e.message) || ''));
      if (!cakisma || i >= kere) throw e;
    }
  }
}

// Türkçe yazım: "1.890" bin sekiz yüz doksandır, 1,89 değil. "1.890,50" ondalıklı,
// "19.99" ise ondalık nokta. Yanlış ayrıştırma fiyatı sessizce bozduğu için
// (1.890 TL -> 1,89 TL) ayırıcıyı yazıma bakarak seçiyoruz.
const tutar = (v) => {
  let t = String(v == null ? '' : v).replace(/[^\d,.]/g, '');
  if (!t) return null;
  const virgul = t.lastIndexOf(','), nokta = t.lastIndexOf('.');
  if (virgul >= 0 && nokta >= 0) t = virgul > nokta ? t.replace(/\./g, '').replace(/,/g, '.') : t.replace(/,/g, '');
  else if (virgul >= 0) t = t.replace(/,/g, '.');
  else if (nokta >= 0 && (t.split('.').length > 2 || t.length - nokta - 1 === 3)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

// Yalnızca bilinen alanlar, makul uzunlukta. null/boş metin "bilgi yok" demektir.
function temizle(a) {
  const o = {};
  for (const k of METIN) if (k in a) { const v = a[k] == null ? '' : String(a[k]).trim().slice(0, k === 'aciklama' ? 3000 : 300); o[k] = v || null; }
  for (const k of ['fiyat', 'eski_fiyat']) if (k in a) o[k] = tutar(a[k]);
  for (const k of ['gizle', 'vitrin']) if (k in a) o[k] = !!a[k];
  if ('kategori' in a && KATEGORI.includes(a.kategori)) o.kategori = a.kategori;
  if ('cinsiyet' in a && ['kiz', 'erkek', 'unisex'].includes(a.cinsiyet)) o.cinsiyet = a.cinsiyet;
  if ('durum' in a) o.durum = a.durum === 'tükendi' ? 'tükendi' : null;
  if ('yas_araligi' in a) {
    const [x, y] = Array.isArray(a.yas_araligi) ? a.yas_araligi.map(Number) : [];
    o.yas_araligi = Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y <= 18 && x <= y ? [x, y] : null;
  }
  if ('gorseller' in a && Array.isArray(a.gorseller)) {
    o.gorseller = a.gorseller.map(String).filter((g) => g.startsWith('/assets/img/urunler/') || g.startsWith(BLOB + '/urunler/')).slice(0, 12);
  }
  return o;
}

const govdeOku = async (req, sinir) => {
  const parcalar = []; let n = 0;
  for await (const p of req) { n += p.length; if (n > sinir) throw new Error('büyük'); parcalar.push(p); }
  return Buffer.concat(parcalar);
};
const hata = (res, kod) => { res.statusCode = kod; return res.end('{"ok":false}'); };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  const url = new URL(req.url, 'http://x');
  const yonetici = oturumGecerli(req, 'admin');

  if (req.method === 'GET') {
    const taze = !!url.searchParams.get('taze') && yonetici;
    res.setHeader('Cache-Control', taze ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300');
    try { return res.end(JSON.stringify(taze ? (await okuTaze()).veri : await okuCdn())); } catch (e) { return res.end(JSON.stringify(BOS())); }
  }

  if (req.method !== 'POST') return hata(res, 405);
  res.setHeader('Cache-Control', 'no-store');
  const kaynak = req.headers.origin;
  if (!yonetici || (kaynak && new URL(kaynak).host !== req.headers.host)) return hata(res, 401);

  try {
    if (url.searchParams.get('gorsel')) {
      const tur = String(req.headers['content-type'] || '');
      if (!/^image\/(webp|jpeg|png)$/.test(tur)) return hata(res, 415);
      const id = String(url.searchParams.get('id') || 'yeni').replace(/[^a-z0-9-]/g, '').slice(0, 80) || 'yeni';
      const veri = await govdeOku(req, 4 * 1024 * 1024);
      const b = await put(`urunler/${id}/${Date.now()}.${tur.split('/')[1].replace('jpeg', 'jpg')}`, veri, { access: 'public', addRandomSuffix: true, contentType: tur });
      return res.end(JSON.stringify({ ok: true, url: b.url }));
    }

    const g = JSON.parse((await govdeOku(req, 64 * 1024)).toString('utf8') || '{}');
    const id = String(g.id || (g.urun && g.urun.id) || '').replace(/[^a-z0-9-]/g, '').slice(0, 80);
    if (g.islem !== 'varsayilan' && !id) return hata(res, 400);

    // Değişiklik her denemede yeniden okunan taze verinin üstüne uygulanır.
    const { veri, kod } = await degistir((d) => {
      if (g.islem === 'varsayilan') {
        // ortak fiyat: tek tek fiyatı girilmemiş ürünler bununla görünür; boşsa "-"
        d.ortak_fiyat = tutar(g.fiyat);
        delete d.varsayilan_fiyat; delete d.hepsi_varsayilan;
        // "hepsine uygula": tek tek girilmiş fiyatlar bırakılır
        if (g.sifirla) {
          for (const k of Object.keys(d.guncel)) { delete d.guncel[k].fiyat; delete d.guncel[k].eski_fiyat; }
          d.yeni.forEach((u) => { u.fiyat = null; u.eski_fiyat = null; });
        }
        return 0;
      }

      const yeni = d.yeni.find((u) => u.id === id);
      if (g.islem === 'guncelle') {
        const a = temizle(g.alanlar || {});
        if (yeni) Object.assign(yeni, a); else d.guncel[id] = { ...(d.guncel[id] || {}), ...a };
      } else if (g.islem === 'sil') {
        if (!d.silinen.includes(id)) d.silinen.push(id);
      } else if (g.islem === 'geri') {
        d.silinen = d.silinen.filter((x) => x !== id);
      } else if (g.islem === 'ekle') {
        const u = { id, ...temizle(g.urun || {}), tarih: new Date().toISOString().slice(0, 10) };
        if (!u.ad || !u.gorseller || !u.gorseller.length || yeni) return 400;
        d.yeni.unshift(u);
      } else return 400;
      return 0;
    });
    if (kod) return hata(res, kod);
    return res.end(JSON.stringify({ ok: true, veri }));
  } catch (e) {
    res.statusCode = 500; return res.end(JSON.stringify({ ok: false, hata: String(e.message || e) }));
  }
};
