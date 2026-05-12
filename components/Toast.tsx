'use client';
// Generic toast primitive. Separate from XpToast on purpose so the XP system
// stays single-responsibility — see docs/speed-reading-spec.md §5.4.
import { useEffect, useState } from 'react';

export type ToastTone = 'success' | 'info' | 'warn';
export type ToastData = { id: string; message: string; tone: ToastTone };

type Listener = (data: ToastData) => void;
const listeners: Listener[] = [];

export function fireToast(data: Omit<ToastData, 'id'>) {
  const event: ToastData = { ...data, id: Math.random().toString(36).slice(2) };
  listeners.forEach((l) => l(event));
}

const TONE_STYLES: Record<ToastTone, { color: string; bg: string; border: string }> = {
  success: { color: 'var(--teal-deep, #147878)', bg: 'var(--teal-soft, #E0F4F4)', border: 'var(--teal, #1B9D9D)' },
  info:    { color: '#4B3580',                    bg: '#EDE7F8',                  border: '#6B4FA8' },
  warn:    { color: 'hsl(32, 75%, 30%)',          bg: 'hsl(34, 62%, 93%)',        border: 'hsl(32, 75%, 42%)' },
};

function Toast({ toast, onDone }: { toast: ToastData; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const style = TONE_STYLES[toast.tone];
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 2400);
    const t3 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border pointer-events-none"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.color,
        minWidth: 220,
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        transform: phase === 'show'
          ? 'translateY(0) scale(1)'
          : phase === 'enter'
            ? 'translateY(-24px) scale(0.85)'
            : 'translateY(-16px) scale(0.9)',
        opacity: phase === 'show' ? 1 : 0,
      }}
    >
      <p className="font-semibold text-[14px]">{toast.message}</p>
    </div>
  );
}

export function ToastManager() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  useEffect(() => {
    const h: Listener = (d) => setToasts((p) => [...p.slice(-2), d]);
    listeners.push(h);
    return () => {
      const i = listeners.indexOf(h);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  if (!toasts.length) return null;
  return (
    // Top-right so system toasts don't collide with center-bottom XpToastManager.
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDone={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
      ))}
    </div>
  );
}
