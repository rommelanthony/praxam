import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Dashboard — PracXAM' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isWelcome = params.welcome === '1';

  return (
    <div className="container-px py-12">
      {isWelcome && (
        <div className="rounded-md p-4 mb-8" style={{ background: 'var(--teal-soft)', color: 'var(--teal-deep)', border: '1px solid var(--teal)' }}>
          <strong>Welcome to PracXAM.</strong> Check your inbox for a confirmation email if Supabase email confirmation is on.
        </div>
      )}

      <div className="mb-10">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Dashboard</p>
        <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-2">
          Hi{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
        </h1>
        <p className="text-ink-soft text-lg">Practice mode is coming next. Today, the basics work.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Plan</div>
          <div className="text-[1.6rem] font-extrabold text-navy">Starter</div>
          <p className="text-[14px] text-ink-soft mt-2">50 questions free. Upgrade to Pro for the full library.</p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Questions answered</div>
          <div className="text-[1.6rem] font-extrabold text-navy font-mono">0</div>
          <p className="text-[14px] text-ink-soft mt-2">Start your first practice session below.</p>
        </div>
        <div className="bg-surface border border-line rounded-lg p-6">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Streak</div>
          <div className="text-[1.6rem] font-extrabold text-navy font-mono">0 days</div>
          <p className="text-[14px] text-ink-soft mt-2">Practice today to start one.</p>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-8">
        <h2 className="text-xl font-bold text-navy mb-2">Coming next</h2>
        <p className="text-ink-soft mb-6">The practice engine is wired up in the next phase. For now, you&apos;re signed in and the auth layer works — sign-up, sign-in, sign-out, and the protected route gate.</p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/app/practice" className="btn btn-teal">Practice (placeholder)</Link>
          <Link href="/" className="btn btn-ghost">Back to landing</Link>
        </div>
      </div>
    </div>
  );
}
