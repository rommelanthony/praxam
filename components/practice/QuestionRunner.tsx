'use client';
// The interactive practice loop. Holds one question's state, calls the
// server action to grade + fetch the next, then resets.
import { useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { answerAndNext } from '@/app/app/practice/[subtest]/actions';

interface Question {
  id: string;
  subtest: string;
  topic: string | null;
  passage: string | null;
  passageTitle: string | null;
  passageId: string | null;
  stem: string;
  choices: { label: string; text: string }[];
  correctAnswer: string | null;
  explanation: string | null;
  groupExplanation: string | null;
  imageRefs: string[];
  imageRoles: Record<string, string>;
  source: { book: string; bookTitle: string; originalNumber: string };
}

export default function QuestionRunner({
  subtestSlug,
  subtestName,
  initialQuestion,
  plan,
}: {
  subtestSlug: string;
  subtestName: string;
  initialQuestion: Question;
  plan: 'free' | 'pro';
}) {
  const [question, setQuestion] = useState<Question | null>(initialQuestion);
  const [picked, setPicked] = useState<string | null>(null);
  const [grading, setGrading] = useState<{ isCorrect: boolean; correctAnswer: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const startTime = useRef(Date.now());

  // Reset start time whenever a new question loads
  useEffect(() => {
    startTime.current = Date.now();
    setPicked(null);
    setGrading(null);
  }, [question?.id]);

  function pick(letter: string) {
    if (picked || isPending || !question) return;
    setPicked(letter);
    const timeTakenMs = Date.now() - startTime.current;
    startTransition(async () => {
      const res = await answerAndNext({
        subtestSlug,
        questionId: question.id,
        pickedLetter: letter,
        timeTakenMs,
      });
      setGrading(res.grading);
      setStats((s) => ({
        answered: s.answered + 1,
        correct: s.correct + (res.grading.isCorrect ? 1 : 0),
      }));
      // Stash next question on the side; user clicks "Next" to advance
      (window as any).__praxamNext = res.next;
    });
  }

  function next() {
    const n = (window as any).__praxamNext as Question | null;
    setQuestion(n);
  }

  if (!question) {
    return (
      <div className="container-px py-16 max-w-2xl">
        <h1 className="text-2xl font-bold text-navy mb-3">You&apos;re done for now.</h1>
        <p className="text-ink-soft mb-2">You answered {stats.answered} questions, {stats.correct} correct ({stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%).</p>
        {plan === 'free' && (
          <p className="text-ink-soft mb-6">
            That&apos;s the end of the free questions for this subtest. Upgrade to Pro for the full library.
          </p>
        )}
        <div className="flex gap-3 flex-wrap">
          <Link href="/app/practice" className="btn btn-teal">Pick another subtest</Link>
          <Link href="/app" className="btn btn-ghost">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const isAR = question.subtest === 'abstract_reasoning';
  const isQR = question.subtest === 'quantitative_reasoning';

  return (
    <div className="container-px py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/app/practice" className="text-[14px] text-ink-soft hover:text-navy">← Subtests</Link>
        <div className="flex items-center gap-4 text-[13px] font-mono text-ink-muted">
          <span>{subtestName}</span>
          <span className="text-ink">{stats.answered}<span className="text-ink-muted">/answered</span></span>
          <span className="text-teal-deep">{stats.correct}<span className="text-ink-muted">/correct</span></span>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6 md:p-8">
        {question.passage && (
          <div className="bg-surface-cool border-l-4 border-teal rounded-md p-4 mb-5 max-h-72 overflow-auto text-[14.5px] text-ink-soft leading-relaxed">
            {question.passageTitle && (
              <div className="text-[12px] font-bold uppercase tracking-wider text-teal-deep mb-2">
                Passage: {question.passageTitle}
              </div>
            )}
            {question.passage}
          </div>
        )}

        {/* AR images */}
        {isAR && question.imageRoles?.setA && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface-cool border border-line rounded-md p-2 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">Set A</div>
              <img src={question.imageRoles.setA} alt="Set A" className="max-w-full h-auto rounded" />
            </div>
            <div className="bg-surface-cool border border-line rounded-md p-2 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">Set B</div>
              <img src={question.imageRoles.setB} alt="Set B" className="max-w-full h-auto rounded" />
            </div>
          </div>
        )}
        {isAR && question.imageRoles?.testShape && (
          <div className="border-2 border-teal bg-teal-soft rounded-md p-3 text-center mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-deep mb-1.5">Test shape</div>
            <img src={question.imageRoles.testShape} alt="Test shape" className="max-w-[240px] mx-auto bg-white rounded" />
          </div>
        )}

        {/* QR chart */}
        {isQR && question.imageRoles?.chart && (
          <div className="border border-line bg-white rounded-md p-3 text-center mb-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">Chart / table</div>
            <img src={question.imageRoles.chart} alt="Chart" className="max-w-full mx-auto rounded" />
          </div>
        )}

        <div className="font-semibold text-[17px] text-navy mb-5 leading-snug">{question.stem}</div>

        <div className="grid gap-2.5">
          {question.choices.map((c) => {
            let cls = 'demo-choice';
            if (picked) {
              cls += ' locked';
              if (c.label === grading?.correctAnswer) cls += ' correct';
              else if (c.label === picked) cls += ' incorrect';
            }
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => pick(c.label)}
                disabled={!!picked || isPending}
                className={cls}
              >
                <span className="letter">{c.label}</span>
                {c.text}
              </button>
            );
          })}
        </div>

        {grading && (
          <div className="mt-5 rounded-md p-4" style={{ background: grading.isCorrect ? 'var(--teal-soft)' : 'var(--violet-soft)' }}>
            <div className="font-bold uppercase text-[12px] tracking-wider mb-1.5" style={{ color: grading.isCorrect ? 'var(--teal-deep)' : 'var(--violet)' }}>
              {grading.isCorrect ? 'Correct!' : `Correct answer: ${grading.correctAnswer}`}
            </div>
            {question.explanation && (
              <div className="text-[14.5px] text-navy leading-relaxed">{question.explanation}</div>
            )}
            {question.groupExplanation && (
              <div className="mt-3 pt-3 border-t border-line text-[13.5px] italic text-ink-soft">
                <strong className="block uppercase text-[11px] tracking-wider mb-1 not-italic">Group rule</strong>
                {question.groupExplanation}
              </div>
            )}
          </div>
        )}
      </div>

      {grading && (
        <div className="flex justify-end mt-6">
          <button onClick={next} className="btn btn-teal btn-large" autoFocus>
            Next question →
          </button>
        </div>
      )}
    </div>
  );
}
