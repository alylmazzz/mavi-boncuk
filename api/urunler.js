// Sitedeki yönetici modunun ürün değişiklikleri (Vercel Blob: urunler/duzen.json).
// GET  /api/urunler              -> {guncel:{id:{alan}}, yeni:[ürün], silinen:[id], ortak_fiyat}
//                                   (herkese açık, 1 dk önbellek)
// GET  /api/urunler?taze=1       -> aynısı önbelleksiz (yalnızca yönetici çereziyle)
// POST /api/urunler {islem, ...} -> guncelle {id, alanlar} | sil {id} | geri {id} | ekle {urun}
//                                   | varsayilan {fiyat, sifirla}          (yönetici çerezi gerekir)
// POST /api/urunler?gorsel=1&id= -> gövde webp/jpeg fotoğraf, Blob'a yüklenir, {url} döner
// Temel liste data/urunler.json'da kalır; site.js açılışta bu değişiklikleri üstüne uygular.
// Silinen ürün kaybolmaz, "silinen"e yazılır; yönetici "Silinenler"den geri alabilir.
const { put } = require('@vercel/blob');
const { oturumGecerli } = require('./_lib/oturum');

const BLOB = 'https://dzq8aevittl4dwp1.public.blob.vercel-storage.com';
const DOSYA = 'urunler/duzen.json';
const BOS = () => ({ guncel: {}, yeni: [], silinen: [], ortak_fiyat: null });
const METIN = ['ad', 'kisa', 'aciklama', 'kumas', 'yikama', 'stok_notu', 'teslim', 'degisim', 'yas_yazi'];
const KATEGORI = ['abiye', 'takim-elbise', 'gunluk', 'okul', 'bebek', 'aksesuar'];

async function oku(taze) {
  const r = await fetch(`${BLOB}/${DOSYA}${taze ? `?t=${Date.now()}` : ''}`, taze ? { cache: 'no-store' } : {});
  if (r.status === 404) return BOS();
  if (!r.ok) throw new Error('blob ' + r.status);
  return { ...BOS(), ...(await r.json()) };
}
const yaz = (d) => put(DOSYA, JSON.stringify(d), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });

const tutar = (v) => {
  const t = String(v == null ? '' : v).replace(/[^\d,.]/g, '');
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
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
    const taze = url.searchParams.get('taze') && yonetici;
    res.setHeader('Cache-Control', taze ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300');
    try { return res.end(JSON.stringify(await oku(taze))); } catch (e) { return res.end(JSON.stringify(BOS())); }
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
    const d = await oku(true);

    if (g.islem === 'varsayilan') {
      // ortak fiyat: tek tek fiyatı girilmemiş ürünler bununla görünür; boşsa "-"
      d.ortak_fiyat = tutar(g.fiyat);
      delete d.varsayilan_fiyat; delete d.hepsi_varsayilan;
      // "hepsine uygula": tek tek girilmiş fiyatlar bırakılır
      if (g.sifirla) {
        for (const k of Object.keys(d.guncel)) { delete d.guncel[k].fiyat; delete d.guncel[k].eski_fiyat; }
        d.yeni.forEach((u) => { u.fiyat = null; u.eski_fiyat = null; });
      }
      await yaz(d);
      return res.end(JSON.stringify({ ok: true, veri: d }));
    }

    const id = String(g.id || (g.urun && g.urun.id) || '').replace(/[^a-z0-9-]/g, '').slice(0, 80);
    if (!id) return hata(res, 400);
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
      if (!u.ad || !u.gorseller || !u.gorseller.length || yeni) return hata(res, 400);
      d.yeni.unshift(u);
    } else return hata(res, 400);

    await yaz(d);
    return res.end(JSON.stringify({ ok: true, veri: d }));
  } catch (e) {
    res.statusCode = 500; return res.end(JSON.stringify({ ok: false, hata: String(e.message || e) }));
  }
};
