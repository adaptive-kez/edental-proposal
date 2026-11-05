const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rails = [...document.querySelectorAll('.rail')];
function updateRail(rail) {
  const track = rail.parentElement.querySelector('.rail-progress');
  const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
  document.querySelectorAll(`[data-rail="${rail.id}"]`).forEach(button => {
    button.disabled = button.classList.contains('slider-prev') ? rail.scrollLeft <= 1 : rail.scrollLeft >= maxScroll - 1;
  });
  const counter = document.querySelector(`[data-counter="${rail.id}"]`);
  if (counter) {
    const index = Math.min(rail.children.length, Math.round(rail.scrollLeft / railStep(rail)) + 1);
    counter.textContent = `${String(index).padStart(2, '0')} / ${String(rail.children.length).padStart(2, '0')}`;
  }
  if (!track) return;
  const thumb = track.querySelector('i');
  const ratio = Math.min(1, rail.clientWidth / rail.scrollWidth);
  const progress = maxScroll > 0 ? rail.scrollLeft / maxScroll : 0;
  thumb.style.width = `${ratio * 100}%`;
  thumb.style.left = `${progress * (1 - ratio) * 100}%`;
}
function railStep(rail) {
  return (rail.firstElementChild?.getBoundingClientRect().width || 320) + (parseFloat(getComputedStyle(rail).columnGap) || 0);
}
document.querySelectorAll('[data-rail]').forEach(button => button.addEventListener('click', () => {
  const rail = document.getElementById(button.dataset.rail);
  rail.scrollBy({ left: railStep(rail) * (button.classList.contains('slider-next') ? 1 : -1), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}));
rails.forEach(rail => {
  rail.addEventListener('scroll', () => updateRail(rail), { passive: true });
  rail.addEventListener('keydown', event => {
    if (event.target !== rail) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const step = railStep(rail);
      const left = event.key === 'Home' ? 0 : event.key === 'End' ? rail.scrollWidth : rail.scrollLeft + (event.key === 'ArrowRight' ? step : -step);
      rail.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  });
  let drag = null;
  let suppressClick = false;
  rail.addEventListener('dragstart', event => event.preventDefault());
  rail.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, true);
  rail.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    suppressClick = false;
    drag = { x: event.clientX, scroll: rail.scrollLeft, moved: false };
  });
  rail.addEventListener('pointermove', event => {
    if (!drag) return;
    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 5) {
      drag.moved = true;
      suppressClick = true;
      rail.setPointerCapture(event.pointerId);
      rail.classList.add('dragging');
      rail.scrollLeft = drag.scroll - delta;
    }
  });
  const stop = () => { drag = null; rail.classList.remove('dragging'); };
  rail.addEventListener('pointerup', stop);
  rail.addEventListener('pointercancel', stop);
  rail.addEventListener('lostpointercapture', stop);
  rail.addEventListener('pointerleave', () => { if (!rail.classList.contains('dragging')) stop(); });
  new ResizeObserver(() => updateRail(rail)).observe(rail);
  updateRail(rail);
});
const questions = [...document.querySelectorAll('.faq-list button')];
questions.forEach(button => button.addEventListener('click', () => {
  const wasOpen = button.getAttribute('aria-expanded') === 'true';
  questions.forEach(item => {
    const open = item === button && !wasOpen;
    item.setAttribute('aria-expanded', String(open));
    document.getElementById(item.getAttribute('aria-controls')).hidden = !open;
  });
}));
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  const target = document.querySelector(link.getAttribute('href'));
  if (target && target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
}));
document.querySelector('#year').textContent = new Date().getFullYear();
let printState = [];
window.addEventListener('beforeprint', () => {
  printState = [...document.querySelectorAll('details')].map(item => [item, item.open]);
  printState.forEach(([item]) => { item.open = true; });
});
window.addEventListener('afterprint', () => printState.forEach(([item, open]) => { item.open = open; }));
