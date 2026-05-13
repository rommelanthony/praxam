'use client';
// Overview dashboard. Shows baseline stats + UCAT context math + drill catalog.
// Free users see locked drills with a Pro badge; clicking a locked drill fires
// the paywall modal (parent's onSelect handles that routing).
import {
  ArrowRight, ChevronRight, Eye, Flag, Gauge, GitBranch, Info,
  RotateCcw, Search, SkipForward, Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Callout } from './shared/Callout';
import { DrillCard } from './shared/DrillCard';
import { TIER, UCAT } from '@/lib/speed-reading/constants';
import { TONE_CLASSES } from '@/lib/speed-reading/tones';
import type { SpeedReadingSession } from '@/db/schema';

export function Home({
  baseline,
  lockedDrills,
  onSelect,
}: {
  baseline: SpeedReadingSession;
  plan: 'free' | 'pro';
  lockedDrills: Set<string>;
  onSelect: (tabId: string) => void;
}) {
  const wpm = baseline.wpm ?? 0;
  const comp = baseline.comprehensionPct ?? 0;
  const tier = TIER(wpm);
  const tierTone = TONE_CLASSES[tier.tone];

  return (
    <div className="space-y-6">
      {/* Hero panel */}
      <section className="bg-surface border border-line rounded-lg p-6 grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
            Your UCAT reading dashboard
          </p>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-navy leading-tight mb-2">
            Baseline: <span className={tierTone.text}>{wpm} WPM</span>
            <br />
            <span className="text-ink-soft font-medium text-[18px]">
              Target: 400 WPM at 80%+
            </span>
          </h1>
          <p className="text-ink-soft mb-5">{tier.note}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelect('passage')}
              className="btn btn-teal inline-flex items-center gap-1.5"
            >
              Run a passage drill <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onSelect('baseline')}
              className="btn btn-ghost inline-flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Retake baseline
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:min-w-[220px]">
          <HeroStat label="Baseline WPM" value={wpm} tone={tier.tone} />
          <HeroStat label="Comprehension" value={`${comp}%`} tone="success" />
        </div>
      </section>

      {/* UCAT context */}
      <section className="bg-surface border border-line rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Info size={18} className="text-violet" />
          <div>
            <div className="font-bold text-navy">Why 400–500 WPM?</div>
            <div className="text-[13px] text-ink-soft">The math behind the targets</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <ContextCell n={`${UCAT.totalMin} min`} label="Total time for VR section" />
          <ContextCell n={UCAT.passages.toString()} label="Passages to read" />
          <ContextCell n={UCAT.totalQ.toString()} label="Questions to answer" />
          <ContextCell n="~2 min" label="Per passage (read + answer)" />
          <ContextCell n={`${UCAT.wordsLo}–${UCAT.wordsHi}`} label="Words per passage" />
          <ContextCell n={`${UCAT.secPerQ} sec`} label="Per question" />
        </div>
        <p className="text-ink-soft text-[14px] leading-relaxed">
          To finish on time you need to read a 250-word passage in ~60–70 seconds and still have ~90 seconds for 4 questions.
          That demands <strong className="text-navy">~400 WPM</strong> minimum. Push to 500 WPM for buffer time on hard
          passages — but past 500, comprehension drops fast on UCAT-style dense text.
        </p>
      </section>

      {/* Strategy banner */}
      <section className="bg-violet-soft border border-violet/30 rounded-lg p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-violet mb-1">
            The two-mode strategy
          </p>
          <div className="text-navy font-bold mb-1">Match the technique to the question type</div>
          <p className="text-ink-soft text-[14px] max-w-2xl">
            Top scorers don't speed-read every passage. Roughly 70% of UCAT VR questions are answered by scanning;
            the rest need a full read. Train both.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect('strategy')}
          className="btn btn-ghost inline-flex items-center gap-1.5"
        >
          Learn the strategy <ArrowRight size={14} />
        </button>
      </section>

      {/* Drill catalog */}
      <CatalogSection
        title="Mode 1 · Full-passage speed read"
        drills={[
          { id: 'pacer',    icon: Gauge,     title: 'Pacer',     desc: 'RSVP word flasher. Locks you to a target WPM and kills regression.', tag: '5–10 min' },
          { id: 'chunking', icon: Eye,       title: 'Chunking',  desc: 'Read 2–5 words per fixation. Widens your visual span.',              tag: '3–5 min' },
        ]}
        lockedDrills={lockedDrills}
        onSelect={onSelect}
      />

      <CatalogSection
        title="Mode 2 · Scan-and-locate"
        drills={[
          { id: 'scan',     icon: Search,    title: 'Scan Drill',      desc: 'Keyword-locate practice — the UCAT power technique for T/F/CT questions.', tag: '3–5 min' },
          { id: 'strategy', icon: GitBranch, title: 'Strategy Router', desc: 'Quick reference: which technique fits which UCAT question type.',          tag: 'Reference' },
        ]}
        lockedDrills={lockedDrills}
        onSelect={onSelect}
      />

      <CatalogSection
        title="Language traps & exam strategy"
        drills={[
          { id: 'qualifier', icon: Flag,        title: 'Qualifier Hunt',  desc: "Race to spot every 'all', 'never', 'except'. These words flip T/F/CT answers.", tag: '45 sec' },
          { id: 'triage',    icon: SkipForward, title: 'Triage Trainer', desc: '5-second skip-or-attempt decisions. Train the instinct to drop slow questions.', tag: '3 min' },
        ]}
        lockedDrills={lockedDrills}
        onSelect={onSelect}
      />

      <CatalogSection
        title="Verify it sticks"
        drills={[
          { id: 'passage', icon: Target, title: 'Passage Drill', desc: 'Full timed passage + comprehension quiz. Verifies your gains on real UCAT-style material.', tag: 'Full workout' },
        ]}
        lockedDrills={lockedDrills}
        onSelect={onSelect}
        single
      />

      {/* Training-plan callout */}
      <Callout
        icon={Target}
        tone="accent"
        title="Your training plan"
        body={`Aim for ${
          wpm < 300
            ? '300 WPM as your first checkpoint'
            : wpm < 400
              ? '400 WPM with 80%+ comprehension'
              : '500 WPM stretch target'
        }. The Pacer and Chunking drills move pace; the Passage drill verifies the gains stick.`}
      />
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'danger' | 'warn' | 'caution' | 'success' | 'accent';
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1 w-2 h-2 rounded-full ${t.dot}`} />
      <div className="flex-1">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
        <div className={`text-[1.5rem] font-extrabold tabular-nums ${t.text}`}>{value}</div>
      </div>
    </div>
  );
}

function ContextCell({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-surface-cool border border-line rounded-md p-3">
      <div className="text-[16px] font-bold text-navy mb-0.5">{n}</div>
      <div className="text-[12px] text-ink-soft leading-tight">{label}</div>
    </div>
  );
}

function CatalogSection({
  title,
  drills,
  lockedDrills,
  onSelect,
  single = false,
}: {
  title: string;
  drills: { id: string; icon: LucideIcon; title: string; desc: string; tag?: string }[];
  lockedDrills: Set<string>;
  onSelect: (id: string) => void;
  single?: boolean;
}) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-3">{title}</h2>
      <div className={`grid gap-3 ${single ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {drills.map((d) => (
          <DrillCard
            key={d.id}
            icon={d.icon}
            title={d.title}
            desc={d.desc}
            tag={d.tag}
            locked={lockedDrills.has(d.id)}
            onClick={() => onSelect(d.id)}
          />
        ))}
      </div>
    </section>
  );
}
