/** Generates polished mock "design screen" images so the app is testable
 *  without uploading anything (PRD: sample project / empty state).
 *  Six distinct layouts: aurora hero, pastel dashboard, sunset showcase,
 *  pricing, portfolio grid, and one tall landing page for the Scroll template. */

type Ctx = CanvasRenderingContext2D;

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
  ctx.fillStyle = fill;
  ctx.fill();
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Card with a soft drop shadow. */
function card(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.save();
  ctx.shadowColor = 'rgba(24,28,45,0.10)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  rr(ctx, x, y, w, h, r, fill);
  ctx.restore();
}

/** Soft radial color blobs over a base fill — the "mesh gradient" look. */
function mesh(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  blobs: Array<[hex: string, cx: number, cy: number, r: number, a: number]>,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (const [hex, cx, cy, r, a] of blobs) {
    const g = ctx.createRadialGradient(x + cx, y + cy, 0, x + cx, y + cy, r);
    g.addColorStop(0, hexToRgba(hex, a));
    g.addColorStop(1, hexToRgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

let grainPattern: CanvasPattern | null = null;
function grain(ctx: Ctx, x: number, y: number, w: number, h: number, alpha: number) {
  if (!grainPattern) {
    const g = document.createElement('canvas');
    g.width = g.height = 160;
    const gc = g.getContext('2d')!;
    const img = gc.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 26;
    }
    gc.putImageData(img, 0, 0);
    grainPattern = ctx.createPattern(g, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grainPattern!;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Rows of rounded "text" bars. */
function textBlock(ctx: Ctx, x: number, y: number, widths: number[], h: number, gap: number, fill: string) {
  widths.forEach((w, i) => rr(ctx, x, y + i * (h + gap), w, h, h / 2, fill));
}

function navBar(ctx: Ctx, w: number, fg: string, accent: string, glass?: string) {
  if (glass) rr(ctx, 0, 0, w, 84, 0, glass);
  circle(ctx, 72, 42, 15, accent);
  rr(ctx, 98, 34, 74, 16, 8, fg);
  for (let i = 0; i < 4; i++) rr(ctx, w / 2 - 220 + i * 118, 35, 78, 14, 7, fg);
  rr(ctx, w - 190, 25, 130, 36, 18, accent);
}

/* ---------------------------------------------------------------- screens */

/** 1 — Aurora hero: dark navy with teal/violet/pink glow, glass nav, centered headline. */
function drawAurora(ctx: Ctx, w: number, h: number) {
  mesh(ctx, 0, 0, w, h, '#0b1020', [
    ['#2dd4bf', w * 0.18, h * 0.12, 640, 0.5],
    ['#8b7bff', w * 0.82, h * 0.2, 700, 0.5],
    ['#ff7ad9', w * 0.55, h * 0.95, 720, 0.35],
    ['#3b82f6', w * 0.05, h * 0.85, 560, 0.3],
  ]);
  grain(ctx, 0, 0, w, h, 0.5);

  navBar(ctx, w, 'rgba(255,255,255,0.7)', '#5eead4', 'rgba(255,255,255,0.05)');

  // badge pill
  rr(ctx, w / 2 - 90, 280, 180, 34, 17, 'rgba(255,255,255,0.12)');
  // headline
  rr(ctx, w / 2 - 340, 350, 680, 52, 26, 'rgba(255,255,255,0.95)');
  rr(ctx, w / 2 - 250, 424, 500, 52, 26, 'rgba(255,255,255,0.95)');
  // subline
  rr(ctx, w / 2 - 270, 516, 540, 18, 9, 'rgba(255,255,255,0.45)');
  rr(ctx, w / 2 - 200, 548, 400, 18, 9, 'rgba(255,255,255,0.45)');
  // CTAs
  const grad = ctx.createLinearGradient(w / 2 - 200, 0, w / 2 + 200, 0);
  grad.addColorStop(0, '#5eead4');
  grad.addColorStop(1, '#8b7bff');
  ctx.beginPath();
  ctx.roundRect(w / 2 - 190, 616, 180, 52, 26);
  ctx.fillStyle = grad;
  ctx.fill();
  rr(ctx, w / 2 + 10, 616, 180, 52, 26, 'rgba(255,255,255,0.14)');
  // faint logo row
  for (let i = 0; i < 5; i++) rr(ctx, w / 2 - 410 + i * 175, 850, 130, 26, 13, 'rgba(255,255,255,0.18)');
}

/** 2 — Pastel dashboard: sidebar, stat cards, area + bar charts. */
function drawDashboard(ctx: Ctx, w: number, h: number) {
  const accent = '#6366f1';
  ctx.fillStyle = '#f4f5fb';
  ctx.fillRect(0, 0, w, h);

  // sidebar
  rr(ctx, 0, 0, 252, h, 0, '#ffffff');
  circle(ctx, 44, 46, 15, accent);
  rr(ctx, 70, 38, 90, 16, 8, '#dfe1ee');
  for (let i = 0; i < 6; i++) {
    const y = 120 + i * 58;
    if (i === 1) rr(ctx, 20, y - 12, 212, 44, 12, hexToRgba(accent, 0.12));
    circle(ctx, 44, y + 10, 9, i === 1 ? accent : '#d6d9e8');
    rr(ctx, 66, y + 2, 110, 14, 7, i === 1 ? hexToRgba(accent, 0.75) : '#e2e4f0');
  }
  rr(ctx, 20, h - 90, 212, 56, 14, '#f1f2f9');

  // header
  rr(ctx, 296, 42, 240, 26, 13, '#1f2430');
  rr(ctx, 296, 82, 150, 14, 7, '#c9cddd');
  rr(ctx, w - 470, 44, 280, 44, 22, '#ffffff');
  circle(ctx, w - 110, 66, 22, '#f0b8a4');

  // stat cards
  const cw = (w - 296 - 44 - 2 * 24) / 3;
  const chips = ['#3fbf8f', '#3fbf8f', '#e2705f'];
  for (let i = 0; i < 3; i++) {
    const x = 296 + i * (cw + 24);
    card(ctx, x, 140, cw, 148, 18, '#ffffff');
    rr(ctx, x + 24, 166, 110, 13, 7, '#c9cddd');
    rr(ctx, x + 24, 196, 140, 30, 12, '#1f2430');
    rr(ctx, x + 24, 246, 74, 22, 11, hexToRgba(chips[i], 0.16));
    rr(ctx, x + 34, 253, 54, 8, 4, chips[i]);
  }

  // area chart card
  const chX = 296, chY = 320, chW = w - 296 - 44 - 360 - 24, chH = h - chY - 44;
  card(ctx, chX, chY, chW, chH, 18, '#ffffff');
  rr(ctx, chX + 28, chY + 26, 160, 18, 9, '#1f2430');
  rr(ctx, chX + chW - 170, chY + 24, 140, 32, 16, '#f1f2f9');
  const px = chX + 28, pw = chW - 56, py = chY + 90, ph = chH - 130;
  ctx.strokeStyle = '#eceef6';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px, py + (ph / 4) * i);
    ctx.lineTo(px + pw, py + (ph / 4) * i);
    ctx.stroke();
  }
  const data = [0.55, 0.42, 0.6, 0.5, 0.72, 0.58, 0.82, 0.66, 0.9];
  const pts = data.map((v, i) => [px + (pw / (data.length - 1)) * i, py + ph * (1 - v)] as const);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    ctx.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1);
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, py, 0, py + ph);
  fillGrad.addColorStop(0, hexToRgba(accent, 0.22));
  fillGrad.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = fillGrad;
  ctx.fill();
  const hi = pts[6];
  circle(ctx, hi[0], hi[1], 7, '#ffffff');
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // bar chart card
  const bX = chX + chW + 24, bW = 360;
  card(ctx, bX, chY, bW, chH, 18, '#ffffff');
  rr(ctx, bX + 28, chY + 26, 130, 18, 9, '#1f2430');
  const bars = [0.45, 0.7, 0.55, 0.9, 0.62, 0.78];
  const bw = 30, bg = (bW - 56 - bars.length * bw) / (bars.length - 1);
  bars.forEach((v, i) => {
    const bh = (chH - 140) * v;
    const x = bX + 28 + i * (bw + bg);
    rr(ctx, x, chY + chH - 40 - bh, bw, bh, 10, i === 3 ? accent : hexToRgba(accent, 0.22));
  });
}

/** 3 — Grainy sunset hero with a card row rising from the bottom. */
function drawSunset(ctx: Ctx, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#ffe8c7');
  sky.addColorStop(0.45, '#ffb199');
  sky.addColorStop(1, '#a78bd4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, 420);
  sun.addColorStop(0, 'rgba(255,244,214,0.9)');
  sun.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, 0, 0, w, h, 0.65);

  navBar(ctx, w, 'rgba(255,255,255,0.85)', 'rgba(60,35,80,0.85)');

  rr(ctx, w / 2 - 320, 250, 640, 56, 28, 'rgba(255,255,255,0.95)');
  rr(ctx, w / 2 - 230, 330, 460, 56, 28, 'rgba(255,255,255,0.95)');
  rr(ctx, w / 2 - 210, 424, 420, 17, 9, 'rgba(80,50,100,0.5)');
  rr(ctx, w / 2 - 95, 486, 190, 52, 26, 'rgba(60,35,80,0.9)');

  // card row
  const cw = (w - 2 * 90 - 2 * 32) / 3;
  const thumbs: Array<Array<[string, number, number, number, number]>> = [
    [['#ffb199', cw * 0.3, 40, 200, 0.9], ['#a78bd4', cw * 0.85, 130, 190, 0.8]],
    [['#7dd3c8', cw * 0.25, 120, 190, 0.85], ['#ffd9a0', cw * 0.8, 30, 190, 0.9]],
    [['#93b8f5', cw * 0.7, 40, 200, 0.9], ['#f5a3c7', cw * 0.2, 130, 190, 0.8]],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 90 + i * (cw + 32);
    const y = h - 360;
    card(ctx, x, y, cw, 300, 20, 'rgba(255,255,255,0.92)');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 18, y + 18, cw - 36, 160, 14);
    ctx.clip();
    mesh(ctx, x + 18, y + 18, cw - 36, 160, '#fdf1e3', thumbs[i]);
    grain(ctx, x + 18, y + 18, cw - 36, 160, 0.4);
    ctx.restore();
    rr(ctx, x + 18, y + 200, cw * 0.55, 16, 8, '#3a3242');
    rr(ctx, x + 18, y + 230, cw * 0.75, 12, 6, '#b9b0c6');
    rr(ctx, x + 18, y + 252, cw * 0.4, 12, 6, '#b9b0c6');
  }
}

/** 4 — Pricing: three tiers, gradient middle card. */
function drawPricing(ctx: Ctx, w: number, h: number) {
  mesh(ctx, 0, 0, w, h, '#faf9f7', [
    ['#c7d2fe', w * 0.12, h * 0.1, 480, 0.5],
    ['#fbcfe8', w * 0.9, h * 0.15, 460, 0.45],
  ]);

  rr(ctx, w / 2 - 70, 90, 140, 30, 15, hexToRgba('#6366f1', 0.12));
  rr(ctx, w / 2 - 260, 148, 520, 40, 20, '#221f2e');
  rr(ctx, w / 2 - 180, 214, 360, 15, 8, '#a09aae');

  const cw = 356, gap = 34;
  const x0 = w / 2 - (3 * cw + 2 * gap) / 2;
  for (let i = 0; i < 3; i++) {
    const mid = i === 1;
    const x = x0 + i * (cw + gap);
    const y = mid ? 288 : 322;
    const ch = mid ? 620 : 552;
    if (mid) {
      ctx.save();
      ctx.shadowColor = 'rgba(90,80,200,0.35)';
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 20;
      const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
      g.addColorStop(0, '#6366f1');
      g.addColorStop(1, '#9d5cf0');
      ctx.beginPath();
      ctx.roundRect(x, y, cw, ch, 24);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    } else {
      card(ctx, x, y, cw, ch, 24, '#ffffff');
    }
    const fg = mid ? 'rgba(255,255,255,0.95)' : '#221f2e';
    const fgSoft = mid ? 'rgba(255,255,255,0.5)' : '#c6c2d1';
    rr(ctx, x + 32, y + 36, 100, 16, 8, mid ? 'rgba(255,255,255,0.8)' : '#8a8499');
    rr(ctx, x + 32, y + 74, 150, 40, 14, fg);
    rr(ctx, x + 192, y + 92, 60, 14, 7, fgSoft);
    for (let r = 0; r < 5; r++) {
      const ry = y + 160 + r * 44;
      circle(ctx, x + 42, ry + 8, 9, mid ? 'rgba(255,255,255,0.85)' : hexToRgba('#6366f1', 0.7));
      rr(ctx, x + 64, ry, cw * (0.45 + (r % 3) * 0.08), 14, 7, fgSoft);
    }
    rr(ctx, x + 32, y + ch - 90, cw - 64, 52, 26, mid ? '#ffffff' : hexToRgba('#6366f1', 0.12));
  }
}

/** 5 — Portfolio grid: dark page, mesh-gradient project tiles. */
function drawPortfolio(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#101014';
  ctx.fillRect(0, 0, w, h);
  navBar(ctx, w, 'rgba(255,255,255,0.6)', '#e2b7ff');

  rr(ctx, 90, 140, 380, 38, 19, 'rgba(255,255,255,0.95)');
  rr(ctx, 90, 200, 300, 15, 8, 'rgba(255,255,255,0.4)');
  for (let i = 0; i < 3; i++) rr(ctx, w - 90 - 340 + i * 118, 158, 100, 34, 17, i === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)');

  const meshes: Array<[string, Array<[string, number, number, number, number]>]> = [
    ['#1c1530', [['#8b7bff', 120, 60, 300, 0.8], ['#ff7ad9', 320, 240, 280, 0.7]]],
    ['#0e2320', [['#2dd4bf', 300, 80, 300, 0.8], ['#a3e635', 80, 240, 240, 0.5]]],
    ['#2a1420', [['#fb7185', 140, 200, 280, 0.8], ['#fbbf24', 340, 70, 240, 0.6]]],
    ['#101c30', [['#60a5fa', 90, 90, 280, 0.8], ['#c084fc', 340, 230, 260, 0.7]]],
    ['#241a10', [['#fb923c', 260, 220, 300, 0.8], ['#f472b6', 90, 60, 220, 0.5]]],
    ['#131f16', [['#4ade80', 120, 90, 260, 0.7], ['#22d3ee', 340, 230, 260, 0.6]]],
  ];
  const cw = (w - 2 * 90 - 2 * 30) / 3;
  const th = 236;
  for (let i = 0; i < 6; i++) {
    const x = 90 + (i % 3) * (cw + 30);
    const y = 270 + Math.floor(i / 3) * (th + 96);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cw, th, 18);
    ctx.clip();
    mesh(ctx, x, y, cw, th, meshes[i][0], meshes[i][1]);
    grain(ctx, x, y, cw, th, 0.4);
    ctx.restore();
    rr(ctx, x + 4, y + th + 20, cw * 0.5, 15, 8, 'rgba(255,255,255,0.85)');
    rr(ctx, x + 4, y + th + 48, cw * 0.32, 12, 6, 'rgba(255,255,255,0.35)');
  }
}

/** 6 — Tall landing page for the Scroll template. */
function drawLanding(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#fbfaff';
  ctx.fillRect(0, 0, w, h);

  // hero
  mesh(ctx, 0, 0, w, 980, '#fbfaff', [
    ['#c7d2fe', w * 0.2, 200, 620, 0.75],
    ['#fbcfe8', w * 0.85, 260, 560, 0.65],
    ['#a5f3e3', w * 0.55, 900, 640, 0.6],
  ]);
  grain(ctx, 0, 0, w, 980, 0.35);
  navBar(ctx, w, '#6b6880', '#4f46e5');
  rr(ctx, w / 2 - 105, 220, 210, 34, 17, 'rgba(79,70,229,0.12)');
  rr(ctx, w / 2 - 360, 290, 720, 54, 27, '#221f2e');
  rr(ctx, w / 2 - 265, 366, 530, 54, 27, '#221f2e');
  rr(ctx, w / 2 - 240, 458, 480, 17, 9, '#8b869c');
  rr(ctx, w / 2 - 190, 616 - 100, 180, 52, 26, '#4f46e5');
  rr(ctx, w / 2 + 10, 616 - 100, 180, 52, 26, '#ffffff');
  // hero app window
  card(ctx, w / 2 - 460, 610, 920, 330, 22, '#ffffff');
  rr(ctx, w / 2 - 460, 610, 920, 46, 22, '#f1f0fa');
  for (let i = 0; i < 3; i++) circle(ctx, w / 2 - 425 + i * 26, 633, 6, '#d4d1e4');
  mesh(ctx, w / 2 - 436, 680, 560, 236, '#eef1ff', [
    ['#818cf8', 160, 60, 220, 0.55],
    ['#f0abfc', 460, 180, 220, 0.5],
  ]);
  textBlock(ctx, w / 2 + 150, 700, [270, 220, 250, 180], 14, 18, '#e4e2f0');
  rr(ctx, w / 2 + 150, 840, 130, 40, 20, '#4f46e5');

  // feature rows
  for (let s = 0; s < 2; s++) {
    const y = 1060 + s * 560;
    const left = s === 0;
    const tx = left ? 120 : w - 120 - 520;
    const px = left ? w - 120 - 620 : 120;
    rr(ctx, tx, y + 90, 120, 30, 15, hexToRgba('#4f46e5', 0.12));
    rr(ctx, tx, y + 148, 440, 34, 17, '#221f2e');
    rr(ctx, tx, y + 200, 380, 34, 17, '#221f2e');
    textBlock(ctx, tx, y + 268, [480, 430, 300], 15, 16, '#c9c5d8');
    rr(ctx, tx, y + 370, 150, 16, 8, '#4f46e5');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, y + 40, 620, 400, 24);
    ctx.clip();
    mesh(ctx, px, y + 40, 620, 400, s === 0 ? '#101728' : '#fdf3ec', [
      s === 0
        ? ['#38bdf8', 180, 120, 300, 0.7]
        : ['#fb923c', 440, 120, 280, 0.55],
      s === 0
        ? ['#a78bfa', 480, 320, 300, 0.7]
        : ['#f472b6', 140, 320, 280, 0.5],
    ]);
    grain(ctx, px, y + 40, 620, 400, 0.35);
    ctx.restore();
    card(ctx, px + (left ? 60 : 400) - 40, y + 300, 260, 88, 16, '#ffffff');
    circle(ctx, px + (left ? 60 : 400) + 4, y + 344, 20, hexToRgba('#4f46e5', 0.8));
    rr(ctx, px + (left ? 60 : 400) + 40, y + 326, 130, 13, 7, '#221f2e');
    rr(ctx, px + (left ? 60 : 400) + 40, y + 350, 90, 11, 6, '#c9c5d8');
  }

  // tile grid
  const gy = 2230;
  rr(ctx, w / 2 - 200, gy, 400, 36, 18, '#221f2e');
  rr(ctx, w / 2 - 150, gy + 60, 300, 15, 8, '#8b869c');
  const cw = (w - 2 * 120 - 2 * 28) / 3;
  const tints = ['#818cf8', '#2dd4bf', '#f472b6', '#fb923c', '#60a5fa', '#a3e635'];
  for (let i = 0; i < 6; i++) {
    const x = 120 + (i % 3) * (cw + 28);
    const y = gy + 130 + Math.floor(i / 3) * 250;
    card(ctx, x, y, cw, 214, 18, '#ffffff');
    rr(ctx, x + 26, y + 26, 46, 46, 14, hexToRgba(tints[i], 0.18));
    circle(ctx, x + 49, y + 49, 10, tints[i]);
    rr(ctx, x + 26, y + 96, cw * 0.5, 15, 8, '#221f2e');
    rr(ctx, x + 26, y + 126, cw - 60, 11, 6, '#d6d3e2');
    rr(ctx, x + 26, y + 148, cw * 0.7, 11, 6, '#d6d3e2');
  }

  // CTA band
  const cy = 2870;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(120, cy, w - 240, 300, 28);
  ctx.clip();
  mesh(ctx, 120, cy, w - 240, 300, '#191233', [
    ['#4f46e5', 300, 80, 420, 0.8],
    ['#ec4899', w - 500, 240, 420, 0.6],
    ['#2dd4bf', w - 260, 30, 260, 0.5],
  ]);
  grain(ctx, 120, cy, w - 240, 300, 0.4);
  ctx.restore();
  rr(ctx, w / 2 - 260, cy + 80, 520, 38, 19, 'rgba(255,255,255,0.95)');
  rr(ctx, w / 2 - 170, cy + 142, 340, 15, 8, 'rgba(255,255,255,0.5)');
  rr(ctx, w / 2 - 90, cy + 196, 180, 50, 25, '#ffffff');

  // footer
  rr(ctx, 0, h - 220, w, 220, 0, '#14121d');
  circle(ctx, 140, h - 150, 15, '#8b7bff');
  rr(ctx, 166, h - 158, 90, 16, 8, 'rgba(255,255,255,0.7)');
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 3; r++)
      rr(ctx, w - 700 + c * 210, h - 165 + r * 38, 90 + (r % 2) * 30, 12, 6, 'rgba(255,255,255,0.3)');
  rr(ctx, 140, h - 70, 260, 11, 6, 'rgba(255,255,255,0.25)');
}

/* ------------------------------------------------------------------ export */

const SCREENS: Array<{ name: string; w: number; h: number; draw: (ctx: Ctx, w: number, h: number) => void }> = [
  { name: 'sample-aurora-hero.png', w: 1440, h: 1024, draw: drawAurora },
  { name: 'sample-dashboard.png', w: 1440, h: 1024, draw: drawDashboard },
  { name: 'sample-sunset-showcase.png', w: 1440, h: 1024, draw: drawSunset },
  { name: 'sample-pricing.png', w: 1440, h: 1024, draw: drawPricing },
  { name: 'sample-portfolio-grid.png', w: 1440, h: 1024, draw: drawPortfolio },
  // one tall full-page design to demo the Scroll template
  { name: 'sample-landing-page.png', w: 1440, h: 3400, draw: drawLanding },
];

function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('sample generation failed'));
      resolve(new File([blob], name, { type: 'image/png' }));
    }, 'image/png');
  });
}

export async function generateSampleFiles(): Promise<File[]> {
  const files: File[] = [];
  for (const s of SCREENS) {
    const canvas = document.createElement('canvas');
    canvas.width = s.w;
    canvas.height = s.h;
    const ctx = canvas.getContext('2d')!;
    s.draw(ctx, s.w, s.h);
    files.push(await toFile(canvas, s.name));
  }
  return files;
}
