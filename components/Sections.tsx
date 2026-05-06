// Mid-page sections: Stats, Features, Sample question, Pricing, FAQ, CTA, Footer.
// Bundled into one file to keep the file count down — split as you grow.
import Link from 'next/link';
import Logo from './Logo';
import SampleQuestion from './SampleQuestion';

export function Stats() {
  return (
    <div className="border-y border-line bg-surface-cool">
      <div className="container-px grid grid-cols-2 sm:grid-cols-4 py-9">
        {[
          { num: '2,500+', label: 'Practice questions', accent: true },
          { num: '5', label: 'UCAT subtests covered' },
          { num: '15+', label: 'Full mock exams' },
          { num: '£0', label: 'To get started', accent: true },
        ].map((s, i) => (
          <div key={i} className="text-center px-3 border-r border-dashed border-line-strong last:border-r-0 sm:[&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
            <div className="font-extrabold tracking-tight text-navy" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}>
              <span className={s.accent ? 'text-teal' : ''}>{s.num}</span>
            </div>
            <div className="text-[13px] text-ink-soft mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const featureIcons = [
  <svg key="1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  <svg key="2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/></svg>,
  <svg key="3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>,
];

export function Features() {
  const features = [
    {
      title: 'Real questions, decoded',
      body: 'Every question comes with a full worked explanation written by people who scored in the top decile. We teach the pattern — not just the answer.',
    },
    {
      title: 'Track your weak spots',
      body: 'Honest analytics by subtest, sub-topic and question type. We show you what to drill next — not just an overall percentage that hides everything.',
    },
    {
      title: 'Built for the train',
      body: 'Mobile-first from day one. Five questions on the bus is more useful than a two-hour session you keep putting off. We make it that easy.',
    },
  ];
  const iconBgs = ['bg-teal-soft text-teal-deep', 'bg-violet-soft text-violet', 'bg-navy-soft text-navy'];
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container-px">
        <div className="max-w-3xl mb-14">
          <div className="section-eyebrow">What&apos;s different</div>
          <h2 className="section-title">Built for how you actually study</h2>
          <p className="section-sub">
            The UCAT isn&apos;t won by grinding through 10,000 questions. It&apos;s won by spotting your weaknesses early
            and drilling them. PraxAM helps you do exactly that.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="feature">
              <div className={`feature-icon ${iconBgs[i]}`}>{featureIcons[i]}</div>
              <h3 className="text-[1.2rem] font-bold tracking-tight mb-2.5 text-navy">{f.title}</h3>
              <p className="text-[15px] text-ink-soft leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SampleSection() {
  return (
    <section id="sample" className="py-20 md:py-28 border-y border-line bg-surface-cool">
      <div className="container-px">
        <div className="max-w-3xl mb-14">
          <div className="section-eyebrow">Try it</div>
          <h2 className="section-title">A real Verbal Reasoning question.</h2>
          <p className="section-sub">Pick an answer. We&apos;ll show you the reasoning — not just whether you got it right.</p>
        </div>
        <div className="rounded-xl p-8 md:p-16 border border-line" style={{ background: 'linear-gradient(180deg, var(--paper) 0%, var(--surface-cool) 100%)' }}>
          <SampleQuestion />
        </div>
      </div>
    </section>
  );
}

const tierCheck = (color: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container-px">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="section-eyebrow">Pricing</div>
          <h2 className="section-title">Start free. Upgrade when you mean it.</h2>
          <p className="section-sub">No bait-and-switch. The free tier is genuinely useful — try it for a week before paying anything.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          <div className="tier">
            <div className="text-[14px] font-semibold uppercase tracking-wider text-ink-muted mb-3.5">Starter</div>
            <div className="text-[2.6rem] font-extrabold tracking-tight leading-none text-navy">£0<span className="text-[0.95rem] font-medium text-ink-muted"> / forever</span></div>
            <p className="text-[14.5px] text-ink-soft mt-3 mb-7 min-h-[40px]">Enough to know if PraxAM clicks for you.</p>
            <ul className="flex-grow mb-7 list-none">
              {['50 practice questions across all subtests', 'Worked explanations on every question', 'Basic progress tracking', 'One free mock exam'].map((t) => (
                <li key={t} className="flex gap-2.5 items-start py-2 text-[14.5px] text-ink-soft">
                  <span className="flex-shrink-0 mt-0.5">{tierCheck('#1B9D9D')}</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/sign-up" className="w-full justify-center inline-flex items-center px-4 py-3.5 rounded-md font-semibold text-[15px] bg-surface-cool text-navy hover:bg-teal hover:text-white transition-colors">Start free</Link>
          </div>
          <div className="tier featured">
            <div className="absolute -top-3 right-6 bg-teal text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-pill">Most popular</div>
            <div className="text-[14px] font-semibold uppercase tracking-wider text-white/70 mb-3.5">Pro</div>
            <div className="text-[2.6rem] font-extrabold tracking-tight leading-none text-white">£9<span className="text-[0.95rem] font-medium text-white/65"> / month</span></div>
            <p className="text-[14.5px] text-white/80 mt-3 mb-7 min-h-[40px]">Everything you need to get the score you actually want.</p>
            <ul className="flex-grow mb-7 list-none">
              {['Full library — 2,500+ questions across all 5 subtests', '15+ full-length mock exams under exam conditions', 'Per-topic analytics with weak-spot drills', 'Strategy guides for each subtest', 'Cancel anytime — no minimum term'].map((t) => (
                <li key={t} className="flex gap-2.5 items-start py-2 text-[14.5px] text-white/95">
                  <span className="flex-shrink-0 mt-0.5">{tierCheck('white')}</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/sign-up?plan=pro" className="w-full justify-center inline-flex items-center px-4 py-3.5 rounded-md font-semibold text-[15px] bg-white text-navy hover:bg-teal hover:text-white transition-colors">Start 7-day free trial</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: 'When should I start UCAT prep?', a: 'Most successful candidates start 8-12 weeks before their test date. You don’t need 6 months — you need consistent, focused practice. PraxAM is designed for short daily sessions on your phone, which works far better than weekend cramming.' },
  { q: 'How is this different from Medify or MedEntry?', a: 'Two things. First, our explanations actually teach you the underlying pattern, not just confirm the answer. Second, our analytics are honest — we tell you exactly which sub-topics you’re weak in, not a single useless overall score. The library size is comparable; the difference is what you do with it.' },
  { q: 'Can I cancel anytime?', a: 'Yes. You can cancel from your account settings in two clicks, and you’ll keep Pro access until the end of your billing month. We don’t lock you into annual plans or anything that requires a phone call to cancel.' },
  { q: 'Do you cover Situational Judgement?', a: 'Yes — SJT is fully covered with 200+ scenarios and detailed reasoning for each appropriateness rating. SJT is the most under-prepared subtest, which makes it the easiest place to gain marks.' },
  { q: 'Can I use this on my phone?', a: 'Yes. PraxAM is mobile-first, not "responsive as an afterthought" — you’ll do most of your practice on the bus or between lessons.' },
  { q: 'What if my test is in 2 weeks?', a: 'Use it. Our crash-course mode prioritises the highest-yield questions and the topics where most candidates lose the most marks. It won’t fix months of avoidance — but it will materially improve your score in 14 days.' },
];

export function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="container-px">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="section-eyebrow">Questions</div>
          <h2 className="section-title">Things people ask before signing up.</h2>
        </div>
        <div className="max-w-3xl mx-auto">
          {faqs.map((f, i) => (
            <details key={i} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="py-12 md:py-16">
      <div className="container-px">
        <div className="cta-band">
          <h2 className="font-bold leading-tight tracking-tight mb-4 max-w-2xl" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
            The UCAT is closer than you think. Get a head start tonight.
          </h2>
          <p className="text-white/80 text-[1.1rem] max-w-xl mb-7">
            Free to start. No card required. Five minutes from now, you&apos;ll have answered your first three
            questions and seen exactly where you stand.
          </p>
          <Link href="/sign-up" className="btn btn-large bg-white text-navy hover:bg-teal hover:text-white">Start practising free →</Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-12 border-t border-line mt-20">
      <div className="container-px flex justify-between items-center flex-wrap gap-4">
        <Logo />
        <div className="flex gap-6 text-[14px] text-ink-soft">
          <Link href="/about" className="hover:text-navy">About</Link>
          <Link href="#pricing" className="hover:text-navy">Pricing</Link>
          <Link href="/privacy" className="hover:text-navy">Privacy</Link>
          <Link href="/terms" className="hover:text-navy">Terms</Link>
          <a href="mailto:hello@praxam.com" className="hover:text-navy">Contact</a>
        </div>
        <div className="text-[13px] text-ink-muted">© 2026 PraxAM Ltd. Practice Smart. Crush Exams.</div>
      </div>
    </footer>
  );
}
