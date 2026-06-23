export function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function fmtDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function slug(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '_');
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function fmtK(n: number): string {
  n = Number(n);
  if (!isFinite(n)) return '0';
  const neg = n < 0;
  n = Math.abs(n);
  function brk(v: number, suf: string): string {
    const i = Math.floor(v);
    const d = Math.floor(v * 10) % 10;
    return i >= 10 ? i + suf : i + suf + (d ? String(d) : '');
  }
  let out: string;
  if (n >= 1e6) out = brk(n / 1e6, 'M');
  else if (n >= 1000) out = brk(n / 1000, 'k');
  else out = String(Math.round(n));
  return (neg ? '-' : '') + out;
}

export function fmtVol(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (v >= 1e3) return Math.round(v / 1e3) + 'k';
  return '' + Math.round(v);
}

export function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
