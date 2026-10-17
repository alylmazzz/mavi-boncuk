// Basit HTML gezgini: metin düğümlerini ve okunur öznitelikleri (alt, aria-label, placeholder, title, meta açıklamaları)
// bir fonksiyondan geçirir. script/style/svg içine ve yorumlara dokunmaz. Yalnızca bu sitenin kendi HTML'i için.
const coz = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const kodlaMetin = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kodlaOznitelik = (s) => kodlaMetin(s).replace(/"/g, '&quot;');
const harfVar = (s) => /\p{L}{2,}/u.test(s);
const OZNITELIK = /(\s)(alt|aria-label|placeholder|title|content|data-baslik)="([^"]*)"/g;

function htmlGez(html, fn) {
  return html.replace(/<!--[\s\S]*?-->|<(script|style|svg)\b[\s\S]*?<\/\1>|<title>([\s\S]*?)<\/title>|<[^>]+>|[^<]+/gi, (parca, _a, baslik) => {
    if (parca.startsWith('<!--') || /^<(script|style|svg)\b/i.test(parca)) return parca;
    if (baslik != null) { const t = fn(coz(baslik), 'title'); return t == null ? parca : `<title>${kodlaMetin(t)}</title>`; }
    if (parca.startsWith('<')) {
      const meta = /^<meta\b/i.test(parca);
      const metaOk = meta && /(name="description"|property="og:(title|description)"|name="twitter:(title|description)")/.test(parca);
      return parca.replace(OZNITELIK, (tam, bosluk, ad, deger) => {
        if (ad === 'content' && !metaOk) return tam;
        if (!harfVar(deger) || /\{\d+\}/.test(deger) && !harfVar(deger.replace(/\{\d+\}/g, ''))) return tam;
        const t = fn(coz(deger), 'attr:' + ad);
        return t == null ? tam : `${bosluk}${ad}="${kodlaOznitelik(t)}"`;
      });
    }
    if (!harfVar(parca)) return parca;
    const t = fn(coz(parca), 'text');
    return t == null ? parca : kodlaMetin(t);
  });
}

module.exports = { htmlGez, coz, harfVar };
