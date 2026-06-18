'use client';

import { useRef, useEffect, useCallback } from 'react';

interface ChartProps {
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  deps?: unknown[];
}

export function Chart({ height, draw, deps = [] }: ChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    draw(ctx, rect.width, rect.height);
  }, [draw]);

  useEffect(() => {
    render();
    const obs = new ResizeObserver(render);
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [...deps, render]);

  return <canvas ref={ref} className="rep" style={{ height, width: '100%', display: 'block' }} />;
}
