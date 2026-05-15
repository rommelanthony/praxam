'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Question } from '@/db/schema';
import ChartPassage from '@/components/practice/ChartPassage';
import { openPaywall } from '@/components/PaywallModal';
import { SUBTEST_NAMES } from '@/lib/questions/labels';

type PaywallState = {
  reason: string;
  subtest: string;
  attempted: number;
  freeLimit: number;
};

const SUBTEST_LABELS: Record<string, string> = {
  'verbal-reasoning': 'Verbal Reasoning',
  'decision-making': 'Decision Making',
  'quantitative-reasoning': 'Quantitative Reasoning',
  'abstract-reasoning': 'Abstract Reasoning',
  'situational-judgement': 'Situational Judgement',
};

const SLUG_TO_KEY: Record<string, string> = {
  'verbal-reasoning': 'verbal_reasoning',
  'decision-making': 'decision_making',
  'quantitative-reasoning': 'quantitative_reasoning',
  'abstract-reasoning': 'abstract_reasoning',
  'situational-judgement': 'situational_judgement',
};

type QuestionState = 'unanswered' | 'correct' | 'wrong';

export default function SubtestPage() {
  const { subtest } = useParams<{ subtest: string }>();
  const router = useRouter();
  const label = SUBTEST_LABELS[subtest] ?? subtest;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<QuestionState>('unanswered');
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading] = useState(true);
  const [startMs, setStartMs] = useState(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [paywall, setPaywall] = useState<PaywallState | null>(null);

  // Fire the paywall modal with practice-specific copy. Used by both
  // fetchQuestions (when the bulk fetch returns the paywall arm) and the
  // inline "Upgrade to Pro" button on the lock state (when the user closes
  // the modal and wants it back).
  const triggerPaywallModal = useCallback((pw: PaywallState) => {
    openPaywall({
      title: `You've used your ${pw.freeLimit} free ${SUBTEST_NAMES[pw.subtest] ?? pw.subtest} questions`,
      body: <>Upgrade to Pro to access the full question bank — every subtest, no caps.</>,
    });
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setSessionError(false);
    setPaywall(null);
    const key = SLUG_TO_KEY[subtest];
    const res = await fetch(`/api/questions?subtest=${key}&limit=20`);
    const data = await res.json();

    // Free user hit the 10-per-subtest hard-stop. Show lock state + fire
    // the paywall modal. Don't try to create a session — there are no
    // questions to attach to it.
    if (data.paywall) {
      setPaywall(data.paywall);
      triggerPaywallModal(data.paywall);
      setLoading(false);
      return;
    }

    const qs: Question[] = data.questions ?? [];
    setQuestions(qs);
    if (qs.length > 0) {
      try {
        const sres = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtest: key, questionIds: qs.map((q) => q.id) }),
        });
        const sdata = await sres.json();
        if (sres.ok && sdata.id) {
          setSessionId(sdata.id);
        } else {
          setSessionError(true);
        }
      } catch (e) {
        console.error('[practice] session create failed:', e);
        setSessionError(true);
      }
    }
    setLoading(false);
    setStartMs(Date.now());
  }, [subtest, triggerPaywallModal]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const progress = questions.length > 0 ? (index / questions.length) * 100 : 0;

  function pick(letter: string) {
    if (state !== 'unanswered') return;
    if (!sessionId) return;
    setPicked(letter);
    const correct = letter === current.correctAnswer;
    setState(correct ? 'correct' : 'wrong');
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: current.id,
        sessionId,
        pickedLetter: letter,
        isCorrect: correct,
        timeTakenMs: Date.now() - startMs,
      }),
    });
  }

  function next() {
    if (isLast) {
      router.push(`/app/practice?finished=1&correct=${score.correct}&total=${questions.length}`);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setState('unanswered');
    setStartMs(Date.now());
  }

  if (loading) return (
    <div className="container-px py-16 flex items-center justify-center">
      <div className="text-ink-soft text-sm animate-pulse">Loading questions…</div>
    </div>
  );

  if (sessionError) return (
    <div className="container-px py-16 text-center">
      <p className="text-ink-soft mb-4">Couldn&apos;t start practice session. Refresh to try again.</p>
      <button onClick={() => router.back()} className="text-teal-deep underline text-sm">Go back</button>
    </div>
  );

  // Paywall lock state: free user has used all 10 free questions in this
  // subtest. Persistent (survives modal close) and reload-safe (re-fetch
  // would return the same paywall response). Click "Upgrade to Pro" to
  // re-open the modal.
  if (paywall) return (
    <div className="container-px py-16 max-w-2xl mx-auto text-center">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-violet mb-2">Subtest locked</p>
      <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-navy mb-3">
        You&apos;ve used your {paywall.freeLimit} free {SUBTEST_NAMES[paywall.subtest] ?? paywall.subtest} questions
      </h1>
      <p className="text-ink-soft mb-6">Upgrade to Pro to access the full question bank — every subtest, no caps.</p>
      <button
        type="button"
        onClick={() => triggerPaywallModal(paywall)}
        className="btn btn-teal"
      >
        Upgrade to Pro
      </button>
    </div>
  );

  if (!current) return (
    <div className="container-px py-16 text-center">
      <p className="text-ink-soft mb-4">No questions available for this subtest yet.</p>
      <button onClick={() => router.back()} className="text-teal-deep underline text-sm">Go back</button>
    </div>
  );

  return (
    <div className="container-px py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep">{label}</p>
        <span className="text-[13px] text-ink-muted font-mono">{index + 1} / {questions.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-line rounded-full h-1 mb-8">
        <div className="bg-teal-deep h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Passage — ChartPassage renders __chart__ JSON specs as SVG, plain text otherwise */}
      {current.passage && (
        <div className="bg-surface border border-line rounded-lg p-5 mb-6 text-[15px] text-ink leading-relaxed">
          {current.passageTitle && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-3">
              {current.passageTitle}
            </p>
          )}
          <ChartPassage passage={current.passage} />
        </div>
      )}

      {/* Question stem */}
      <div className="mb-6">
        <p className="text-[17px] font-semibold text-navy leading-snug">{current.stem}</p>
      </div>

      {/* Answer choices */}
      <div className="flex flex-col gap-3 mb-8">
        {(current.choices as Array<{ label: string; text: string }>).map((c) => {
          const isCorrect = c.label === current.correctAnswer;
          const isPicked = c.label === picked;
          let cls = 'flex items-start gap-3 p-4 rounded-lg border text-[15px] transition-all text-left ';
          if (state === 'unanswered') {
            cls += 'border-line hover:border-teal-soft hover:bg-teal-50/30 bg-surface cursor-pointer';
          } else if (isCorrect) {
            cls += 'border-green-400 bg-green-50 text-green-900 cursor-default';
          } else if (isPicked && !isCorrect) {
            cls += 'border-red-400 bg-red-50 text-red-900 cursor-default';
          } else {
            cls += 'border-line bg-surface opacity-40 cursor-default';
          }
          return (
            <button
              key={c.label}
              onClick={() => pick(c.label)}
              disabled={state !== 'unanswered'}
              className={cls}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded border border-current flex items-center justify-center text-[12px] font-bold mt-0.5">
                {c.label}
              </span>
              <span>{c.text}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {state !== 'unanswered' && current.explanation && (
        <div className={`rounded-lg p-4 mb-6 text-[14px] leading-relaxed border ${
          state === 'correct'
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <p className="font-semibold mb-1">{state === 'correct' ? '✓ Correct' : '✗ Incorrect'}</p>
          <p>{current.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {state !== 'unanswered' && (
        <button
          onClick={next}
          className="w-full py-3 rounded-lg bg-navy text-white font-semibold text-[15px] hover:bg-navy/90 transition-all"
        >
          {isLast ? 'Finish session →' : 'Next question →'}
        </button>
      )}

      {/* Score tracker */}
      <div className="flex gap-4 mt-6 text-[13px] font-mono">
        <span className="text-green-600">✓ {score.correct} correct</span>
        <span className="text-red-500">✗ {score.wrong} wrong</span>
      </div>
    </div>
  );
}
