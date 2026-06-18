import { GROUP_COLORS } from '@/domain/catalogue';
import type { Group } from '@/domain/types';

const ACCENT = '#c2a878';
const TRACK = 'rgba(255,255,255,.08)';
const INK = '#e9e7e3';
const FAINT = '#6a6a67';
const MUTED = '#9b9a96';

export function drawGauge(ctx: CanvasRenderingContext2D, W: number, H: number, pct: number) {
  const cx = W / 2, cy = H - 14, R = Math.max(0, Math.min(W / 2 - 12, H - 26));
  const segs = 30;
  const gap = 0.025;
  const totalArc = Math.PI;
  const segArc = (totalArc - gap * (segs - 1)) / segs;

  for (let i = 0; i < segs; i++) {
    const angle = Math.PI + i * (segArc + gap);
    const filled = i / segs < pct;
    ctx.beginPath();
    ctx.arc(cx, cy, R, angle, angle + segArc);
    ctx.strokeStyle = filled ? ACCENT : TRACK;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

export function drawWeek(ctx: CanvasRenderingContext2D, W: number, H: number, days: string[], trained: boolean[], today: string) {
  const r = 14;
  const gap = (W - days.length * r * 2) / (days.length + 1);

  days.forEach((d, i) => {
    const x = gap + r + i * (r * 2 + gap);
    const y = H / 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (trained[i]) {
      ctx.fillStyle = d === today ? ACCENT : `rgba(194,168,120,.3)`;
    } else {
      ctx.fillStyle = TRACK;
    }
    ctx.fill();

    ctx.fillStyle = trained[i] ? INK : FAINT;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(+d.slice(-2)), x, y);
  });
}

export function drawSplit(ctx: CanvasRenderingContext2D, W: number, H: number, counts: Record<string, number>) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return;
  const max = entries[0][1] || 1;
  const barH = 18;
  const gap = 10;
  const labelW = 80;

  entries.forEach(([g, c], i) => {
    const y = 10 + i * (barH + gap);
    ctx.fillStyle = FAINT;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(g, 0, y + barH / 2);

    const barW = (W - labelW - 40) * (c / max);
    ctx.fillStyle = GROUP_COLORS[g as Group] || '#888';
    ctx.beginPath();
    ctx.roundRect(labelW, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = MUTED;
    ctx.font = '700 11px Archivo, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(c), labelW + barW + 8, y + barH / 2);
  });
}

export function lineChart(ctx: CanvasRenderingContext2D, W: number, H: number, data: { d: string; v: number }[]) {
  if (data.length < 2) return;
  const pad = { t: 10, b: 24, l: 10, r: 10 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const max = Math.max(...data.map((p) => p.v)) || 1;
  const min = Math.min(...data.map((p) => p.v));
  const range = max - min || 1;

  const points = data.map((p, i) => ({
    x: pad.l + (i / (data.length - 1)) * cW,
    y: pad.t + cH - ((p.v - min) / range) * cH,
  }));

  const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  grad.addColorStop(0, 'rgba(194,168,120,.25)');
  grad.addColorStop(1, 'rgba(194,168,120,0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.lineTo(points[points.length - 1].x, H - pad.b);
  ctx.lineTo(points[0].x, H - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
}

export function drawRadar(ctx: CanvasRenderingContext2D, W: number, H: number, labels: string[], counts: Record<string, number>) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(cx, cy) - 30;
  const n = labels.length;
  const max = Math.max(...Object.values(counts), 1);
  const angleStep = (Math.PI * 2) / n;

  for (let ring = 1; ring <= 4; ring++) {
    const r = R * ring / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + i * angleStep;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = TRACK;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  labels.forEach((_, i) => {
    const a = -Math.PI / 2 + i * angleStep;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
  });
  ctx.strokeStyle = TRACK;
  ctx.stroke();

  ctx.beginPath();
  labels.forEach((g, i) => {
    const val = (counts[g] || 0) / max;
    const a = -Math.PI / 2 + i * angleStep;
    const x = cx + R * val * Math.cos(a);
    const y = cy + R * val * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(194,168,120,.18)';
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.stroke();

  labels.forEach((g, i) => {
    const a = -Math.PI / 2 + i * angleStep;
    const x = cx + (R + 18) * Math.cos(a);
    const y = cy + (R + 18) * Math.sin(a);
    ctx.fillStyle = MUTED;
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g, x, y);
  });
}
