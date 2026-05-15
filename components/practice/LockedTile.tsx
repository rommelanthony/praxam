'use client';
// Practice-picker tile in its locked state: free user has used all 10 free
// questions in this subtest. Click fires the paywall modal — no navigation.
//
// Unlocked tiles render as plain server-side <Link> elements in the picker
// page; only the locked variant needs to be a client component because of
// the onClick handler.
import { Lock } from 'lucide-react';
import { openPaywall } from '@/components/PaywallModal';

export function LockedTile({
  name,
  blurb,
  subtestKey,
  freeLimit,
}: {
  name: string;
  blurb: string;
  subtestKey: string; // schema enum value, e.g. 'verbal_reasoning'
  freeLimit: number;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        openPaywall({
          title: `You've used your ${freeLimit} free ${name} questions`,
          body: <>Upgrade to Pro to access the full question bank — every subtest, no caps.</>,
        })
      }
      className="w-full text-left bg-surface border border-line rounded-lg p-6 opacity-70 hover:opacity-90 hover:border-violet/40 transition-all"
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="text-[1.15rem] font-bold text-navy">{name}</h3>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-violet-soft text-violet text-[11px] font-semibold uppercase tracking-wider flex-shrink-0">
          <Lock size={10} /> Pro
        </span>
      </div>
      <p className="text-[14px] text-ink-soft mb-4">{blurb}</p>
      <div className="flex items-center justify-between text-[13px] font-mono tabular-nums">
        <span className="text-ink-muted">{freeLimit}/{freeLimit} free used</span>
        <span className="text-violet">Upgrade to unlock →</span>
      </div>
      {/* subtestKey reserved for future analytics — passed in by the picker
          so any tracker can identify which subtest's lock was clicked */}
      <span className="hidden" data-subtest-key={subtestKey} />
    </button>
  );
}
