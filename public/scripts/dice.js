// Dice roller animation externalized
(function () {
  const canvas = document.getElementById('dice');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  const countSel = document.getElementById('dice-count');
  const btn = document.getElementById('roll-dice');
  const result = document.getElementById('dice-result');
  function resize() {
    const bb = canvas.getBoundingClientRect();
    canvas.width = Math.floor(bb.width * DPR);
    canvas.height = Math.floor(bb.height * DPR);
    drawAll([1]);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();
  function drawDie(n, cx, cy, s, tilt = 0, rot = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    const skew = tilt * 0.35;
    ctx.transform(1, 0, skew, 1, 0, 0);
    const r = s / 9;
    const left = -s / 2,
      top = -s / 2;
    ctx.save();
    if (ctx.resetTransform) ctx.resetTransform();
    ctx.translate(cx, cy + s * 0.45);
    ctx.scale(1, 0.2);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.filter = 'blur(12px)';
    ctx.fill();
    ctx.restore();
    const body = ctx.createLinearGradient(left, top, left, top + s);
    body.addColorStop(0, 'rgba(255,255,255,0.10)');
    body.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = body;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(2, s / 60);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left, top, s, s, s / 8);
    else ctx.rect(left, top, s, s);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left, top + s * 0.2);
    ctx.lineTo(left, top + s - s * 0.2);
    ctx.moveTo(left + s, top + s * 0.2);
    ctx.lineTo(left + s, top + s - s * 0.2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = s / 110;
    ctx.stroke();
    const off = s / 4.2;
    const positions = {
      1: [[0, 0]],
      2: [
        [-off, -off],
        [off, off],
      ],
      3: [
        [-off, -off],
        [0, 0],
        [off, off],
      ],
      4: [
        [-off, -off],
        [off, -off],
        [-off, off],
        [off, off],
      ],
      5: [
        [-off, -off],
        [off, -off],
        [0, 0],
        [-off, off],
        [off, off],
      ],
      6: [
        [-off, -off],
        [off, -off],
        [-off, 0],
        [off, 0],
        [-off, off],
        [off, off],
      ],
    }[n];
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    positions.forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  function layoutPositions(n) {
    const cols = Math.min(3, n);
    const rows = Math.ceil(n / cols);
    const W = canvas.width,
      H = canvas.height;
    const s = Math.min(W / (cols * 2.2), H / (rows * 2.2)) * 1.0;
    const xGap = W / cols,
      yGap = H / rows;
    const pos = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const cx = (col + 0.5) * xGap;
      const cy = (row + 0.5) * yGap;
      pos.push([cx, cy, s]);
    }
    return pos;
  }
  function drawAll(vals, tilt = 0, rot = 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pos = layoutPositions(vals.length);
    vals.forEach((v, i) => drawDie(v, pos[i][0], pos[i][1], pos[i][2], tilt, rot));
  }
  function roll() {
    const n = Math.max(1, Math.min(6, parseInt(countSel.value || '1', 10) || 1));
    const spins = 24 + Math.floor(Math.random() * 10);
    let frame = 0;
    const vals = Array.from({ length: n }, () => 1);
    const timer = setInterval(() => {
      for (let i = 0; i < n; i++) vals[i] = 1 + Math.floor(Math.random() * 6);
      const t = frame / spins;
      const ease = 1 - Math.pow(1 - Math.min(1, t), 3);
      const tilt = (1 - ease) * 1.0;
      const rot = (1 - ease) * Math.PI * 2;
      drawAll(vals, tilt, rot);
      frame++;
      if (frame >= spins) {
        clearInterval(timer);
        for (let i = 0; i < n; i++) vals[i] = 1 + Math.floor(Math.random() * 6);
        drawAll(vals, 0, 0);
        const total = vals.reduce((a, b) => a + b, 0);
        if (result) result.textContent = `Result: ${vals.join(' + ')} = ${total}`;
      }
    }, 35);
  }
  btn?.addEventListener('click', roll);
})();
