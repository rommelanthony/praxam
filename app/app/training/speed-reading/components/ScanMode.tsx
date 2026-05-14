'use client';
// Scan drill: trains the UCAT scan-and-locate technique. User is shown one
// keyword at a time and clicks it in the passage as fast as possible. Repeats
// for ~4 keywords. Measures total scan time and per-keyword find time.
//
// No target WPM, no comprehension check. wpm column and comprehension_pct on
// the saved row are both null. Meta carries the per-keyword find times so
// Progress can chart finder speed across sessions later.
//
// Keyword extraction: words longer than 6 chars, alphabetic only (allows
// proper nouns post-lowercase), deduped. Slice top 4. Most UCAT-realistic
// passages yield 20-50 candidates; bottom edge is guarded by disabling
// Start when keywords.length === 0.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Info, RotateCcw, Search } from 'lucide-react';
import { Section } from './shared/Section';
import { Callout } from './shared/Callout';
import { BigStat } from './shared/BigStat';
import { PassageSelector } from './shared/PassageSelector';
import { fireToast } from '@/components/Toast';
import { saveScanSession } from '../actions';
import type { PassageRotation } from '../SpeedReadingApp';

type Stage = 'ready' | 'scanning' | 'done';
type Found = { word: string; t: number };

const PUNCTUATION_RE = /[.,;:"'!?()]/g;

export function ScanMode({ rotation }: { rotation: PassageRotation }) {
  const [passageIndex, setPassageIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('ready');
  const [targetIdx, setTargetIdx] = useState(0);
  const [found, setFound] = useState<Found[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const savedRef = useRef(false);

  const passage = rotation.passages[passageIndex];

  const keywords = useMemo(() => {
    const candidates = passage.text
      .replace(PUNCTUATION_RE, '')
      .split(/\s+/)
      .filter((w) => w.length > 6 && /^[a-zA-Z]+$/.test(w))
      .map((w) => w.toLowerCase());
    return Array.from(new Set(candidates)).slice(0, 4);
  }, [passage]);

  // Tick elapsed only while scanning.
  useEffect(() => {
    if (stage !== 'scanning') return;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(t);
  }, [stage]);

  const start = () => {
    if (keywords.length === 0) return;
    setStage('scanning');
    setTargetIdx(0);
    setFound([]);
    setElapsed(0);
    savedRef.current = false;
    startRef.current = Date.now();
  };

  const handleWordClick = (rawWord: string) => {
    if (stage !== 'scanning') return;
    const clean = rawWord.replace(PUNCTUATION_RE, '').toLowerCase();
    const target = keywords[targetIdx];
    if (clean !== target) return; // silent rejection on wrong clicks

    const tFound = (Date.now() - startRef.current) / 1000;
    const newFound: Found[] = [...found, { word: target, t: tFound }];
    setFound(newFound);

    const next = targetIdx + 1;
    if (next >= keywords.length) {
      setStage('done');
      void handleComplete(newFound);
    } else {
      setTargetIdx(next);
    }
  };

  const handleComplete = async (foundList: Found[]) => {
    if (savedRef.current) return;
    savedRef.current = true;
    // Per-keyword find times = deltas between consecutive finds. The first
    // is measured from start; the rest are from the previous find.
    const perKeywordSec = foundList.map((f, i) =>
      Math.round((i === 0 ? f.t : f.t - foundList[i - 1].t) * 100) / 100
    );
    const totalElapsed = foundList.length > 0 ? foundList[foundList.length - 1].t : 0;
    const res = await saveScanSession({
      passageId: passage.id,
      elapsedSec: Math.round(totalElapsed * 100) / 100,
      keywordCount: keywords.length,
      perKeywordSec,
    });
    if (res.ok) {
      fireToast({ message: 'Scan session saved', tone: 'success' });
      rotation.markPassageShown(passage.id);
    } else {
      fireToast({ message: 'Save failed — please retry', tone: 'warn' });
      savedRef.current = false;
    }
  };

  const reset = () => {
    setStage('ready');
    setTargetIdx(0);
    setFound([]);
    setElapsed(0);
    savedRef.current = false;
  };

  const handlePassageChange = (newIndex: number) => {
    setPassageIndex(newIndex);
    reset();
  };

  const foundWords = useMemo(() => new Set(found.map((f) => f.word)), [found]);

  return (
    <Section
      title="Scan Drill"
      desc="The dominant UCAT VR strategy: read the question first, then scan for keywords. This drill trains the scan itself."
    >
      <Callout
        icon={Info}
        tone="accent"
        title="Why this matters for UCAT"
        body="Most T/F/CT questions don't need a full read. Top scorers scan for keywords and read only the surrounding sentence. This drill builds that reflex."
      />

      {stage === 'ready' && (
        <div className="bg-surface border border-line rounded-lg p-5 my-5">
          <PassageSelector
            passages={rotation.passages}
            value={passageIndex}
            onChange={handlePassageChange}
          />

          <div className="bg-surface-cool border border-line rounded-md p-4 mb-4">
            <div className="flex items-center gap-2 text-[12px] text-ink-muted mb-2 uppercase tracking-wider">
              <span className="capitalize">{passage.difficulty}</span>
              <span>·</span>
              <span>{passage.wordCount} words</span>
              <span>·</span>
              <span>{keywords.length} keyword{keywords.length === 1 ? '' : 's'} to find</span>
            </div>
            <h3 className="text-[16px] font-bold text-navy mb-1">{passage.title}</h3>
            <p className="text-[13px] text-ink-soft">
              You'll be shown one keyword at a time. Click it in the passage as fast as you can.
            </p>
          </div>

          {keywords.length === 0 ? (
            <p className="text-[13px] text-amber mb-3">
              This passage didn't yield any suitable keywords. Pick a different one.
            </p>
          ) : null}

          <button
            type="button"
            onClick={start}
            disabled={keywords.length === 0}
            className="btn btn-teal inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={16} /> Start scanning
          </button>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="my-5">
          {/* Scan bar — sticky so the target stays visible while user scans down */}
          <div className="flex items-center justify-between bg-surface border border-line rounded-md px-4 py-3 mb-4 sticky top-2 z-10 shadow-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                Find:
              </span>
              <span className="text-[20px] font-mono font-bold text-teal-deep tabular-nums">
                {keywords[targetIdx]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[14px]">
              <Clock size={14} className="text-ink-muted" />
              <span className="font-bold tabular-nums text-navy">{elapsed.toFixed(1)}s</span>
              <span className="text-line">·</span>
              <span className="text-ink-soft tabular-nums">
                {targetIdx} / {keywords.length}
              </span>
            </div>
          </div>

          {/* Passage with clickable words */}
          <article className="bg-surface border border-line rounded-lg p-6 max-w-[68ch]">
            <h2 className="text-xl font-bold text-navy mb-3">{passage.title}</h2>
            {passage.text.split('\n\n').map((para, pi) => (
              <p key={pi} className="text-ink-soft leading-relaxed mb-3 last:mb-0">
                {para.split(/\s+/).map((w, wi) => {
                  const clean = w.replace(PUNCTUATION_RE, '').toLowerCase();
                  const isFound = foundWords.has(clean);
                  return (
                    <span key={`${pi}-${wi}`}>
                      <span
                        onClick={() => handleWordClick(w)}
                        className={`cursor-pointer rounded-sm px-0.5 ${
                          isFound ? 'bg-teal-soft text-teal-deep font-semibold' : 'hover:bg-surface-cool'
                        }`}
                      >
                        {w}
                      </span>{' '}
                    </span>
                  );
                })}
              </p>
            ))}
          </article>
        </div>
      )}

      {stage === 'done' && (
        <div className="my-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <BigStat
              label="Total scan time"
              value={found[found.length - 1]?.t.toFixed(1) ?? '0.0'}
              unit="sec"
              tone="accent"
            />
            <BigStat
              label="Avg per keyword"
              value={
                found.length > 0
                  ? (found[found.length - 1].t / found.length).toFixed(1)
                  : '0.0'
              }
              unit="sec"
              tone="success"
            />
          </div>

          <div className="bg-surface border border-line rounded-lg p-4">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-3">
              Keyword find times
            </div>
            <ul className="space-y-1.5">
              {found.map((f, i) => {
                const delta = i === 0 ? f.t : f.t - found[i - 1].t;
                return (
                  <li
                    key={`${f.word}-${i}`}
                    className="flex items-center justify-between text-[14px]"
                  >
                    <span className="font-mono text-navy">{f.word}</span>
                    <span className="text-ink-soft tabular-nums">{delta.toFixed(1)}s</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="btn btn-teal inline-flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Another scan
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
