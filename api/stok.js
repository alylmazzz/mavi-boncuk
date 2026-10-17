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
const sayi = (s) => { const t = String(s || '').replace(/[^\d,.]/g, ''); if (!t) return null; const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); return Number.isFinite(n) && n > 0 ? n : null; };
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
