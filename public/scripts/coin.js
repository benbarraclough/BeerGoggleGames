// Coin flip animation externalized
(function () {
  const canvas = document.getElementById('coin');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  const result = document.getElementById('coin-result');
  const btn = document.getElementById('flip-coin');
  function resize() {
    const bb = canvas.getBoundingClientRect();
    canvas.width = Math.floor(bb.width * DPR);
    canvas.height = Math.floor(bb.height * DPR);
    drawCoin('Heads', 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();
  function drawCoin(faceText, tilt = 0, spin = 0) {
    const w = canvas.width,
      h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.35;
    const cx = w / 2,
      cy = h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    const ry = r * (1 - tilt * 0.7);
    ctx.save();
    if (ctx.resetTransform) ctx.resetTransform();
    ctx.translate(cx, cy + r * 0.9);
    ctx.scale(1, 0.15);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.filter = 'blur(14px)';
    ctx.fill();
    ctx.restore();
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.30)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(2, r / 10);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.88, ry * 0.88, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = Math.max(1, r / 28);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const visible = Math.max(0, 1 - tilt * 1.3);
    ctx.globalAlpha = visible;
    ctx.font = `${Math.max(14, r * 0.36)}px system-ui, sans-serif`;
    ctx.fillText(faceText, 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function flip() {
    if (!btn) return;
    btn.disabled = true;
    const target = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const duration = 1100 + Math.random() * 700;
    const start = performance.now();
    function easeOutCubic(x) {
      return 1 - Math.pow(1 - x, 3);
    }
    function animate(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const totalTurns = 3 + Math.random() * 2;
      const spin = eased * totalTurns * Math.PI * 2;
      const tilt = Math.abs(Math.sin(elapsed / 160)) * (1 - eased * 0.85);
      const showHeads = Math.sin(spin / Math.PI) >= 0;
      drawCoin(showHeads ? 'Heads' : 'Tails', tilt, spin);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        drawCoin(target, 0, 0);
        if (result) result.textContent = 'Result: ' + target;
        if (navigator.vibrate) {
          try {
            navigator.vibrate(12);
          } catch {}
        }
        btn.disabled = false;
      }
    }
    requestAnimationFrame(animate);
  }
  btn?.addEventListener('click', flip);
})();
