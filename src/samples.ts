/** Generates placeholder "design screen" images so the app is testable
 *  without uploading anything (PRD: sample project / empty state). */

interface Palette {
  bg: string;
  surface: string;
  accent: string;
  text: string;
}

const PALETTES: Palette[] = [
  { bg: '#f6f7fb', surface: '#ffffff', accent: '#4f46e5', text: '#d4d7e3' },
  { bg: '#101418', surface: '#1a2027', accent: '#34d399', text: '#2c353f' },
  { bg: '#fdf6ee', surface: '#ffffff', accent: '#ea580c', text: '#ead9c4' },
  { bg: '#0f1026', surface: '#1b1d3f', accent: '#818cf8', text: '#2e3160' },
  { bg: '#f0fdf4', surface: '#ffffff', accent: '#16a34a', text: '#cde8d4' },
  { bg: '#18181b', surface: '#26262b', accent: '#f472b6', text: '#3a3a41' },
];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawAppSection(ctx: CanvasRenderingContext2D, p: Palette, y0: number, w: number, seed: number) {
  // hero block
  const grad = ctx.createLinearGradient(60, y0, w - 60, y0 + 300);
  grad.addColorStop(0, p.accent);
  grad.addColorStop(1, p.accent + '55');
  ctx.beginPath();
  ctx.roundRect(60, y0 + 40, w - 120, 280, 24);
  ctx.fillStyle = grad;
  ctx.fill();
  rr(ctx, 100, y0 + 100, w * 0.35, 34, 17, 'rgba(255,255,255,0.9)');
  rr(ctx, 100, y0 + 156, w * 0.5, 20, 10, 'rgba(255,255,255,0.55)');
  rr(ctx, 100, y0 + 244, 150, 44, 22, 'rgba(255,255,255,0.95)');

  // card row
  const cardW = (w - 120 - 2 * 30) / 3;
  for (let c = 0; c < 3; c++) {
    const x = 60 + c * (cardW + 30);
    const y = y0 + 370;
    rr(ctx, x, y, cardW, 220, 18, p.surface);
    rr(ctx, x + 20, y + 20, cardW - 40, 90, 12, c === seed % 3 ? p.accent : p.text);
    rr(ctx, x + 20, y + 130, cardW * 0.6, 16, 8, p.text);
    rr(ctx, x + 20, y + 160, cardW * 0.4, 16, 8, p.text);
  }
}

function drawScreen(w: number, h: number, p: Palette, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);

  // top nav
  rr(ctx, 0, 0, w, 88, 0, p.surface);
  ctx.beginPath();
  ctx.arc(70, 44, 20, 0, Math.PI * 2);
  ctx.fillStyle = p.accent;
  ctx.fill();
  for (let i = 0; i < 4; i++) rr(ctx, 130 + i * 110, 34, 80, 20, 10, p.text);
  rr(ctx, w - 160, 26, 110, 36, 18, p.accent);

  const sections = Math.ceil((h - 88) / 660);
  for (let s = 0; s < sections; s++) drawAppSection(ctx, p, 88 + s * 660, w, seed + s);
  return canvas;
}

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
  for (let i = 0; i < 5; i++) {
    files.push(await toFile(drawScreen(1440, 1024, PALETTES[i], i), `sample-screen-${i + 1}.png`));
  }
  // one tall full-page design to demo the Scroll template
  files.push(await toFile(drawScreen(1440, 3400, PALETTES[5], 5), 'sample-landing-page.png'));
  return files;
}
