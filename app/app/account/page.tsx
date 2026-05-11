import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/practice';
import UcatDetailsForm from './UcatDetailsForm';

export const metadata = { title: 'Account — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getOrCreateProfile(user.id, user.email!);
  const isPro = profile.plan === 'pro';

  return (
    <div className="container-px py-12 max-w-4xl">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Account</p>
      <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-2">
        Your account.
      </h1>
      <p className="text-ink-soft text-lg mb-10">Manage your profile, UCAT details, and subscription.</p>

      <section className="bg-surface border border-line rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-navy mb-4">Account</h2>
        <dl className="grid sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Email</dt>
            <dd className="text-navy">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Plan</dt>
            <dd>
              {isPro ? (
                <span
                  className="inline-block text-[13px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md"
                  style={{ color: 'var(--teal-deep)', background: 'var(--teal-soft)' }}
                >
                  Pro
                </span>
              ) : (
                <span className="inline-block text-[13px] font-semibold uppercase tracking-wider text-ink-soft">
                  Free
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="bg-surface border border-line rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-navy mb-1">UCAT Details</h2>
        <p className="text-[14px] text-ink-soft mb-5">Where are you sitting, and when?</p>
        <UcatDetailsForm
          initialRegion={profile.ucatRegion ?? null}
          initialTestDate={profile.ucatTestDate ?? null}
        />
      </section>

      <section className="bg-surface border border-line rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-navy mb-4">Subscription</h2>
        {isPro ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled
              className="btn btn-ghost disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Manage subscription
            </button>
            <span className="text-[14px] text-ink-soft">Stripe billing coming soon.</span>
          </div>
        ) : (
          <p className="text-ink-soft">You're on the free plan. Upgrade flow coming soon.</p>
        )}
      </section>

      <section className="bg-surface border border-line rounded-lg p-6">
        <h2 className="text-xl font-bold text-navy mb-2">Refer a Friend</h2>
        <p className="text-ink-soft">
          Coming soon — 1 month free for both of you when your friend signs up for 4 months.
        </p>
      </section>
    </div>
  );
}
