// Drill catalog card. Renders on Home/Overview. `locked` shows a Pro badge
// and dims the card; the parent's onClick handler still fires (and is expected
// to call openPaywall() instead of switching tabs).
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Lock } from 'lucide-react';

export function DrillCard({
  icon: Icon,
  title,
  desc,
  tag,
  onClick,
  locked = false,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag?: string;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group block w-full text-left bg-surface border border-line rounded-lg p-5 transition-all
        ${locked ? 'opacity-70 hover:opacity-90' : 'hover:border-teal hover:shadow-sm'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-md bg-teal-soft text-teal-deep flex items-center justify-center">
          <Icon size={18} />
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-violet-soft text-violet text-[11px] font-semibold uppercase tracking-wider">
            <Lock size={10} /> Pro
          </span>
        ) : tag ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">{tag}</span>
        ) : null}
      </div>
      <div className="text-[16px] font-bold text-navy mb-1">{title}</div>
      <p className="text-[13px] text-ink-soft mb-3 leading-snug">{desc}</p>
      <div
        className={`flex items-center gap-1 text-[13px] font-medium group-hover:gap-1.5 transition-all ${
          locked ? 'text-violet' : 'text-teal-deep'
        }`}
      >
        {locked ? 'Unlock' : 'Open'} <ChevronRight size={14} />
      </div>
    </button>
  );
}
