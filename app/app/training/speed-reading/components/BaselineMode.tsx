'use client';
// Forced first-run diagnostic. Four stages: intro -> reading -> quiz -> done.
// Measures raw WPM (passage.wordCount / elapsed * 60) and comprehension
// (correct / total questions). On Save, calls saveBaselineSession() server
// action; on success, fires a toast and tells the parent to refresh + switch
// to Overview.
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Clock, Info, Play, Target } from 'lucide-react';
import { Section } from './shared/Section';
import { Callout } from './shared/Callout';
import { BigStat } from './shared/BigStat';
import { SpeedScale } from './SpeedScale';
import { TIER } from '@/lib/speed-reading/constants';
import { TONE_CLASSES } from '@/lib/speed-reading/tones';
import { fireToast } from '@/components/Toast';
import { saveBaselineSession } from '../actions';
import type { Passage } from '@/lib/speed-reading/types';

type Stage = 'intro' | 'reading' | 'quiz' | 'done';

export function BaselineMode({
  passage,
  isFirstRun,
  onSaved,
}: {
  passage: Passage;
  isFirstRun: boolean;
  onSaved: () => void;
}) {
  const [stage, setStage] = useState<Stage>('intro');
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{
    wpm: number;
    comp: number;
    elapsedSec: number;
    answers: number[];
    correctAnswers: number[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef(0);

  // Tick the elapsed counter only while reading.
  useEffect(() => {
    if (stage !== 'reading') return;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(t);
  }, [stage]);

  const startReading = () => {
    setElapsed(0);
    setAnswers({});
    setError(null);
    startRef.current = Date.now();
    setStage('reading');
  };

  const finishReading = () => setStage('quiz');

  const submitQuiz = () => {
    const elapsedSec = Math.max(0.1, elapsed);
    // Normalize answers to a stable array (one entry per question, in order).
    // Submit is gated on every question being answered so no undefined slots.
    const answersArr = passage.questions.map((_, i) => answers[i]);
    const correctArr = passage.questions.map((q) => q.answer);
    const correct = answersArr.reduce((n, a, i) => n + (a === correctArr[i] ? 1 : 0), 0);
    const comp = Math.round((correct / passage.questions.length) * 100);
    const wpm = Math.round((passage.wordCount / elapsedSec) * 60);
    setResult({ wpm, comp, elapsedSec, answers: answersArr, correctAnswers: correctArr });
    setStage('done');
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setError(null);
    const res = await saveBaselineSession({
      wpm: result.wpm,
      comprehensionPct: result.comp,
      passageId: passage.id,
      elapsedSec: result.elapsedSec,
      meta: {
        answers: result.answers,
        correctAnswers: result.correctAnswers,
        questionCount: passage.questions.length,
        wordCount: passage.wordCount,
      },
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      fireToast({ message: 'Save failed — please retry', tone: 'warn' });
      return;
    }
    fireToast({ message: 'Baseline saved', tone: 'success' });
    onSaved();
  };

  if (stage === 'intro') {
    return (
      <Section
        title={isFirstRun ? "First, let's measure your baseline" : 'Retake baseline'}
        desc="Read one real-style passage at your natural pace, then answer the comprehension questions. This sets your training targets."
      >
        <div className="bg-surface border border-line rounded-lg p-6">
          {isFirstRun && (
            <div className="mb-5">
              <Callout
                icon={Info}
                tone="accent"
                title="Why this matters"
                body="UCAT Verbal Reasoning gives you ~2 minutes per passage. Without knowing your current speed and comprehension, training targets are guesswork. The baseline takes 90 seconds."
              />
            </div>
          )}
          <ol className="space-y-3 mb-6">
            <BaselineStep n={1} title="Read naturally" body="Don't try to speed up yet. Read as you normally would." />
            <BaselineStep n={2} title="Click 'Done reading'" body="The timer captures your raw WPM." />
            <BaselineStep n={3} title={`Answer ${passage.questions.length} questions`} body="This measures whether you actually absorbed the passage." />
          </ol>
          <button type="button" onClick={startReading} className="btn btn-teal inline-flex items-center gap-1.5">
            <Play size={16} /> Begin baseline test
          </button>
        </div>
      </Section>
    );
  }

  if (stage === 'reading') {
    const wpmNow = elapsed > 0 ? Math.round((passage.wordCount / elapsed) * 60) : 0;
    return (
      <Section title="Baseline: read naturally" desc="Don't rush. We're measuring your current speed.">
        <div className="flex items-center justify-between bg-surface border border-line rounded-md px-4 py-3 mb-4 sticky top-2 z-10 shadow-sm">
          <div className="flex items-center gap-3 text-[14px]">
            <Clock size={14} className="text-ink-muted" />
            <span className="font-bold tabular-nums text-navy">{elapsed.toFixed(1)}s</span>
            <span className="text-line">·</span>
            <span className="font-medium text-teal-deep tabular-nums">{wpmNow} WPM pace</span>
          </div>
          <button type="button" onClick={finishReading} className="btn btn-teal inline-flex items-center gap-1.5">
            Done reading <ChevronRight size={16} />
          </button>
        </div>
        <article className="bg-surface border border-line rounded-lg p-6 max-w-[68ch]">
          <h2 className="text-xl font-bold text-navy mb-3">{passage.title}</h2>
          {passage.text.split('\n\n').map((p, i) => (
            <p key={i} className="text-ink-soft leading-relaxed mb-3 last:mb-0">
              {p}
            </p>
          ))}
        </article>
      </Section>
    );
  }

  if (stage === 'quiz') {
    const allAnswered = passage.questions.every((_, i) => answers[i] != null);
    return (
      <Section
        title="Comprehension check"
        desc="A baseline isn't meaningful without comprehension data."
      >
        <div className="space-y-4">
          {passage.questions.map((q, qi) => (
            <fieldset key={q.id} className="bg-surface border border-line rounded-lg p-5">
              <legend className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-2 px-1">
                Question {qi + 1} of {passage.questions.length}
              </legend>
              <p className="text-navy font-medium mb-4">{q.stem}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const checked = answers[qi] === oi;
                  return (
                    <label
                      key={opt.label}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors
                        ${checked ? 'border-teal bg-teal-soft' : 'border-line hover:bg-surface-cool'}`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        value={oi}
                        checked={checked}
                        onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                        className="mt-0.5 accent-teal"
                      />
                      <div className="flex-1">
                        <span className="text-[13px] font-semibold text-ink-muted mr-2">{opt.label}.</span>
                        <span className="text-navy">{opt.text}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={submitQuiz}
            disabled={!allAnswered}
            className="btn btn-teal inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit answers <ChevronRight size={16} />
          </button>
        </div>
      </Section>
    );
  }

  // stage === 'done'
  const tier = TIER(result!.wpm);
  const tierTone = TONE_CLASSES[tier.tone];
  return (
    <Section title="Your baseline" desc="This sets your starting line and training targets.">
      <div className="bg-surface border border-line rounded-lg p-6">
        <div className="text-center mb-5">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
            Your reading speed
          </div>
          <div className="flex items-baseline justify-center gap-2 mb-3">
            <span className={`text-[3.5rem] font-extrabold leading-none ${tierTone.text}`}>
              {result!.wpm}
            </span>
            <span className="text-[18px] font-medium text-ink-soft">WPM</span>
          </div>
          <div
            className={`inline-block px-3 py-1 rounded-pill border ${tierTone.border} ${tierTone.text} text-[13px] font-semibold uppercase tracking-wider`}
          >
            {tier.name}
          </div>
          <p className="mt-3 text-ink-soft max-w-md mx-auto">{tier.note}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <BigStat label="Comprehension" value={result!.comp} unit="%" tone="success" />
          <BigStat
            label="Gap to UCAT target"
            value={Math.max(0, 400 - result!.wpm)}
            unit="WPM"
            tone="warn"
          />
        </div>

        <SpeedScale current={result!.wpm} />

        <div className="mb-5">
          <Callout
            icon={Target}
            tone="accent"
            title="Your training plan"
            body={`Aim for ${
              result!.wpm < 300
                ? '300 WPM as your first checkpoint'
                : result!.wpm < 400
                  ? '400 WPM with 80%+ comprehension'
                  : '500 WPM stretch target'
            }. The Pacer and Chunking drills will get you there; the Passage drill verifies it sticks.`}
          />
        </div>

        {error && (
          <p className="text-red text-[13px] mb-3" role="alert">
            {error === 'not_authenticated'
              ? 'Your session expired. Please sign in again.'
              : `Save failed: ${error}`}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn btn-teal inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save baseline & continue'} <ChevronRight size={16} />
        </button>
      </div>
    </Section>
  );
}

function BaselineStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-pill bg-teal-soft text-teal-deep font-bold text-[14px] flex items-center justify-center">
        {n}
      </div>
      <div>
        <div className="font-semibold text-navy">{title}</div>
        <div className="text-ink-soft text-[14px]">{body}</div>
      </div>
    </li>
  );
}
