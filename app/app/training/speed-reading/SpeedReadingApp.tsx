'use client';
// Top-level tab router for the Speed Reading Tutor. Receives baseline state,
// the full filtered VR passage pool, and the server-picked initial Baseline
// passage from the server component shell.
//
// Baseline-forcing rule (spec sect 7.1): when getBaseline(userId) returned null,
// every non-baseline tab is locked and `effectiveTab` collapses to 'baseline'.
//
// Paywall rule (spec sect 5.2): free users can access Overview/Strategy/Progress
// (non-drill tabs) plus Baseline and Pacer (free drills); all other drills open
// the paywall modal instead of switching tabs.
//
// Passage rotation (spec sect 7.4): track which passage_ids have been shown
// this session; drills that let the user "draw another passage" should call
// pickFreshPassage() to avoid repeats. Set lives in component state — resets
// only on hard reload, which is correct: a soft route refresh after baseline
// save shouldn't wipe rotation history.
import { useCallback, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, BookOpen, Eye, Flag, Gauge, GitBranch, Search,
  SkipForward, Target, TrendingUp,
} from 'lucide-react';
import type { Passage } from '@/lib/speed-reading/types';
import type { SpeedReadingSession } from '@/db/schema';
import { openPaywall } from '@/components/PaywallModal';
import { Header, type HeaderTab } from './components/Header';
import { BaselineMode } from './components/BaselineMode';
import { Home } from './components/Home';
import { PacerMode } from './components/PacerMode';
import { ChunkingMode } from './components/ChunkingMode';
import { ScanMode } from './components/ScanMode';

type Plan = 'free' | 'pro';

type Tab =
  | 'home'
  | 'baseline'
  | 'strategy'
  | 'pacer'
  | 'chunking'
  | 'scan'
  | 'qualifier'
  | 'triage'
  | 'passage'
  | 'progress';

// Tab definitions. `kind` drives lock + always-allowed logic; free users can
// always reach overview/strategy/progress regardless of plan.
const TABS = [
  { id: 'home',      label: 'Overview',   icon: BookOpen,    kind: 'overview' },
  { id: 'baseline',  label: 'Baseline',   icon: Activity,    kind: 'drill' },
  { id: 'strategy',  label: 'Strategy',   icon: GitBranch,   kind: 'reference' },
  { id: 'pacer',     label: 'Pacer',      icon: Gauge,       kind: 'drill' },
  { id: 'chunking',  label: 'Chunking',   icon: Eye,         kind: 'drill' },
  { id: 'scan',      label: 'Scan',       icon: Search,      kind: 'drill' },
  { id: 'qualifier', label: 'Qualifiers', icon: Flag,        kind: 'drill' },
  { id: 'triage',    label: 'Triage',     icon: SkipForward, kind: 'drill' },
  { id: 'passage',   label: 'Passage',    icon: Target,      kind: 'drill' },
  { id: 'progress',  label: 'Progress',   icon: TrendingUp,  kind: 'progress' },
] as const satisfies readonly { id: Tab; label: string; icon: typeof Activity; kind: 'overview' | 'reference' | 'drill' | 'progress' }[];

// Drills free users can access. Spec sect 5.2.
const FREE_DRILLS = new Set<Tab>(['baseline', 'pacer']);

function isPaywalled(tab: (typeof TABS)[number], plan: Plan): boolean {
  if (plan === 'pro') return false;
  if (tab.kind !== 'drill') return false;
  return !FREE_DRILLS.has(tab.id);
}

type Props = {
  email: string;
  plan: Plan;
  baseline: SpeedReadingSession | null;
  passages: Passage[];
  initialPassage: Passage;
};

export type PassageRotation = {
  passages: Passage[];
  pickFreshPassage: () => Passage | null;
  markPassageShown: (id: string) => void;
  shownCount: number;
};

export default function SpeedReadingApp({
  email,
  plan,
  baseline,
  passages,
  initialPassage,
}: Props) {
  const needsBaseline = baseline === null;
  const [tab, setTab] = useState<Tab>(needsBaseline ? 'baseline' : 'home');
  const router = useRouter();

  // Passage rotation state — see spec sect 7.4. Seeded with the initial passage
  // (already on screen for Baseline) so the next drill that draws fresh won't
  // repeat it.
  const [shownPassageIds, setShownPassageIds] = useState<Set<string>>(
    () => new Set([initialPassage.id])
  );

  const markPassageShown = useCallback((id: string) => {
    setShownPassageIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const pickFreshPassage = useCallback((): Passage | null => {
    const fresh = passages.filter((p) => !shownPassageIds.has(p.id));
    if (fresh.length === 0) return null; // exhausted — caller decides what to do
    return fresh[Math.floor(Math.random() * fresh.length)];
  }, [passages, shownPassageIds]);

  const rotation: PassageRotation = {
    passages,
    pickFreshPassage,
    markPassageShown,
    shownCount: shownPassageIds.size,
  };

  // Force baseline tab when no baseline row exists, regardless of state.
  const effectiveTab: Tab = needsBaseline ? 'baseline' : tab;

  const handleSelect = (id: string) => {
    const target = TABS.find((t) => t.id === id);
    if (!target) return;
    if (needsBaseline && target.id !== 'baseline') return; // locked
    if (isPaywalled(target, plan)) {
      // Pass the drill label so the modal shows e.g. "Upgrade to Pro to
      // unlock Chunking" instead of the generic "this drill" copy.
      // Body falls back to the default (the per-drill list) — only title
      // is overridden so users still see what's in the Pro bundle.
      openPaywall({ title: `Upgrade to Pro to unlock ${target.label}` });
      return;
    }
    setTab(target.id);
  };

  // After a successful baseline save: switch to Overview, then refresh the
  // route so the server re-fetches getBaseline() and the parent re-renders
  // with the new non-null baseline prop.
  const handleBaselineSaved = () => {
    setTab('home');
    router.refresh();
  };

  // Two independent lock states (see Header.tsx):
  // - disabled (baseline-lock) gets HTML disabled — click won't fire.
  // - showProBadge (paywall-lock) stays clickable so handleSelect's
  //   openPaywall() branch can run.
  const headerTabs: HeaderTab[] = TABS.map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
    disabled: needsBaseline && t.id !== 'baseline',
    showProBadge: isPaywalled(t, plan),
  }));

  const lockedDrills = new Set(
    TABS.filter((t) => isPaywalled(t, plan)).map((t) => t.id as string)
  );

  return (
    <div className="container-px py-8">
      <header className="mb-6">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Training</p>
        <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-1">
          Speed Reading Tutor
        </h1>
        <p className="text-ink-soft text-sm">
          UCAT Verbal Reasoning · {email} · <span className="capitalize">{plan}</span> plan
        </p>
      </header>

      <Header tabs={headerTabs} activeId={effectiveTab} onSelect={handleSelect} />

      <TabBody
        tab={effectiveTab}
        baseline={baseline}
        initialPassage={initialPassage}
        rotation={rotation}
        plan={plan}
        lockedDrills={lockedDrills}
        onSelect={handleSelect}
        onBaselineSaved={handleBaselineSaved}
        isFirstRun={needsBaseline}
      />
    </div>
  );
}

function TabBody({
  tab,
  baseline,
  initialPassage,
  rotation,
  plan,
  lockedDrills,
  onSelect,
  onBaselineSaved,
  isFirstRun,
}: {
  tab: Tab;
  baseline: SpeedReadingSession | null;
  initialPassage: Passage;
  rotation: PassageRotation;
  plan: Plan;
  lockedDrills: Set<string>;
  onSelect: (id: string) => void;
  onBaselineSaved: () => void;
  isFirstRun: boolean;
}): ReactNode {
  if (tab === 'baseline') {
    return (
      <BaselineMode
        passage={initialPassage}
        isFirstRun={isFirstRun}
        onSaved={onBaselineSaved}
      />
    );
  }
  if (tab === 'home') {
    // effectiveTab logic guarantees baseline is non-null when tab is 'home',
    // but TS can't see across that branch — assert.
    return (
      <Home
        baseline={baseline as SpeedReadingSession}
        plan={plan}
        lockedDrills={lockedDrills}
        onSelect={onSelect}
      />
    );
  }
  if (tab === 'pacer') {
    // Free users land here too; baseline is guaranteed non-null because
    // effectiveTab logic forces Baseline first when needsBaseline.
    return (
      <PacerMode
        baseline={baseline as SpeedReadingSession}
        rotation={rotation}
      />
    );
  }
  if (tab === 'chunking') {
    // Pro-only at the gate level (free users hit paywall on click), but
    // baseline is still guaranteed non-null by effectiveTab logic.
    return (
      <ChunkingMode
        baseline={baseline as SpeedReadingSession}
        rotation={rotation}
      />
    );
  }
  if (tab === 'scan') {
    // Pro-only at the gate level. Scan doesn't use baseline.wpm so it only
    // needs the rotation prop.
    return <ScanMode rotation={rotation} />;
  }
  return (
    <Placeholder title={tab} landsIn="PR 2/3 (per spec sect 9)">
      <p className="text-ink-soft text-sm">
        {tab === 'strategy' && 'Two-mode strategy reference + language traps panel.'}
        {tab === 'qualifier' && 'Timed highlight drill for extreme/soft/negation qualifiers.'}
        {tab === 'triage' && '5-second skip-or-attempt decisions.'}
        {tab === 'passage' && 'Full timed passage + comprehension quiz.'}
        {tab === 'progress' && 'History chart + best/avg WPM, comprehension, gain vs baseline.'}
      </p>
    </Placeholder>
  );
}

function Placeholder({
  title,
  landsIn,
  children,
}: {
  title: string;
  landsIn: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface border border-line rounded-lg p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
        Placeholder · lands in {landsIn}
      </p>
      <h2 className="text-xl font-bold text-navy mb-3 capitalize">{title}</h2>
      {children}
    </section>
  );
}
