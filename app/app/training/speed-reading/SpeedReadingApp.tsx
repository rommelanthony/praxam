'use client';
// Top-level tab router for the Speed Reading Tutor. Receives baseline state
// and the initial Baseline passage from the server component shell.
//
// Baseline-forcing rule (spec sect 7.1): when getBaseline(userId) returned null,
// every non-baseline tab is locked and `effectiveTab` collapses to 'baseline'.
//
// Paywall rule (spec sect 5.2): free users can access Overview/Strategy/Progress
// (non-drill tabs) plus Baseline and Pacer (free drills); all other drills open
// the paywall modal instead of switching tabs.
//
// Step E renders placeholder tab bodies. The real Header, BaselineMode, Home,
// and the rest land in steps F and G.
import { useState, type ReactNode } from 'react';
import {
  Activity, BookOpen, Eye, Flag, Gauge, GitBranch, Search,
  SkipForward, Target, TrendingUp,
} from 'lucide-react';
import type { Passage } from '@/lib/speed-reading/types';
import type { SpeedReadingSession } from '@/db/schema';
import { openPaywall } from '@/components/PaywallModal';
import { Header, type HeaderTab } from './components/Header';

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
  initialPassage: Passage;
};

export default function SpeedReadingApp({ email, plan, baseline, initialPassage }: Props) {
  const needsBaseline = baseline === null;
  const [tab, setTab] = useState<Tab>(needsBaseline ? 'baseline' : 'home');

  // Force baseline tab when no baseline row exists, regardless of state.
  const effectiveTab: Tab = needsBaseline ? 'baseline' : tab;

  const handleSelect = (id: string) => {
    const target = TABS.find((t) => t.id === id);
    if (!target) return;
    if (needsBaseline && target.id !== 'baseline') return; // locked
    if (isPaywalled(target, plan)) {
      openPaywall();
      return;
    }
    setTab(target.id);
  };

  const headerTabs: HeaderTab[] = TABS.map((t) => {
    const paywalled = isPaywalled(t, plan);
    return {
      id: t.id,
      label: t.label,
      icon: t.icon,
      locked: (needsBaseline && t.id !== 'baseline') || paywalled,
      showProBadge: paywalled,
    };
  });

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

      <TabBody tab={effectiveTab} baseline={baseline} initialPassage={initialPassage} />
    </div>
  );
}

// Step-E placeholders. Each tab renders a small panel describing what the
// step F/G port will replace it with. The Baseline tab also displays the
// fetched initial passage so the data-fetch chain is observable.
function TabBody({
  tab,
  baseline,
  initialPassage,
}: {
  tab: Tab;
  baseline: SpeedReadingSession | null;
  initialPassage: Passage;
}): ReactNode {
  if (tab === 'baseline') {
    return (
      <Placeholder title="BaselineMode" landsIn="step G">
        <p className="text-ink-soft text-sm">
          {baseline === null
            ? 'No baseline taken yet — this tab will be forced on first visit.'
            : 'Baseline already taken. Tab is reachable for retakes.'}
        </p>
        <div className="mt-4 p-4 bg-surface-cool rounded-md text-[13px]">
          <p className="font-semibold text-navy mb-1">Initial passage fetched from data layer:</p>
          <ul className="text-ink-soft space-y-0.5">
            <li>id: <code className="font-mono text-[12px]">{initialPassage.id}</code></li>
            <li>title: {initialPassage.title}</li>
            <li>wordCount: {initialPassage.wordCount}</li>
            <li>difficulty: {initialPassage.difficulty}</li>
            <li>questions: {initialPassage.questions.length}</li>
          </ul>
        </div>
      </Placeholder>
    );
  }
  if (tab === 'home') {
    return (
      <Placeholder title="Home (Overview)" landsIn="step G">
        <p className="text-ink-soft text-sm">
          Drill catalog + baseline summary + training plan callout.
        </p>
      </Placeholder>
    );
  }
  return (
    <Placeholder title={tab} landsIn="step F or G">
      <p className="text-ink-soft text-sm">
        {tab === 'strategy' && 'Two-mode strategy reference + language traps panel.'}
        {tab === 'pacer' && 'RSVP word flasher locked to target WPM.'}
        {tab === 'chunking' && 'Word-group highlighter for visual span training.'}
        {tab === 'scan' && 'Keyword-locate drill.'}
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
