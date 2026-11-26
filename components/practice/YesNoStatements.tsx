'use client';
// Renders a Decision Making Yes/No question: one row per statement, each with
// Yes / No buttons. The student answers every row, then submits. Once
// `submitted` is set the rows lock and show right/wrong per statement.
// Mount with key={question.id} so the draft resets between questions.
import { useState } from 'react';
import { gradeYesNo, yesNoWord } from '@/lib/questions/yesno';

type Choice = { label: string; text: string };

export default function YesNoStatements({
  choices,
  answerKey,
  submitted,
  onSubmit,
  disabled = false,
  compact = false,
}: {
  choices: Choice[];
  answerKey: string;
  submitted: string | null;
  onSubmit?: (answer: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState<string[]>(() => choices.map(() => ''));
  const locked = submitted != null || disabled || !onSubmit;
  const values = submitted != null ? submitted.split('') : draft;
  const complete = draft.every((v) => v === 'Y' || v === 'N');
  const grade = submitted != null ? gradeYesNo(submitted, answerKey) : null;

  function set(i: number, v: 'Y' | 'N') {
    if (locked) return;
    setDraft((d) => d.map((x, j) => (j === i ? v : x)));
  }

  const text = compact ? 'text-[13px]' : 'text-[15px]';
  return (
    <div className="flex flex-col gap-3">
      {choices.map((c, i) => {
        const mine = values[i];
        const right = answerKey[i];
        const ok = submitted != null && mine === right;
        let row = `flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border ${compact ? 'p-3' : 'p-4'} ${text} `;
        if (submitted == null) row += 'border-line bg-surface';
        else row += ok ? 'border-green-400 bg-green-50 text-green-900' : 'border-red-400 bg-red-50 text-red-900';
        return (
          <div key={c.label} className={row}>
            <div className="flex items-start gap-3 flex-1">
              <span className="flex-shrink-0 w-6 h-6 rounded border border-current flex items-center justify-center text-[12px] font-bold mt-0.5">
                {c.label}
              </span>
              <span>{c.text}</span>
            </div>
            <div className="flex items-center gap-2 sm:flex-shrink-0 pl-9 sm:pl-0" role="radiogroup" aria-label={`Statement ${c.label}`}>
              {(['Y', 'N'] as const).map((v) => {
                const isMine = mine === v;
                let b = 'min-w-[64px] px-3 py-1.5 rounded-md border text-[13px] font-semibold transition-all ';
                if (submitted == null) {
                  b += isMine
                    ? 'border-navy bg-navy text-white'
                    : `border-line bg-white text-ink ${locked ? 'opacity-60 cursor-default' : 'hover:border-navy cursor-pointer'}`;
                } else if (v === right) {
                  b += isMine ? 'border-green-600 bg-green-600 text-white' : 'border-green-600 text-green-700 bg-white';
                } else {
                  b += isMine ? 'border-red-500 bg-red-500 text-white' : 'border-line bg-white text-ink-muted opacity-50';
                }
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={isMine}
                    disabled={locked}
                    onClick={() => set(i, v)}
                    className={b}
                  >
                    {yesNoWord(v)}
                  </button>
                );
              })}
              {submitted != null && !ok && (
                <span className="text-[12px] font-mono text-green-700 ml-1">Answer: {yesNoWord(right)}</span>
              )}
            </div>
          </div>
        );
      })}

      {submitted == null && onSubmit && (
        <button
          type="button"
          disabled={!complete || disabled}
          onClick={() => onSubmit(draft.join(''))}
          className="w-full py-3 rounded-lg bg-teal-deep text-white font-semibold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-deep/90 transition-all"
        >
          {complete ? 'Submit answers' : `Answer all ${choices.length} statements to submit`}
        </button>
      )}

      {grade && (
        <p className={`text-[13px] font-mono ${grade.allCorrect ? 'text-green-700' : 'text-red-600'}`}>
          {grade.right} of {grade.total} statements correct · {grade.marks} of 2 marks
          {grade.marks === 1 && ' (UCAT gives 1 mark when only one statement is wrong)'}
        </p>
      )}
    </div>
  );
}
