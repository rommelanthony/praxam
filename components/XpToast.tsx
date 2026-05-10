'use client';
import { useEffect, useState } from 'react';
export type XpToastData = { id: string; amount: number; reason: string; achievements?: string[]; };
type Listener = (data: XpToastData) => void;
const listeners: Listener[] = [];
export function fireXpToast(data: Omit<XpToastData, 'id'>) {
  const event: XpToastData = { ...data, id: Math.random().toString(36).slice(2) };
  listeners.forEach(l => l(event));
}
const CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  correct_bonus: { label: 'Correct!',     color: '#059669', bg: '#f0fdf4', border: '#86efac' },
  answer:        { label: 'Answered',     color: '#1B9D9D', bg: '#f0fdfa', border: '#99f6e4' },
  speed_bonus:   { label: 'Speed bonus',  color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe' },
  streak_bonus:  { label: 'Streak!',      color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  qotd:          { label: 'Daily bonus',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  achievement:   { label: 'Achievement!', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};
function Toast({ toast, onDone }: { toast: XpToastData; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter'|'show'|'exit'>('enter');
  const cfg = CFG[toast.reason] ?? CFG.answer;
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 2200);
    const t3 = setTimeout(() => onDone(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border pointer-events-none"
      style={{ background: cfg.bg, borderColor: cfg.border, minWidth: 180,
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        transform: phase==='show' ? 'translateY(0) scale(1)' : phase==='enter' ? 'translateY(24px) scale(0.85)' : 'translateY(-16px) scale(0.9)',
        opacity: phase==='show' ? 1 : 0 }}>
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[15px]"
        style={{ background: cfg.color+'18', color: cfg.color }}>
        {toast.amount > 0 ? '+'+toast.amount : '!'}
      </div>
      <div className="flex-1">
        <p className="font-bold text-[14px]" style={{ color: cfg.color }}>{cfg.label}</p>
        {toast.achievements && toast.achievements.length > 0 &&
          <p className="text-[11px] text-ink-muted">Achievement unlocked!</p>}
      </div>
      {toast.amount > 0 && <p className="text-[12px] font-bold" style={{ color: cfg.color }}>XP</p>}
    </div>
  );
}
export function XpToastManager() {
  const [toasts, setToasts] = useState<XpToastData[]>([]);
  useEffect(() => {
    const h: Listener = d => setToasts(p => [...p.slice(-3), d]);
    listeners.push(h);
    return () => { const i = listeners.indexOf(h); if (i>-1) listeners.splice(i,1); };
  }, []);
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col-reverse gap-2 items-center">
      {toasts.map(t => <Toast key={t.id} toast={t} onDone={() => setToasts(p => p.filter(x => x.id!==t.id))} />)}
    </div>
  );
}
