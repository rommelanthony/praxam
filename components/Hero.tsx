import Link from 'next/link';

export default function Hero() {
  return (
    <header className="hero">
      <div className="container-px grid gap-12 lg:gap-16 items-center" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
        <div>
          <span className="eyebrow mb-6">
            <span className="dot"></span> UCAT 2026 — applications open
          </span>
          <h1 className="hero-title">
            Practice smart.
            <br />
            <span className="accent">Crush exams.</span>
          </h1>
          <p className="hero-sub">
            PracXAM is the UCAT prep platform built for how you actually study — bite-sized,
            mobile-first, and honest about where you need to improve. Built by people who
            have already done it.
          </p>
          <div className="flex gap-3.5 flex-wrap items-center">
            <Link href="#pricing" className="btn btn-teal btn-large">Start practising free →</Link>
            <Link href="#sample" className="btn btn-ghost btn-large">See a sample question</Link>
          </div>
          <div className="mt-7 flex items-center gap-3.5 text-[13.5px] text-ink-muted">
            <div className="flex">
              <span className="w-7 h-7 rounded-full border-2 border-paper bg-violet inline-block" />
              <span className="w-7 h-7 rounded-full border-2 border-paper inline-block -ml-2" style={{ background: 'linear-gradient(135deg, #6B4FA8, #0F2D4F)' }} />
              <span className="w-7 h-7 rounded-full border-2 border-paper bg-navy inline-block -ml-2" />
              <span className="w-7 h-7 rounded-full border-2 border-paper inline-block -ml-2" style={{ background: 'linear-gradient(135deg, #0F2D4F, #1B9D9D)' }} />
            </div>
            <span>Joining 2,400+ medics-in-training this cycle</span>
          </div>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="flex gap-2 text-[12px] font-semibold uppercase tracking-wider mb-4 text-ink-muted">
            <span className="px-2.5 py-1 rounded-pill" style={{ background: 'var(--teal-soft)', color: 'var(--teal-deep)' }}>Verbal Reasoning</span>
            <span className="px-2.5 py-1 rounded-pill font-mono" style={{ background: 'var(--surface-cool)', color: 'var(--ink-soft)' }}>00:23</span>
          </div>
          <div className="demo-passage mb-5">
            “…antioxidant supplements do not reduce the risk of developing cancer. Researchers gave vitamins C, E,
            betacarotene or placebos to 7,627 women at high risk of cardiovascular disease…”
          </div>
          <div className="font-semibold text-[16.5px] leading-snug mb-5 text-navy">
            Vitamin C and E supplements do not prevent cancer in either men or women.
          </div>
          <div className="demo-choice mb-2"><span className="letter">A</span> True</div>
          <div className="demo-choice mb-2"><span className="letter">B</span> False</div>
          <div className="demo-choice correct"><span className="letter">C</span> Can&apos;t Tell</div>
        </div>
      </div>
    </header>
  );
}
