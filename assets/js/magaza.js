// Mağaza bilgileri: data/magaza.json içindeki değerleri [data-m] alanlarına yazar.
// Boş alanlar köşeli parantezli işaret olarak kalır ve turuncu görünür (doldurulmadığı belli olsun).
(function () {
  fetch('/data/magaza.json').then((r) => r.json()).then((m) => {
    document.querySelectorAll('[data-m]').forEach((el) => {
      const v = m[el.dataset.m];
      if (v) { el.textContent = v; el.classList.add('is-filled'); }
      else el.classList.add('is-missing');
    });
  }).catch(() => {});
})();
