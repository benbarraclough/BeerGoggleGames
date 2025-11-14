// Mobile menu hash sync and Back-to-top
(function () {
  const toggle = document.getElementById('nav-toggle');
  function sync() {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', location.hash === '#site-menu' ? 'true' : 'false');
  }
  window.addEventListener('hashchange', sync);
  sync();
  document.querySelectorAll('#site-menu [data-close]').forEach(a =>
    a.addEventListener('click', () => {
      history.replaceState(null, '', location.pathname + location.search);
      sync();
    }),
  );
})();

(function () {
  const topBtn = document.getElementById('back-to-top');
  if (topBtn)
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
