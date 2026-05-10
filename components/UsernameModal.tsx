'use client';
import { useState, useEffect, useRef } from 'react';
function randomSuggestion(email: string) {
  return email.split('@')[0].replace(/[^a-zA-Z0-9]/g,'').slice(0,14) + Math.floor(Math.random()*99+1);
}
interface Props { email: string; onComplete: (u: string) => void; }
export default function UsernameModal({ email, onComplete }: Props) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle'|'ok'|'error'>('idle');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestion] = useState(() => randomSuggestion(email));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (!value) { setStatus('idle'); setError(''); return; }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(value)) { setStatus('error'); setError('3-20 characters, letters/numbers/_ only'); }
    else { setStatus('ok'); setError(''); }
  }, [value]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value || status==='error') return;
    setSaving(true);
    const res = await fetch('/api/username', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: value }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setStatus('error'); setSaving(false); return; }
    onComplete(data.username);
  }
  const badges = [
    { icon: '⭐', label: 'Top 50%', color: '#059669' },
    { icon: '🌟', label: 'Top 25%', color: '#2563eb' },
    { icon: '💫', label: 'Top 10%', color: '#7c3aed' },
    { icon: '🔥', label: 'Top 5%', color: '#d97706' },
    { icon: '👑', label: 'Top 1%', color: '#dc2626' },
  ]
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,45,79,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg,#1B9D9D 0%,#0F2D4F 100%)' }}>
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-[1.6rem] font-extrabold text-white mb-2">Choose your username</h1>
          <p className="text-white/75 text-[14px]">Join the global leaderboard and compete with other UCAT applicants</p>
        </div>
        <div className="flex justify-center gap-3 px-6 py-4 border-b border-line bg-surface-cool">
          {badges.map(b => (
            <div key={b.label} className="flex flex-col items-center gap-0.5">
              <span className="text-xl">{b.icon}</span>
              <span className="text-[9px] font-bold" style={{ color: b.color }}>{b.label}</span>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="px-8 py-6 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-widest text-ink-muted mb-2">Your username</label>
            <div className="relative">
              <input ref={ref} type="text" value={value} onChange={e=>setValue(e.target.value)} placeholder={suggestion} maxLength={20}
                className={"w-full px-4 py-3 rounded-xl border-2 text-[16px] font-bold text-navy outline-none transition-all " + (status==='ok' ? 'border-teal-deep bg-teal-50/30' : status==='error' ? 'border-red-400 bg-red-50/30' : 'border-line focus:border-teal-deep')} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold">
                {status==='ok' && <span className="text-teal-deep">&#10003;</span>}
                {status==='error' && <span className="text-red-500">&#10007;</span>}
              </div>
            </div>
            {error && <p className="text-red-500 text-[13px] mt-1">{error}</p>}
            {!error && status==='ok' && <p className="text-teal-deep text-[13px] mt-1">Looking good!</p>}
            <p className="text-[12px] text-ink-muted mt-1">Visible on the public leaderboard.</p>
          </div>
          {!value && (
            <button type="button" onClick={()=>setValue(suggestion)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-surface hover:border-teal-soft transition-all text-left">
              <span className="text-[13px] text-ink-muted">Suggestion:</span>
              <span className="text-[14px] font-bold text-navy">{suggestion}</span>
              <span className="ml-auto text-[12px] text-teal-deep">Use this</span>
            </button>
          )}
          <div className="bg-surface-cool rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">What you unlock</p>
            {['Global leaderboard ranking','Percentile badges (Top 50% to Top 1%)','Weekly XP competition','Achievement milestones'].map(item => (
              <div key={item} className="flex items-center gap-2 text-[13px] text-ink-soft">
                <span className="text-teal-deep font-bold">&#10003;</span>{item}
              </div>
            ))}
          </div>
          <button type="submit" disabled={!value||status==='error'||saving}
            className={"w-full py-3.5 rounded-xl font-bold text-[15px] transition-all " + (value&&status!=='error'&&!saving ? 'bg-navy text-white hover:bg-navy/90 shadow-lg' : 'bg-line text-ink-muted cursor-not-allowed')}>
            {saving ? 'Saving...' : value ? 'Join as '+value : 'Enter a username to continue'}
          </button>
          <p className="text-center text-[12px] text-ink-muted">You can change this later in Account settings.</p>
        </form>
      </div>
    </div>
  );
}
