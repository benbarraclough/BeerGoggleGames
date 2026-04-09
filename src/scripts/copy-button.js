(() => {
  function init() {
    const btn = document.querySelector('[data-copy-button]');
    if (!btn) return;
    
    // Remove old listeners to avoid duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    const PAGE_URL = window.location.href.split('#')[0];
    
    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        await navigator.clipboard.writeText(PAGE_URL);
        newBtn.dataset.copied = 'true';
        setTimeout(() => {
          delete newBtn.dataset.copied;
        }, 1600);
      } catch (err) {
        window.prompt('Copy this URL:', PAGE_URL);
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  document.addEventListener('astro:after-swap', init);
})();
