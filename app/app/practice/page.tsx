// Subtest picker — replaces the Phase-2 placeholder.
import Link from 'next/link';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';

export const metadata = { title: 'Practice — PracXAM' };
export const dynamic = 'force-dynamic';

const SUBTESTS = [
  { slug: 'verbal-reasoning', key: 'verbal_reasoning', name: 'Verbal Reasoning', blurb: 'Read a passage, evaluate statements.' },
  { slug: 'decision-making', key: 'decision_making', name: 'Decision Making', blurb: 'Logic, syllogisms, probability.' },
  { slug: 'quantitative-reasoning', key: 'quantitative_reasoning', name: 'Quantitative Reasoning', blurb: 'Tables, charts, GCSE-level maths.' },
  { slug: 'abstract-reasoning', key: 'abstract_reasoning', name: 'Abstract Reasoning', blurb: 'Pattern recognition with shapes.' },
  { slug: 'situational-judgement', key: 'situational_judgement', name: 'Situational Judgement', blurb: 'Medical-ethics scenarios.' },
] as const;

async function getCounts() {
  const rows = await db
    .select({
      subtest: questions.subtest,
      total: sql<number>`count(*)::int`,
      free: sql<number>`count(*) filter (where ${questions.isFree})::int`,
    })
    .from(questions)
    .groupBy(questions.subtest);
  return Object.fromEntries(rows.map((r) => [r.subtest, r]));
}

export default async function PracticePage() {
  const counts = await getCounts();

  return (
    <div className="container-px py-12 max-w-4xl">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Practice</p>
      <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-2">
        Pick a subtest.
      </h1>
      <p className="text-ink-soft text-lg mb-10">Each session pulls fresh questions and grades them as you go.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {SUBTESTS.map((s) => {
          const c = counts[s.key] || { total: 0, free: 0 };
          return (
            <Link
              key={s.slug}
              href={`/app/practice/${s.slug}`}
              className="bg-surface border border-line rounded-lg p-6 hover:border-teal-soft hover:shadow-md transition-all"
            >
              <h3 className="text-[1.15rem] font-bold text-navy mb-1.5">{s.name}</h3>
              <p className="text-[14px] text-ink-soft mb-4">{s.blurb}</p>
              <div className="flex items-center justify-between text-[13px] text-ink-muted font-mono">
                <span>{c.total} questions</span>
                <span className="text-teal-deep">{c.free} free →</span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-10 text-[14px] text-ink-muted">
        Free tier includes a sample of questions per subtest. Upgrade to Pro for the full library and unlimited practice.
      </p>
    </div>
  );
}
