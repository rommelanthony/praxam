'use client';
import { useState } from 'react';

const correctLetter = 'A';
const choices = [
  { letter: 'A', text: 'True' },
  { letter: 'B', text: 'False' },
  { letter: 'C', text: "Can't Tell" },
];

export default function SampleQuestion() {
  const [picked, setPicked] = useState<string | null>(null);

  function getClass(letter: string) {
    if (picked === null) return 'demo-choice';
    if (letter === correctLetter) return 'demo-choice locked correct';
    if (letter === picked) return 'demo-choice locked incorrect';
    return 'demo-choice locked';
  }

  return (
    <div className="demo-card">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-5">
        <span className="px-2.5 py-1 rounded-pill" style={{ background: 'var(--teal-soft)', color: 'var(--teal-deep)' }}>
          Verbal Reasoning
        </span>
        <span className="font-mono text-ink-soft">28s avg</span>
      </div>
      <div className="demo-passage mb-5">
        According to the NHS, type 2 diabetes, which is often associated with obesity, affects about 2.3 million people
        in the UK, with at least 500,000 more who are not aware that they have the condition. Research has linked type 2
        diabetes and sleeping disorders, suggesting there is a connection between diabetes and the way the body responds
        to the 24-hour cycle of light and dark.
      </div>
      <div className="font-semibold text-[17px] mb-5 leading-snug text-navy">
        There are about 2.8 million people in the UK affected by type 2 diabetes.
      </div>
      <div className="grid gap-2.5">
        {choices.map((c) => (
          <button
            key={c.letter}
            type="button"
            className={getClass(c.letter)}
            onClick={() => picked === null && setPicked(c.letter)}
            disabled={picked !== null}
          >
            <span className="letter">{c.letter}</span>
            {c.text}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="demo-explanation" style={{ animation: 'fadeUp 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <strong>Correct answer: A — True</strong>
          The passage states 2.3 million have type 2 diabetes plus at least 500,000 more who are unaware. 2.3M + 0.5M
          = 2.8M, so the statement is supported by the passage.
        </div>
      )}
    </div>
  );
}
