// 10-tab navigation strip for the Speed Reading Tutor. Mirrors the prototype's
// Header but stripped of the brand area (the app layout's main nav already
// covers branding) and re-themed for the light palette.
//
// Two independent lock states are intentionally distinguished:
//
// 1. `disabled` — baseline not yet taken; click would early-return in the
//    parent's handleSelect. We HTML-disable the button so the click doesn't
//    fire at all. Reflects spec sect 7.1 (Baseline forced on first visit).
//
// 2. `showProBadge` — drill is paywalled for this user's plan; click should
//    still fire because the parent's handleSelect calls openPaywall(). We
//    only dim the button visually + show the Pro badge; HTML disabled would
//    break the modal reach.
//
// Both can be true simultaneously (paywalled drill that also requires
// baseline) — disabled wins, since the click would early-return before
// reaching the paywall branch anyway.
import type { LucideIcon } from 'lucide-react';

export type HeaderTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled: boolean;     // baseline-lock — HTML-disable; click would early-return
  showProBadge: boolean; // paywall-lock — click stays live (opens modal)
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
              disabled={t.disabled}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] rounded-md transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep/40 focus-visible:ring-offset-2
                ${active
                  ? 'bg-teal-soft text-teal-deep font-semibold'
                  : t.disabled
                    ? 'text-ink-muted opacity-50 cursor-not-allowed'
                    : t.showProBadge
                      ? 'text-ink-soft opacity-80 hover:opacity-100 hover:bg-surface-cool'
                      : 'text-ink-soft hover:bg-surface-cool'}`}
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
