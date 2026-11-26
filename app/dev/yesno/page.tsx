// Dev preview: the Decision Making Yes/No control in its three states.
// Visit http://localhost:3000/dev/yesno to check layout and marking.
'use client';
import { useState } from 'react';
import YesNoStatements from '@/components/practice/YesNoStatements';

const CHOICES = [
  { label: 'A', text: 'There were more SUVs than sedans for sale.' },
  { label: 'B', text: 'The difference between the numbers of sedans and pickups for sale was half the number of hatchbacks for sale.' },
  { label: 'C', text: 'Fewer hatchbacks than pickups were for sale.' },
  { label: 'D', text: 'There are more sedans than SUVs in the showroom.' },
  { label: 'E', text: 'The dealer could put an additional type of vehicle on sale without changing the number of vehicles.' },
];
const KEY = 'NYNNN';

export default function YesNoPreview() {
  const [answer, setAnswer] = useState<string | null>(null);
  return (
    <div className="container-px py-10 max-w-3xl flex flex-col gap-10">
      <section>
        <h2 className="text-navy font-bold mb-3">Interactive</h2>
        <YesNoStatements key={answer ?? 'live'} choices={CHOICES} answerKey={KEY} submitted={answer} onSubmit={setAnswer} />
        {answer && <button className="mt-3 text-teal-deep underline text-sm" onClick={() => setAnswer(null)}>Reset</button>}
      </section>
      <section>
        <h2 className="text-navy font-bold mb-3">Submitted — one wrong (1 mark)</h2>
        <YesNoStatements choices={CHOICES} answerKey={KEY} submitted="NYNYN" />
      </section>
      <section>
        <h2 className="text-navy font-bold mb-3">Results page (compact, all correct)</h2>
        <YesNoStatements choices={CHOICES} answerKey={KEY} submitted={KEY} compact />
      </section>
    </div>
  );
}
