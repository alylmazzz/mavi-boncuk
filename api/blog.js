// /blog: yayındaki yazıların listesi (?kategori= ile süzülür). ?format=json ana sayfadaki son yazılar için.
const { yayindakiler, sayfa, esc, tarihYazi, KATEGORI, geceYarisinaSaniye, SITE } = require('./_lib/blog');

module.exports = (req, res) => {
  const url = new URL(req.url, 'http://x');
  const kat = url.searchParams.get('kategori');
  let list = yayindakiler();
  res.setHeader('Cache-Control', `public, s-maxage=${geceYarisinaSaniye()}, stale-while-revalidate=300`);

  if (url.searchParams.get('format') === 'json') {
    const n = Math.min(12, Number(url.searchParams.get('adet')) || 3);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(list.slice(0, n).map(({ slug, baslik, ozet, tarih, kategori }) => ({ slug, baslik, ozet, tarih, kategori }))));
  }

  if (kat && KATEGORI[kat]) list = list.filter((y) => y.kategori === kat);
  const sayac = {};
  for (const y of yayindakiler()) sayac[y.kategori] = (sayac[y.kategori] || 0) + 1;

  const filtre = `<nav class="blog__kats" aria-label="Konular">
    <a class="blog__kat" href="/blog"${!kat ? ' aria-current="page"' : ''}>Hepsi</a>
    ${Object.entries(KATEGORI).filter(([k]) => sayac[k]).map(([k, ad]) => `<a class="blog__kat" href="/blog?kategori=${k}"${kat === k ? ' aria-current="page"' : ''}>${ad}</a>`).join('\n    ')}
  </nav>`;

  const kartlar = list.map((y, i) => `<li class="blog__item${i === 0 && !kat ? ' blog__item--yeni' : ''}">
      <a href="/blog/${y.slug}">
        <span class="blog__meta">${tarihYazi(y.tarih)} · ${KATEGORI[y.kategori] || ''}</span>
        <h2>${esc(y.baslik)}</h2>
        <p>${esc(y.ozet)}</p>
      </a>
    </li>`).join('\n    ');

  const baslik = kat ? `${KATEGORI[kat]} · Mavi Boncuk blog` : 'Blog · Mavi Boncuk, Ortaca çocuk giyim';
  const aciklama = 'Çocuk bedeni, abiye, okul, bayramlık ve bebek kıyafetleri üzerine Ortaca’daki Mavi Boncuk mağazasından pratik yazılar. Her gün yeni bir yazı.';
  const govde = `<main class="blog">
  <h1>Blog</h1>
  <p class="blog__lead">Beden seçimi, kumaş bakımı, özel günler ve bebek kıyafetleri üzerine kısa ve işe yarar notlar. Her gün bir yenisi ekleniyor.</p>
  ${filtre}
  <ol class="blog__list">
    ${kartlar || '<li><p>Bu konuda henüz yazı yok.</p></li>'}
  </ol>
</main>`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Blog', name: 'Mavi Boncuk blog', url: `${SITE}/blog`,
    publisher: { '@type': 'ClothingStore', name: 'Mavi Boncuk Bebe Mağazası', url: SITE },
    blogPost: list.slice(0, 20).map((y) => ({ '@type': 'BlogPosting', headline: y.baslik, url: `${SITE}/blog/${y.slug}`, datePublished: y.tarih }))
  };
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(sayfa({ baslik, aciklama, yol: kat ? `/blog?kategori=${kat}` : '/blog', govde, jsonld }));
};
