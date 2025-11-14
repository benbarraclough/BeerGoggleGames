// Home page interactions: carousel controls, reveal on scroll, parallax, and hero slideshow
(() => {
  function nudge(id, dir) {
    const el = document.querySelector(id);
    if (!el) return;
    const first = el.firstElementChild;
    let amount = el.clientWidth * 0.8;
    if (first) {
      const rect = first.getBoundingClientRect();
      const styles = getComputedStyle(el);
      let gapVal = styles.gap || styles.columnGap || '14px';
      let gap = parseFloat(gapVal);
      if (!isFinite(gap)) gap = 14;
      amount = rect.width + gap;
    }
    const next = el.scrollLeft + amount * (dir || 1);
    const target = Math.max(0, Math.min(next, el.scrollWidth - el.clientWidth));
    el.scrollTo({ left: target, behavior: 'smooth' });
  }
  document.querySelectorAll('.ctrl').forEach(btn => {
    btn.addEventListener('click', () =>
      nudge(btn.getAttribute('data-target'), Number(btn.getAttribute('data-dir'))),
    );
  });

  // Reveal on scroll
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll('[data-animate]').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('[data-animate]').forEach(el => el.classList.add('in'));
  }

  // Parallax
  if (!reduce) {
    let ticking = false;
    function update() {
      ticking = false;
      document.querySelectorAll('.will-parallax').forEach(el => {
        const s = Number(el.getAttribute('data-parallax') || 0.05);
        const r = el.getBoundingClientRect();
        const rel = (r.top - innerHeight / 2) / innerHeight;
        const baseRot = el.classList.contains('c1') ? -4 : el.classList.contains('c2') ? 3 : 0;
        el.style.transform = `translateY(${rel * s * 100}px) rotate(${baseRot}deg)`;
      });
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
  }

  // Slideshow
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  if (slides.length > 1) {
    let i = 0;
    setInterval(() => {
      slides[i]?.classList.remove('active');
      i = (i + 1) % slides.length;
      slides[i]?.classList.add('active');
    }, 3500);
  }
})();
