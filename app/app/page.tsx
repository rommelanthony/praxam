import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/practice';
import { db, schema } from '@/db';
import { sql, eq, gte } from 'drizzle-orm';

export const metadata = { title: 'Dashboard — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getOrCreateProfile(user.id, user.email!);
  const isWelcome = params.welcome === '1';

  // Recent stats: questions in the last 7 days, accuracy
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const [recent] = await db
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${schema.answers.isCorrect})::int`,
    })
    .from(schema.answers)
    .where(eq(schema.answers.userId, user.id));
  const recentTotal = recent?.total ?? 0;
  const recentCorrect = recent?.correct ?? 0;
  const accuracy = recentTotal ? Math.round((recentCorrect / recentTotal) * 100) : 0;

  return (
    <div className="container-px py-12">
      {isWelcome && (
        <div className="rounded-md p-4 mb-8" style={{ background: 'var(--teal-soft)', color: 'var(--teal-deep)', border: '1px solid var(--teal)' }}>
          <strong>Welcome to PracXAM.</strong> Start your first practice session below.
        </div>
      )}

      <div className="mb-10">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Dashboard</p>
        <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-2">
          Hi{user.email ? `, ${user.email.split('@')[0]}` : ''}.
        </h1>
        <p className="text-ink-soft text-lg">
          {profile.questionsAnsweredTotal === 0
            ? 'Ready when you are. Pick a subtest below to start.'
            : `You've answered ${profile.questionsAnsweredTotal} questions so far. Keep going.`}
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Plan</div>
          <div className="text-[1.6rem] font-extrabold text-navy capitalize">{profile.plan}</div>
          {profile.plan === 'free' && (
            <p className="text-[14px] text-ink-soft mt-2">Limited free questions. Upgrade for full access.</p>
          )}
        </div>
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Questions answered</div>
          <div className="text-[1.6rem] font-extrabold text-navy font-mono">{profile.questionsAnsweredTotal}</div>
          <p className="text-[14px] text-ink-soft mt-2">All time.</p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Accuracy</div>
          <div className="text-[1.6rem] font-extrabold text-navy font-mono">{accuracy}%</div>
          <p className="text-[14px] text-ink-soft mt-2">{recentTotal} answered total.</p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Streak</div>
          <div className="text-[1.6rem] font-extrabold text-navy font-mono">{profile.streakDays} {profile.streakDays === 1 ? 'day' : 'days'}</div>
          <p className="text-[14px] text-ink-soft mt-2">{profile.streakDays === 0 ? 'Practice today to start.' : 'Keep it alive — practise every day.'}</p>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-8 mb-8">
        <h2 className="text-xl font-bold text-navy mb-2">Practice now</h2>
        <p className="text-ink-soft mb-6">Pick a subtest. Each session pulls fresh questions and grades them as you go.</p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/app/practice" className="btn btn-teal">Choose a subtest →</Link>
          <Link href="/" className="btn btn-ghost">Back to landing</Link>
        </div>
      </div>
    </div>
  );
}
