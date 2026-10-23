// /api/stok — mağazanın Google E-Tablolar'daki fiyat/stok tablosunu okur.
// Tablo "Dosya > Paylaş > Web'de yayınla > CSV" ile yayınlanır, bağlantısı Vercel'de SHEET_CSV_URL ortam değişkenine yazılır.
// Sütunlar: id, ad, fiyat, durum (stokta / tükendi / gizle), not. Tablo yoksa boş döner; site eski bilgilerle çalışır.

function csvSatirlari(metin) {
  const satirlar = []; let satir = [], hucre = '', tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') { hucre += '"'; i++; }
      else if (c === '"') tirnak = false;
      else hucre += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(hucre); hucre = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && metin[i + 1] === '\n') i++; satir.push(hucre); satirlar.push(satir); satir = []; hucre = ''; }
    else hucre += c;
  }
  if (hucre || satir.length) { satir.push(hucre); satirlar.push(satir); }
  return satirlar;
}
// "1.890" bin sekiz yüz doksan (api/urunler.js tutar() ile aynı kural)
const sayi = (s) => {
  let t = String(s == null ? '' : s).replace(/[^\d,.]/g, '');
  if (!t) return null;
  const virgul = t.lastIndexOf(','), nokta = t.lastIndexOf('.');
  if (virgul >= 0 && nokta >= 0) t = virgul > nokta ? t.replace(/\./g, '').replace(/,/g, '.') : t.replace(/,/g, '');
  else if (virgul >= 0) t = t.replace(/,/g, '.');
  else if (nokta >= 0 && (t.split('.').length > 2 || t.length - nokta - 1 === 3)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const durumu = (s) => { const t = String(s || '').trim().toLocaleLowerCase('tr'); if (/t[üu]kend|yok/.test(t)) return 'tükendi'; if (/gizle|kald[ıi]r/.test(t)) return 'gizle'; return t ? 'stokta' : null; };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // tablo değişikliği en geç 5 dakikada siteye yansır
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  const url = process.env.SHEET_CSV_URL;
  if (!url) return res.end('{}');
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('tablo ' + r.status);
    const [baslik, ...satirlar] = csvSatirlari(await r.text());
    const idx = (ad) => baslik.findIndex((b) => b.replace(/^﻿/, '').trim().toLocaleLowerCase('tr') === ad);
    const [iId, iFiyat, iDurum, iNot] = ['id', 'fiyat', 'durum', 'not'].map(idx);
    const out = {};
    for (const s of satirlar) {
      const id = (s[iId] || '').trim();
      if (!id) continue;
      out[id] = { fiyat: iFiyat >= 0 ? sayi(s[iFiyat]) : null, durum: iDurum >= 0 ? durumu(s[iDurum]) : null, not: iNot >= 0 ? (s[iNot] || '').trim() || null : null };
    }
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 200;
    res.end('{}');
  }
};
