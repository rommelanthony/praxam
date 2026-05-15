// Subtest picker — renders the five UCAT subtests as tiles. Tiles show
// per-user progress for free users (X/10 used) and switch to a locked
// variant (LockedTile) once the user has used all 10 free questions in
// that subtest. Pro users see the original "{total} questions / {free} free"
// footer with no progress indicator.
import Link from 'next/link';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/practice';
import {
  FREE_LIMIT_PER_SUBTEST,
  getAttemptCountsByFreeSubtest,
} from '@/lib/questions/gating';
import { LockedTile } from '@/components/practice/LockedTile';

export const metadata = { title: 'Practice — PracXAM' };
export const dynamic = 'force-dynamic';

const SUBTESTS = [
  { slug: 'verbal-reasoning',       key: 'verbal_reasoning',       name: 'Verbal Reasoning',       blurb: 'Read a passage, evaluate statements.' },
  { slug: 'decision-making',        key: 'decision_making',        name: 'Decision Making',        blurb: 'Logic, syllogisms, probability.' },
  { slug: 'quantitative-reasoning', key: 'quantitative_reasoning', name: 'Quantitative Reasoning', blurb: 'Tables, charts, GCSE-level maths.' },
  { slug: 'abstract-reasoning',     key: 'abstract_reasoning',     name: 'Abstract Reasoning',     blurb: 'Pattern recognition with shapes.' },
  { slug: 'situational-judgement',  key: 'situational_judgement',  name: 'Situational Judgement',  blurb: 'Medical-ethics scenarios.' },
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // middleware should redirect; defensive

  const profile = await getOrCreateProfile(user.id, user.email!);
  const plan = profile.plan as 'free' | 'pro';
  const counts = await getCounts();
  // Only fetch per-subtest attempt counts for free users — Pro doesn't have
  // a gate, so no need to spend the query.
  const attempts = plan === 'free' ? await getAttemptCountsByFreeSubtest(user.id) : {};

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
          const attempted = attempts[s.key] ?? 0;
          const isLocked = plan === 'free' && attempted >= FREE_LIMIT_PER_SUBTEST;

          if (isLocked) {
            return (
              <LockedTile
                key={s.slug}
                name={s.name}
                blurb={s.blurb}
                subtestKey={s.key}
                freeLimit={FREE_LIMIT_PER_SUBTEST}
              />
            );
          }

          return (
            <Link
              key={s.slug}
              href={`/app/practice/${s.slug}`}
              className="bg-surface border border-line rounded-lg p-6 hover:border-teal-soft hover:shadow-md transition-all"
            >
              <h3 className="text-[1.15rem] font-bold text-navy mb-1.5">{s.name}</h3>
              <p className="text-[14px] text-ink-soft mb-4">{s.blurb}</p>
              <div className="flex items-center justify-between text-[13px] font-mono tabular-nums">
                {plan === 'free' ? (
                  <>
                    <span className="text-ink-muted">{attempted}/{FREE_LIMIT_PER_SUBTEST} free used</span>
                    <span className="text-teal-deep">Practice →</span>
                  </>
                ) : (
                  <>
                    <span className="text-ink-muted">{c.total} questions</span>
                    <span className="text-teal-deep">Practice →</span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-10 text-[14px] text-ink-muted">
        {plan === 'free'
          ? `Free tier: ${FREE_LIMIT_PER_SUBTEST} questions per subtest. Upgrade to Pro for the full library and unlimited practice.`
          : 'Pro plan: full library, unlimited practice.'}
      </p>
    </div>
  );
}
