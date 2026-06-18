'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
}

/**
 * Animated count-up number (ported from legacy `animNum`).
 * Animates from the previously shown value (0 on first mount) to `value`
 * using ease-out-cubic. Falls back to the final value when reduced motion
 * is requested. `format` controls how the (possibly fractional) running
 * value is rendered.
 */
export function CountUp({
  value,
  format,
  duration = 700,
  className,
}: {
  value: number;
  format?: (n: number) => string | number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const liveRef = useRef(0);

  useEffect(() => {
    const from = liveRef.current;
    const to = value;
    if (from === to) return;
    if (prefersReduced()) {
      liveRef.current = to;
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const cur = from + (to - from) * eased;
      liveRef.current = cur;
      setDisplay(cur);
      if (k < 1) raf = requestAnimationFrame(tick);
      else liveRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const out = format ? format(display) : Math.round(display).toLocaleString('en-US');
  return <span className={className}>{out}</span>;
}
