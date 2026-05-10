'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import type { Question, Answer } from '@/db/schema';

const SUBTEST_LABELS: Record<string, string> = {
  verbal_reasoning: 'Verbal Reasoning',
  decision_making: 'Decision Making',
  quantitative_reasoning: 'Quantitative Reasoning',
  abstract_reasoning: 'Abstract Reasoning',
  situational_judgement: 'Situational Judgement',
};

const SLUG_TO_KEY: Record<string, string> = {
  'verbal-reasoning': 'verbal_reasoning',
  'decision-making': 'decision_making',
  'quantitative-reasoning': 'quantitative_reasoning',
  'abstract-reasoning': 'abstract_reasoning',
  'situational-judgement': 'situational_judgement',
};

type ResultItem = { answer: Answer; question: Question };
type Summary = { correct: number; total: number; totalMs: number; subtest: string };

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const colour = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
  const ringColour = pct >= 70 ? 'stroke-green-500' : pct >= 50 ? 'stroke-amber-400' : 'stroke-red-400';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className={`${ringColour} transition-all duration-700`}
        />
      </svg>
      <div className="text-center z-10">
        <p className={`text-3xl font-bold ${colour}`}>{pct}%</p>
        <p className="text-xs text-ink-muted font-mono">{correct}/{total}</p>
      </div>
    </div>
  );
}

function ExplanationBody({ text, isCorrect }: { text: string; isCorrect: boolean }) {
  const headingColor = isCorrect ? 'text-green-800' : 'text-red-800';
  const bulletColor  = isCorrect ? 'text-green-700' : 'text-red-700';
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => <strong className={`font-semibold ${headingColor}`}>{children}</strong>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="mt-1 space-y-0.5">{children}</ul>,
        li: ({ children }) => (
          <li className={`flex items-start gap-1.5 ${bulletColor}`}>
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
            <span>{children}</span>
          </li>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function QuestionRow({ item, index }: { item: ResultItem; index: number }) {
  const [open, setOpen] = useState(!item.answer.isCorrect); // wrong answers open by default
  const { answer, question } = item;
  if (!question) return null;

  const isCorrect = answer.isCorrect ?? false;
  const choices = question.choices as Array<{ label: string; text: string }>;
  const pickedChoice = choices.find((c) => c.label === answer.pickedLetter);
  const correctChoice = choices.find((c) => c.label === question.correctAnswer);

  return (
    <div className={`rounded-lg border ${isCorrect ? 'border-green-200' : 'border-red-200'} overflow-hidden`}>
      {/* Row header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-start gap-4 p-4 text-left transition-colors ${
          isCorrect ? 'bg-green-50 hover:bg-green-100/60' : 'bg-red-50 hover:bg-red-100/60'
        }`}
      >
        {/* Number + icon */}
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${
          isCorrect ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
        }`}>
          {isCorrect ? '✓' : '✗'}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-ink-muted font-mono mb-0.5">Q{index + 1}</p>
          <p className="text-[15px] font-medium text-navy leading-snug line-clamp-2">{question.stem}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-[12px] font-mono">
            <span className={isCorrect ? 'text-green-700' : 'text-red-600'}>
              Your answer: {answer.pickedLetter} — {pickedChoice?.text ?? '—'}
            </span>
            {!isCorrect && (
              <span className="text-green-700">
                Correct: {question.correctAnswer} — {correctChoice?.text ?? '—'}
              </span>
            )}
            {answer.timeTakenMs && (
              <span className="text-ink-muted">{fmt(answer.timeTakenMs)}</span>
            )}
          </div>
        </div>

        <span className={`flex-shrink-0 text-[18px] transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
          isCorrect ? 'text-green-400' : 'text-red-400'
        }`}>
          ↓
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className={`px-4 pb-4 pt-2 border-t ${
          isCorrect ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'
        }`}>
          {/* Passage if present */}
          {question.passage && (
            <div className="bg-white border border-line rounded-md p-3 mb-3 text-[13px] text-ink leading-relaxed">
              {question.passageTitle && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  {question.passageTitle}
                </p>
              )}
              <p className="whitespace-pre-line line-clamp-6">{question.passage}</p>
            </div>
          )}

          {/* All choices */}
          <div className="flex flex-col gap-1.5 mb-3">
            {choices.map((c) => {
              const isCor = c.label === question.correctAnswer;
              const isPicked = c.label === answer.pickedLetter;
              let cls = 'flex items-start gap-2 px-3 py-2 rounded text-[13px] ';
              if (isCor) cls += 'bg-green-100 text-green-900 font-medium';
              else if (isPicked && !isCor) cls += 'bg-red-100 text-red-900 line-through opacity-70';
              else cls += 'text-ink-soft opacity-50';
              return (
                <div key={c.label} className={cls}>
                  <span className="font-bold flex-shrink-0">{c.label}.</span>
                  <span>{c.text}</span>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {question.explanation && (
            <div className={`rounded-md p-3 text-[13px] leading-relaxed ${
              isCorrect ? 'bg-green-100/60 text-green-900' : 'bg-red-100/60 text-red-900'
            }`}>
              <ExplanationBody text={question.explanation} isCorrect={isCorrect} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const { subtest } = useParams<{ subtest: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session');

  const [results, setResults] = useState<ResultItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  useEffect(() => {
    if (!sessionId) { setError('No session found.'); setLoading(false); return; }
    fetch(`/api/results?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setResults(data.results);
        setSummary(data.summary);
      })
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const subtestKey = SLUG_TO_KEY[subtest] ?? subtest;
  const label = SUBTEST_LABELS[subtestKey] ?? subtest;

  const filtered = results.filter((r) => {
    if (filter === 'wrong') return !r.answer.isCorrect;
    if (filter === 'correct') return r.answer.isCorrect;
    return true;
  });

  // Topic breakdown
  const topicMap: Record<string, { correct: number; total: number }> = {};
  for (const r of results) {
    const topic = r.question?.topic ?? 'General';
    if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
    topicMap[topic].total++;
    if (r.answer.isCorrect) topicMap[topic].correct++;
  }
  const topics = Object.entries(topicMap).filter(([, v]) => v.total > 1);

  if (loading) return (
    <div className="container-px py-16 flex items-center justify-center">
      <div className="text-ink-soft text-sm animate-pulse">Loading results…</div>
    </div>
  );

  if (error) return (
    <div className="container-px py-16 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => router.push('/app/practice')} className="text-teal-deep underline text-sm">
        Back to practice
      </button>
    </div>
  );

  const pct = summary ? Math.round((summary.correct / summary.total) * 100) : 0;
  const grade = pct >= 70 ? 'Strong performance' : pct >= 50 ? 'Keep practising' : 'Needs work';
  const gradeColor = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="container-px py-8 max-w-3xl">
      {/* Header */}
      <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-1">{label}</p>
      <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-navy mb-8">Session results</h1>

      {/* Score card */}
      <div className="bg-surface border border-line rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
        {summary && <ScoreRing correct={summary.correct} total={summary.total} />}

        <div className="flex-1 text-center sm:text-left">
          <p className={`text-xl font-bold mb-1 ${gradeColor}`}>{grade}</p>
          <p className="text-ink-soft text-[15px] mb-4">
            {summary?.correct} correct out of {summary?.total} questions
            {summary?.totalMs ? ` · ${fmt(summary.totalMs)} total` : ''}
          </p>

          {/* Topic breakdown */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topics.map(([topic, v]) => {
                const tPct = Math.round((v.correct / v.total) * 100);
                const tColor = tPct >= 70 ? 'bg-green-100 text-green-800' : tPct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700';
                return (
                  <span key={topic} className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${tColor}`}>
                    {topic.replace(/_/g, ' ')}: {tPct}%
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => router.push(`/app/practice/${subtest}`)}
          className="flex-1 py-2.5 rounded-lg bg-navy text-white font-semibold text-[14px] hover:bg-navy/90 transition-all"
        >
          Practice again →
        </button>
        <button
          onClick={() => router.push('/app/practice')}
          className="flex-1 py-2.5 rounded-lg border border-line text-ink font-semibold text-[14px] hover:border-teal-soft hover:bg-teal-50/30 transition-all"
        >
          All subtests
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'wrong', 'correct'] as const).map((f) => {
          const count = f === 'all' ? results.length
            : f === 'wrong' ? results.filter((r) => !r.answer.isCorrect).length
            : results.filter((r) => r.answer.isCorrect).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                filter === f
                  ? 'bg-navy text-white'
                  : 'bg-surface border border-line text-ink-muted hover:border-teal-soft'
              }`}
            >
              {f === 'all' ? 'All' : f === 'wrong' ? '✗ Wrong' : '✓ Correct'} ({count})
            </button>
          );
        })}
      </div>

      {/* Question list */}
      <div className="flex flex-col gap-3">
        {filtered.map((item, i) => (
          <QuestionRow
            key={item.answer.id}
            item={item}
            index={results.indexOf(item)}
          />
        ))}
      </div>
    </div>
  );
}
