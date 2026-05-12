// Placeholder stub. Replaced in step E of PR 1 with the real SpeedReadingApp
// (auth-gated, profile + baseline lookup, initial passage fetch).
export const metadata = { title: 'Speed Reading Tutor — PracXAM' };

export default function SpeedReadingPlaceholder() {
  return (
    <div className="container-px py-12 max-w-2xl">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Training</p>
      <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-2">
        Speed Reading Tutor
      </h1>
      <p className="text-ink-soft text-lg">
        Coming soon. This module trains UCAT Verbal Reasoning speed, comprehension, and
        scan-and-locate technique through a sequence of timed drills.
      </p>
    </div>
  );
}
