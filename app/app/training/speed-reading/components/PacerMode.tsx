'use client';
// RSVP word-pacer. Flashes one chunk (1-4 words) at a time at a fixed cadence
// derived from the target WPM. ORP (Optimal Recognition Point) styling places
// the eye-fixation letter slightly left-of-center in each chunk — that letter
// is rendered in red so the user can soft-focus rather than read.
//
// Recommended WPM per spec sect 7.2: min(500, max(300, baseline.wpm + 50)).
//
// Completion: when idx reaches chunks.length - 1 while running, the interval
// effect stops the drill and fires savePacerSession() exactly once via a ref
// guard. The same passage doesn't double-save on Restart — savedRef resets
// when idx goes back to 0.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Pause, Play, RotateCcw } from 'lucide-react';
import { Section } from './shared/Section';
import { Callout } from './shared/Callout';
import { Slider } from './shared/Slider';
import { PassageSelector } from './shared/PassageSelector';
import { fireToast } from '@/components/Toast';
import { savePacerSession } from '../actions';
import type { SpeedReadingSession } from '@/db/schema';
import type { PassageRotation } from '../SpeedReadingApp';

const UCAT_PRESETS = [
  { wpm: 300, label: 'Min' },
  { wpm: 400, label: 'Target' },
  { wpm: 500, label: 'Stretch' },
] as const;

export function PacerMode({
  baseline,
  rotation,
}: {
  baseline: SpeedReadingSession;
  rotation: PassageRotation;
}) {
  const baselineWpm = baseline.wpm ?? 250;
  const recommended = Math.min(500, Math.max(300, baselineWpm + 50));
  // Defensive copy for rushed baselines. >700 WPM with comprehension is
  // essentially unattested in human reading research; in practice this
  // threshold catches users who clicked Begin -> Done in seconds without
  // actually reading. The drill still runs at the recommended target (clamped
  // to 500), only the banner messaging changes — leads with the diagnosis
  // and points the user to retake instead of selling a false training number.
  const isJunkBaseline = baselineWpm > 700;

  // If the user's most recent baseline used a passage that's in the pool,
  // pre-select it so they can immediately Pacer-drill the same passage.
  // Otherwise default to the first available.
  const initialPassageIndex = (() => {
    if (!baseline.passageId) return 0;
    const i = rotation.passages.findIndex((p) => p.id === baseline.passageId);
    return i >= 0 ? i : 0;
  })();

  const [wpm, setWpm] = useState(recommended);
  const [chunkSize, setChunkSize] = useState(1);
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [passageIndex, setPassageIndex] = useState(initialPassageIndex);

  const passage = rotation.passages[passageIndex];
  const words = useMemo(() => passage.text.split(/\s+/).filter(Boolean), [passage]);
  const chunks = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      out.push(words.slice(i, i + chunkSize).join(' '));
    }
    return out;
  }, [words, chunkSize]);

  // interval ms per chunk. (60/wpm) gives seconds per word; * 1000 -> ms;
  // * chunkSize because each tick advances by chunkSize words.
  const interval = (60 / wpm) * 1000 * chunkSize;

  // Refs for state that shouldn't drive renders.
  const startedAtRef = useRef<number>(0);
  const savedRef = useRef(false);

  // Drive the RSVP loop. When idx hits the last chunk, stop + fire completion.
  useEffect(() => {
    if (!running) return;
    if (idx >= chunks.length - 1) {
      setRunning(false);
      handleComplete();
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), interval);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx, interval, chunks.length]);

  const handleComplete = async () => {
    if (savedRef.current) return; // dedupe
    savedRef.current = true;
    const elapsedSec = (Date.now() - startedAtRef.current) / 1000;
    const res = await savePacerSession({
      passageId: passage.id,
      elapsedSec,
      targetWpm: wpm,
      chunkSize,
    });
    if (res.ok) {
      fireToast({ message: 'Pacer session saved', tone: 'success' });
      rotation.markPassageShown(passage.id);
    } else {
      fireToast({ message: 'Save failed — please retry', tone: 'warn' });
      savedRef.current = false;
    }
  };

  const start = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (idx >= chunks.length - 1) {
      // Restart from the beginning.
      setIdx(0);
      savedRef.current = false;
    }
    startedAtRef.current = Date.now();
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setIdx(0);
    savedRef.current = false;
  };

  const handleChunkSizeChange = (newSize: number) => {
    setChunkSize(newSize);
    // chunks re-derives; reset progress to avoid landing past the new end.
    setIdx(0);
    setRunning(false);
    savedRef.current = false;
  };

  const handlePassageChange = (newIndex: number) => {
    setPassageIndex(newIndex);
    reset();
  };

  const current = chunks[idx] || '';
  // ORP: slightly left-of-center letter where the eye fixates most efficiently.
  const orpIdx = Math.max(0, Math.floor(current.length / 3));

  const progressPct = (idx / Math.max(chunks.length - 1, 1)) * 100;
  const atEnd = idx >= chunks.length - 1 && idx > 0 && !running;

  return (
    <Section
      title="Pacer Drill"
      desc={`Locks you to ${wpm} WPM. Focus on the red letter — let the meaning land without subvocalising.`}
    >
      <Callout
        icon={Info}
        tone={isJunkBaseline ? 'warn' : 'accent'}
        body={
          isJunkBaseline ? (
            <>
              Your baseline of {baselineWpm} WPM looks rushed — Pacer needs a realistic target.
              Retake from <strong className="font-semibold text-navy">Baseline</strong> for a useful training number.
            </>
          ) : (
            <>
              Recommended start: {recommended} WPM (50 above your baseline of {baselineWpm} WPM).
              Push up by 25–50 WPM once comprehension feels solid.
            </>
          )
        }
      />

      {/* RSVP stage */}
      <div className="bg-surface border border-line rounded-lg p-12 my-5 text-center min-h-[180px] flex items-center justify-center">
        <div className="font-mono text-[2.5rem] leading-none tabular-nums tracking-wide">
          {current ? (
            <>
              <span className="text-ink-soft">{current.slice(0, orpIdx)}</span>
              <span className="text-red">{current[orpIdx] || ' '}</span>
              <span className="text-ink-soft">{current.slice(orpIdx + 1)}</span>
            </>
          ) : (
            <span className="text-ink-muted text-[1.25rem]">Press Start to begin</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-pill bg-surface-cool overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 bg-teal-deep transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-[12px] text-ink-muted text-center mb-6 tabular-nums">
        Word {Math.min(idx + 1, chunks.length)} of {chunks.length} · {wpm} WPM · chunks of {chunkSize}
      </p>

      {/* Controls */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <PresetRow current={wpm} onPick={setWpm} />
        <Slider label="Target WPM" value={wpm} min={150} max={700} step={10} onChange={setWpm} suffix=" WPM" />
        <Slider label="Chunk size" value={chunkSize} min={1} max={4} step={1} onChange={handleChunkSizeChange} />
        <PassageSelector passages={rotation.passages} value={passageIndex} onChange={handlePassageChange} />

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={start}
            className="btn btn-teal inline-flex items-center gap-1.5"
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? 'Pause' : atEnd ? 'Restart' : 'Start'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="btn btn-ghost inline-flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>
    </Section>
  );
}

function PresetRow({ current, onPick }: { current: number; onPick: (v: number) => void }) {
  return (
    <div className="mb-4">
      <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft mb-2">
        UCAT presets
      </div>
      <div className="flex gap-2">
        {UCAT_PRESETS.map((p) => {
          const active = current === p.wpm;
          return (
            <button
              key={p.wpm}
              type="button"
              onClick={() => onPick(p.wpm)}
              className={`flex-1 flex flex-col items-center py-2 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep/40 focus-visible:ring-offset-2
                ${active
                  ? 'border-violet bg-violet-soft text-violet'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-cool'}`}
            >
              <span className="text-[16px] font-bold tabular-nums">{p.wpm}</span>
              <span className="text-[11px] uppercase tracking-wider">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
