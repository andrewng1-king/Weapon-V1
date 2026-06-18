'use client';

import { useState, useEffect } from 'react';

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let setGlobalToast: ((msg: string, action?: { label: string; onClick: () => void }) => void) | null = null;

export function showToast(msg: string) {
  setGlobalToast?.(msg);
}

export function showToastAction(msg: string, label: string, onClick: () => void) {
  setGlobalToast?.(msg, { label, onClick });
}

export function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<{ label: string; onClick: () => void } | null>(null);

  useEffect(() => {
    setGlobalToast = (m, act) => {
      setMsg(m);
      setAction(act ?? null);
      setVisible(true);
      if (toastTimeout) clearTimeout(toastTimeout);
      const dur = act ? 4200 : 1500;
      toastTimeout = setTimeout(() => {
        setVisible(false);
        setAction(null);
      }, dur);
    };
    return () => { setGlobalToast = null; };
  }, []);

  return (
    <div className={`toast${visible ? ' show' : ''}${action ? ' has-act' : ''}`}>
      {msg}
      {action && (
        <button type="button" className="toast-act" onClick={() => { action.onClick(); setVisible(false); setAction(null); }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
