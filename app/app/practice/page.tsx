import Link from 'next/link';

export const metadata = { title: 'Practice — PraxAM' };

export default function PracticePlaceholder() {
  return (
    <div className="container-px py-16 max-w-2xl">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Coming soon</p>
      <h1 className="text-[2rem] font-bold text-navy mb-3">Practice mode is wiring up.</h1>
      <p className="text-ink-soft mb-8">
        In the next phase the question bank gets seeded from our extracted JSON into Postgres,
        and this page becomes the live practice engine — fetching questions, recording answers, and tracking your weak spots.
        For now, it&apos;s a placeholder so you can see the protected-route flow works.
      </p>
      <Link href="/app" className="btn btn-ghost">← Back to dashboard</Link>
    </div>
  );
}
