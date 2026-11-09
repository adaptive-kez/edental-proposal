(function () {
  'use strict';
  for (const image of document.querySelectorAll('#cases img[data-case-image]')) {
    const source = image.getAttribute('src');
    if (!source) continue;
    const original = source.split(/[?#]/, 1)[0];
    let attempts = 0;
    let pending = null;
    let notice;
    const loaded = () => {
      if (pending !== null) clearTimeout(pending);
      pending = null;
      image.dataset.loadState = 'loaded';
      if (notice) notice.remove();
      notice = undefined;
    };
    image.addEventListener('load', loaded);
    const retry = () => {
      if (pending !== null) return;
      if (image.complete && image.naturalWidth > 0) return loaded();
      if (attempts >= 2) {
        image.dataset.loadState = 'failed';
        if (!notice) {
          notice = document.createElement('span');
          notice.className = 'case-image-status';
          notice.dataset.exportIgnore = '';
          notice.setAttribute('role', 'status');
          notice.textContent = 'Не удалось загрузить обложку';
          image.after(notice);
        }
        return;
      }
      attempts += 1;
      const attempt = attempts;
      image.dataset.loadState = 'retrying';
      pending = setTimeout(() => {
        pending = null;
        image.src = original + '?retry=' + attempt;
      }, attempt * 700);
    };
    image.addEventListener('error', retry);
    if (image.complete) {
      if (image.naturalWidth === 0) retry();
      else loaded();
    }
  }
})();
