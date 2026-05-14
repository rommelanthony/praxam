'use client';
// Chunking drill: trains wider visual span. Renders the passage as a grid of
// word groups (2-5 words per row), highlighting one row at a time at a pace
// derived from target WPM. Past rows fade back; future rows are dim. The eye
// should land between the columns and absorb the whole group in one fixation
// rather than reading word-by-word.
//
// Recommended WPM per spec sect 7.2: min(500, max(350, baseline.wpm + 50)).
// Floor is 350 (not 300 like Pacer) because chunking is faster than RSVP
// pacing — you're skipping micro-fixations on individual words.
//
// Completion: when highlight reaches the last line while running, the interval
// effect stops the drill and fires saveChunkingSession() once via a ref guard.
// Same dedup pattern as PacerMode.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Pause, Play, RotateCcw } from 'lucide-react';
import { Section } from './shared/Section';
import { Callout } from './shared/Callout';
import { Slider } from './shared/Slider';
import { PassageSelector } from './shared/PassageSelector';
import { fireToast } from '@/components/Toast';
import { saveChunkingSession } from '../actions';
import type { SpeedReadingSession } from '@/db/schema';
import type { PassageRotation } from '../SpeedReadingApp';

export function ChunkingMode({
  baseline,
  rotation,
}: {
  baseline: SpeedReadingSession;
  rotation: PassageRotation;
}) {
  const baselineWpm = baseline.wpm ?? 250;
  // 350 floor (vs Pacer's 300) per spec sect 7.2.
  const recommended = Math.min(500, Math.max(350, baselineWpm + 50));
  const isJunkBaseline = baselineWpm > 700;

  const initialPassageIndex = (() => {
    if (!baseline.passageId) return 0;
    const i = rotation.passages.findIndex((p) => p.id === baseline.passageId);
    return i >= 0 ? i : 0;
  })();

  const [cols, setCols] = useState(3);
  const [highlight, setHighlight] = useState(0);
  const [running, setRunning] = useState(false);
  const [wpm, setWpm] = useState(recommended);
  const [passageIndex, setPassageIndex] = useState(initialPassageIndex);

  const passage = rotation.passages[passageIndex];
  const lines = useMemo(() => {
    const words = passage.text.split(/\s+/).filter(Boolean);
    const out: string[][] = [];
    for (let i = 0; i < words.length; i += cols) {
      out.push(words.slice(i, i + cols));
    }
    return out;
  }, [passage, cols]);

  // ms per line. cols words per line, wpm = words per minute -> (60/wpm)s per
  // word * cols words * 1000ms = ms per line.
  const interval = (60 / wpm) * 1000 * cols;

  const startedAtRef = useRef<number>(0);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    if (highlight >= lines.length - 1) {
      setRunning(false);
      handleComplete();
      return;
    }
    const t = setTimeout(() => setHighlight((h) => h + 1), interval);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, highlight, interval, lines.length]);

  const handleComplete = async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    const elapsedSec = (Date.now() - startedAtRef.current) / 1000;
    const res = await saveChunkingSession({
      passageId: passage.id,
      elapsedSec,
      targetWpm: wpm,
      wordsPerFixation: cols,
    });
    if (res.ok) {
      fireToast({ message: 'Chunking session saved', tone: 'success' });
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
    if (highlight >= lines.length - 1) {
      setHighlight(0);
      savedRef.current = false;
    }
    startedAtRef.current = Date.now();
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setHighlight(0);
    savedRef.current = false;
  };

  const handleColsChange = (newCols: number) => {
    setCols(newCols);
    setHighlight(0);
    setRunning(false);
    savedRef.current = false;
  };

  const handlePassageChange = (newIndex: number) => {
    setPassageIndex(newIndex);
    reset();
  };

  const atEnd = highlight >= lines.length - 1 && highlight > 0 && !running;

  return (
    <Section
      title="Chunking Drill"
      desc="Take in word groups in one fixation. Don't read word-by-word — let your eye land between the columns."
    >
      <Callout
        icon={Info}
        tone={isJunkBaseline ? 'warn' : 'accent'}
        body={
          isJunkBaseline ? (
            <>
              Your baseline of {baselineWpm} WPM looks rushed — Chunking needs a realistic target.
              Retake from <strong className="font-semibold text-navy">Baseline</strong> for a useful training number.
            </>
          ) : (
            <>
              Recommended start: {recommended} WPM at {cols} words per fixation. Push WPM up by 25–50
              once your eye can hold a {cols}-word chunk without backtracking.
            </>
          )
        }
      />

      {/* Lines stage — passage rendered as a grid of word groups, one row per line */}
      <div className="bg-surface border border-line rounded-lg p-5 my-5 max-h-[480px] overflow-y-auto">
        <div className="space-y-1">
          {lines.map((line, i) => {
            const state = i === highlight ? 'current' : i < highlight ? 'past' : 'future';
            return (
              <div
                key={i}
                className={`grid gap-3 px-3 py-1.5 rounded-sm border-l-2 transition-all
                  ${state === 'current'
                    ? 'opacity-100 bg-violet-soft border-violet'
                    : state === 'past'
                      ? 'opacity-25 border-transparent'
                      : 'opacity-45 border-transparent'}`}
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {line.map((w, j) => (
                  <span key={j} className="font-mono text-[15px] text-navy tabular-nums">
                    {w}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[12px] text-ink-muted text-center mb-6 tabular-nums">
        Line {Math.min(highlight + 1, lines.length)} of {lines.length} · {wpm} WPM · {cols} words/fixation
      </p>

      {/* Controls */}
      <div className="bg-surface border border-line rounded-lg p-5">
        <Slider
          label="Words per fixation"
          value={cols}
          min={2}
          max={5}
          step={1}
          onChange={handleColsChange}
        />
        <Slider
          label="Target WPM"
          value={wpm}
          min={200}
          max={700}
          step={10}
          onChange={setWpm}
          suffix=" WPM"
        />
        <PassageSelector
          passages={rotation.passages}
          value={passageIndex}
          onChange={handlePassageChange}
        />

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
