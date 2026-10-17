// /blog/:slug — tek yazı. Tarihi gelmemiş yazı 404 döner.
const { bul, yayindakiler, sayfa, esc, tarihYazi, KATEGORI, geceYarisinaSaniye, SITE } = require('./_lib/blog');

module.exports = (req, res) => {
  const slug = new URL(req.url, 'http://x').searchParams.get('slug') || '';
  const y = bul(slug);
  res.setHeader('Cache-Control', `public, s-maxage=${geceYarisinaSaniye()}, stale-while-revalidate=300`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!y) {
    res.statusCode = 404;
    return res.end(sayfa({
      baslik: 'Yazı bulunamadı · Mavi Boncuk', aciklama: 'Aradığınız yazı bulunamadı.', yol: '/blog',
      govde: '<main class="blog"><h1>Bu yazı burada değil</h1><p class="blog__lead">Adres değişmiş olabilir. <a class="link" href="/blog">Bütün yazılar</a></p></main>'
    }));
  }

  const hepsi = yayindakiler();
  const benzer = hepsi.filter((x) => x.kategori === y.kategori && x.slug !== y.slug).slice(0, 3);
  const i = hepsi.findIndex((x) => x.slug === y.slug);
  const onceki = hepsi[i + 1], sonraki = hepsi[i - 1];

  const govde = `<main class="post">
  <nav class="post__crumb" aria-label="Konum"><a href="/">Ana sayfa</a> / <a href="/blog">Blog</a> / <a href="/blog?kategori=${y.kategori}">${KATEGORI[y.kategori] || ''}</a></nav>
  <article>
    <h1>${esc(y.baslik)}</h1>
    <p class="post__meta"><time datetime="${y.tarih}">${tarihYazi(y.tarih)}</time> · Mavi Boncuk, Ortaca</p>
    <div class="post__body">
${y.govde}
    </div>
  </article>
  <aside class="post__cta">
    <p>Aklınıza takılan bir şey varsa yazın, ürünü elimize alıp bakalım.</p>
    <a class="button" data-wa href="https://wa.me/905057458364?text=${encodeURIComponent(`Merhaba, blogda “${y.baslik}” yazısını okudum. Bir sorum var:`)}">WhatsApp’tan sor</a>
    <a class="button button--paper" href="/#askidakiler">Ürünlere bak</a>
  </aside>
  ${benzer.length ? `<section class="post__more"><h2>Bunlar da işinize yarayabilir</h2><ul>${benzer.map((b) => `<li><a href="/blog/${b.slug}">${esc(b.baslik)}</a></li>`).join('')}</ul></section>` : ''}
  <nav class="post__pager" aria-label="Diğer yazılar">
    ${onceki ? `<a href="/blog/${onceki.slug}">← ${esc(onceki.baslik)}</a>` : '<span></span>'}
    ${sonraki ? `<a href="/blog/${sonraki.slug}">${esc(sonraki.baslik)} →</a>` : ''}
  </nav>
</main>`;

  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: y.baslik, description: y.ozet,
      datePublished: y.tarih, dateModified: y.tarih, inLanguage: 'tr-TR', keywords: (y.anahtar || []).join(', '),
      mainEntityOfPage: `${SITE}/blog/${y.slug}`, image: `${SITE}/assets/img/site/og.jpg`,
      author: { '@type': 'Organization', name: 'Mavi Boncuk Bebe Mağazası', url: SITE },
      publisher: { '@type': 'Organization', name: 'Mavi Boncuk Bebe Mağazası', logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/site/mb-logo-64.png` } }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: y.baslik, item: `${SITE}/blog/${y.slug}` }
      ]
    }
  ];
  res.end(sayfa({ baslik: `${y.baslik} · Mavi Boncuk`, aciklama: y.ozet, yol: `/blog/${y.slug}`, govde, jsonld, tur: 'article' }));
};
