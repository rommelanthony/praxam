// MMI practice home: choose edition and format, browse stations, see past attempts.
import Link from 'next/link';
import { currentUser, getRecentAttempts } from '@/lib/mmi/server';
import { EDITIONS, PRESETS, getBank, isEdition, type Edition } from '@/lib/mmi/content';
import StationBrowser from './StationBrowser';

export const metadata = { title: 'MMI Practice — PracXAM' };
export const dynamic = 'force-dynamic';

export default async function InterviewHome({ searchParams }: { searchParams: Promise<{ edition?: string }> }) {
  const params = await searchParams;
  const edition: Edition = isEdition(params.edition) ? params.edition : 'nz';
  const { user } = await currentUser();
  if (!user) return null;

  const bank = getBank(edition);
  const attempts = await getRecentAttempts(user.id, 8);
  const byDomain = bank.domains
    .map((d) => ({ domain: d, stations: bank.stations.filter((s) => s.domain === d).map((s) => ({ id: s.id, title: s.title, question: s.question, attributes: s.attributes.map((k) => bank.attributes[k].label) })) }))
    .filter((g) => g.stations.length);

  return (
    <div className="container-px py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">Interview practice</p>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy mb-2">Multiple Mini Interviews</h1>
          <p className="text-ink-soft text-lg max-w-[62ch]">
            Practise the recorded MMI the way it really runs: the scenario is read aloud, you get 30 seconds to prepare, then your answer is recorded with no second takes. You get feedback against the eight attributes interviewers assess.
          </p>
        </div>
        <div className="inline-flex rounded-pill border border-line bg-surface p-1" role="tablist" aria-label="Edition">
          {(Object.keys(EDITIONS) as Edition[]).map((e) => (
            <Link
              key={e}
              href={`/app/interview?edition=${e}`}
              role="tab"
              aria-selected={e === edition}
              className={`px-4 py-2 rounded-pill text-[14px] font-semibold ${e === edition ? 'bg-navy text-white' : 'text-ink-soft hover:text-navy'}`}
            >
              {EDITIONS[e].label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {PRESETS[edition].map((p, i) => (
          <div key={p.key} className={`rounded-lg p-6 border ${i === 0 ? 'border-navy bg-navy text-white' : 'border-line bg-surface'}`}>
            <div className={`text-[13px] font-semibold uppercase tracking-wider mb-1 ${i === 0 ? 'text-teal-soft' : 'text-ink-muted'}`}>{i === 0 ? 'Full mock' : 'Quick mock'}</div>
            <div className="text-[1.4rem] font-extrabold mb-1">{p.label}</div>
            <p className={`mb-5 ${i === 0 ? 'text-white/80' : 'text-ink-soft'}`}>{p.description}</p>
            <Link href={`/app/interview/session?edition=${edition}&preset=${p.key}`} className={`btn ${i === 0 ? 'btn-teal' : 'btn-navy'}`}>
              Start {p.label.toLowerCase()}
            </Link>
          </div>
        ))}
      </div>

      {edition === 'nz' && (
        <div className="rounded-lg border border-line bg-surface-cool p-5 mb-10 text-[15px] text-ink-soft">
          <strong className="text-navy">How the Auckland MMI works.</strong> Seven stations, one for each domain: Equity, Moral/ethical, Career choice, Healthcare issue, Personal insight, Personal experience and Hauora Māori. Each scenario is read aloud on video, then you have 30 seconds to prepare (paper notes allowed) and 3 minutes to record your answer. There is a 10-second break between stations and no re-recording. Three of eight attributes are assessed at each station, by a different human reviewer each time. You are marked on how you reason, not on which view you hold.
        </div>
      )}

      {attempts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[1.3rem] font-bold text-navy mb-3">Your recent attempts</h2>
          <ul className="divide-y divide-line border border-line rounded-lg bg-surface">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="text-ink-soft">
                  {new Date(a.startedAt).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })} · {a.kind === 'mock' ? 'Full mock' : 'Single station'} · {EDITIONS[a.edition].short} · {a.stationIds.length} station{a.stationIds.length === 1 ? '' : 's'}
                  {!a.completedAt && ' · not finished'}
                </span>
                <Link href={`/app/interview/results/${a.id}`} className="btn btn-ghost">View</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-[1.3rem] font-bold text-navy mb-1">Practise one station</h2>
        <p className="text-ink-soft mb-4">Original practice scenarios written for PracXAM, not real interview questions. Single stations let you try again as often as you like.</p>
        <StationBrowser edition={edition} groups={byDomain} />
      </section>
    </div>
  );
}
