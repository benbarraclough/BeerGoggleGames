// Wheel of Fortune logic externalized for CSP compliance
(function () {
  function readJSON(id, fallback = []) {
    try {
      return JSON.parse(document.getElementById(id)?.textContent || '[]') || fallback;
    } catch {
      return fallback;
    }
  }
  const cats = readJSON('__wof-data');
  const allGames = readJSON('__wof-all');
  const SLICE_COLORS = [
    'rgba(255,0,128,0.18)',
    'rgba(255,255,255,0.10)',
    'rgba(0,200,255,0.16)',
    'rgba(180,255,0,0.16)',
    'rgba(255,150,0,0.16)',
    'rgba(180,120,255,0.16)',
  ];
  function createWheel(canvas, items) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    function resize() {
      const bb = canvas.getBoundingClientRect();
      canvas.width = Math.floor(bb.width * DPR);
      canvas.height = Math.floor(bb.height * DPR);
      draw();
    }
    window.addEventListener('resize', resize, { passive: true });
    let segments = items.slice();
    let angle = -Math.PI / 2;
    let spinning = false;
    function draw() {
      const w = canvas.width,
        h = canvas.height;
      if (!w || !h) return;
      const r = Math.min(w, h) / 2 - 8 * DPR;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const n = Math.max(1, segments.length);
      const arc = (Math.PI * 2) / n;
      for (let i = 0; i < n; i++) {
        const start = angle + i * arc;
        const end = start + arc;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, start, end);
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2 * DPR;
        ctx.stroke();
        // Text
        const mid = start + arc / 2;
        ctx.save();
        ctx.rotate(mid);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(10, Math.min(18, r / 10)) * DPR}px system-ui, sans-serif`;
        const label = (segments[i] ?? '').toString();
        ctx.fillText(label, r - 12 * DPR, 0);
        ctx.restore();
      }
      // Center hub
      ctx.beginPath();
      ctx.arc(0, 0, 16 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.restore();
    }
    resize();
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function spinTo(targetIndex, onDone) {
      if (spinning || segments.length === 0) return;
      const n = segments.length;
      const arc = (Math.PI * 2) / n;
      const targetAngle = -Math.PI / 2 - (targetIndex + 0.5) * arc;
      const turns = 4 + Math.floor(Math.random() * 3);
      const startAngle = angle;
      const endAngle = targetAngle - turns * Math.PI * 2;
      const duration = 1600 + Math.random() * 600;
      const startTime = performance.now();
      spinning = true;
      function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(t);
        angle = startAngle + (endAngle - startAngle) * eased;
        draw();
        if (t < 1) requestAnimationFrame(frame);
        else {
          spinning = false;
          onDone?.(segments[targetIndex], targetIndex);
        }
      }
      requestAnimationFrame(frame);
    }
    return {
      setItems(next) {
        segments = next.slice();
        draw();
      },
      spinRandom(onDone) {
        if (segments.length === 0) return;
        const idx = Math.floor(Math.random() * segments.length);
        spinTo(idx, onDone);
      },
    };
  }
  const catCanvas = document.getElementById('cat-wheel');
  const gameCanvas = document.getElementById('game-wheel');
  const catResult = document.getElementById('category-result');
  const gameResult = document.getElementById('game-result');
  const catBtn = document.getElementById('spin-category');
  const gameBtn = document.getElementById('spin-game');
  const filterSel = document.getElementById('game-category-filter');
  const catWheel = createWheel(
    catCanvas,
    cats.map(c => c.name),
  );
  const gameWheel = createWheel(gameCanvas, allGames);
  function setGamePool() {
    const chosen = (filterSel?.value || '').trim();
    const pool = chosen ? cats.find(c => c.name === chosen)?.games || [] : allGames;
    gameWheel?.setItems(pool);
    if (gameResult) gameResult.textContent = '';
  }
  filterSel?.addEventListener('change', setGamePool);
  setGamePool();
  catBtn?.addEventListener('click', () => {
    catWheel?.spinRandom(value => {
      if (catResult) catResult.textContent = value;
      if (filterSel) {
        filterSel.value = value;
        setGamePool();
      }
    });
  });
  gameBtn?.addEventListener('click', () => {
    gameWheel?.spinRandom(value => {
      if (gameResult) gameResult.textContent = value;
    });
  });
  document.getElementById('expand-all')?.addEventListener('click', () => {
    document.querySelectorAll('details').forEach(d => (d.open = true));
  });
  document.getElementById('collapse-all')?.addEventListener('click', () => {
    document.querySelectorAll('details').forEach(d => (d.open = false));
  });
})();
