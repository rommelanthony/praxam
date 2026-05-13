// 10-tab navigation strip for the Speed Reading Tutor. Mirrors the prototype's
// Header but stripped of the brand area (the app layout's main nav already
// covers branding) and re-themed for the light palette.
//
// Each HeaderTab carries its own lock state; the parent (SpeedReadingApp)
// computes lock based on baseline-presence + plan, so this component is
// purely presentational.
import type { LucideIcon } from 'lucide-react';

export type HeaderTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  locked: boolean;       // disables click
  showProBadge: boolean; // visual hint for paywalled drills
};

export function Header({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: HeaderTab[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="mb-6 -mx-2 px-2 overflow-x-auto" aria-label="Speed Reading tabs">
      <div className="flex flex-wrap gap-1 pb-3 border-b border-line">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] rounded-md transition-colors
                ${active ? 'bg-teal-soft text-teal-deep font-semibold' : t.locked ? 'text-ink-muted hover:text-ink-soft' : 'text-ink-soft hover:bg-surface-cool'}`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              {t.showProBadge && (
                <span className="ml-1 text-[10px] uppercase tracking-wider text-violet font-semibold">Pro</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
