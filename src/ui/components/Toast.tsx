'use client';

import { useState, useEffect } from 'react';

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let setGlobalToast: ((msg: string) => void) | null = null;

export function showToast(msg: string) {
  setGlobalToast?.(msg);
}

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setGlobalToast = (m: string) => {
      setMsg(m);
      setVisible(true);
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => setVisible(false), 1500);
    };
    return () => { setGlobalToast = null; };
  }, []);

  return <div className={`toast${visible ? ' show' : ''}`}>{msg}</div>;
}
