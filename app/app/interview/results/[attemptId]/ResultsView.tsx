'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { MmiFeedback } from '@/db/schema';

export type ResultItem = {
  id: string;
  position: number;
  stationId: string;
  title: string;
  domain: string;
  scenario: string;
  question: string;
  attributes: Array<{ key: string; label: string; levels: { '1': string; '3': string; '5': string } }>;
  mediaUrl: string | null;
  mediaKind: 'video' | 'audio' | null;
  durationS: number;
  allowedS: number;
  wordCount: number;
  transcript: string;
  notes: string;
  answerMode: 'speak' | 'type';
  aiStatus: 'pending' | 'done' | 'error' | 'skipped';
  aiFeedback: MmiFeedback | null;
  createdAt: string;
  selfScores: Record<string, number>;
};

type Props = {
  attemptId: string;
  edition: 'nz' | 'au';
  kind: 'mock' | 'single';
  expected: number;
  startedAt: string;
  attributeLabels: Record<string, string>;
  items: ResultItem[];
};

const BAND_STYLE: Record<string, { bg: string; fg: string }> = {
  Strong: { bg: 'var(--teal-soft)', fg: 'var(--teal-deep)' },
  Competent: { bg: 'var(--navy-soft)', fg: 'var(--navy)' },
  Developing: { bg: 'hsl(34, 62%, 93%)', fg: 'hsl(32, 75%, 32%)' },
  Limited: { bg: 'hsl(34, 62%, 93%)', fg: 'hsl(32, 75%, 32%)' },
};

const avg = (a: number[]) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null);

export default function ResultsView({ attemptId, edition, kind, expected, startedAt, attributeLabels, items: initial }: Props) {
  const [items, setItems] = useState(initial);
  const kicked = useRef(false);

  // Feedback is generated server-side after each station. Re-trigger any that
  // were left pending (e.g. tab closed early), then poll until done.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const hasPending = items.some((i) => i.aiStatus === 'pending');
  useEffect(() => {
    if (!hasPending) return;
    if (!kicked.current) {
      kicked.current = true;
      for (const p of itemsRef.current.filter((i) => i.aiStatus === 'pending')) {
        if (Date.now() - new Date(p.createdAt).getTime() > 45_000) {
          void fetch('/api/mmi/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responseId: p.id }) }).catch(() => {});
        }
      }
    }
    const started = Date.now();
    const id = window.setInterval(async () => {
      if (Date.now() - started > 4 * 60_000) return window.clearInterval(id);
      const res = await fetch(`/api/mmi/attempts/${attemptId}`).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { responses: Array<{ id: string; aiStatus: ResultItem['aiStatus']; aiFeedback: MmiFeedback | null }> };
      setItems((cur) => cur.map((it) => {
        const u = data.responses.find((r) => r.id === it.id);
        return u ? { ...it, aiStatus: u.aiStatus, aiFeedback: u.aiFeedback } : it;
      }));
    }, 4000);
    return () => window.clearInterval(id);
  }, [attemptId, hasPending]);

  const setSelf = (id: string, key: string, n: number) => {
    const target = itemsRef.current.find((it) => it.id === id);
    if (!target) return;
    const selfScores = { ...target.selfScores, [key]: n };
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, selfScores } : it)));
    void fetch('/api/mmi/marks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responseId: id, scores: selfScores }) }).catch(() => {});
  };

  const keys = Object.keys(attributeLabels);
  const summary = keys.map((k) => {
    const ai = items.filter((i) => i.aiStatus === 'done' && i.aiFeedback?.scores[k] != null).map((i) => i.aiFeedback!.scores[k]);
    const me = items.filter((i) => i.selfScores[k] != null).map((i) => i.selfScores[k]);
    return { k, label: attributeLabels[k], ai: avg(ai), aiN: ai.length, me: avg(me), meN: me.length };
  });
  const missing = expected - items.length;

  return (
    <div className="container-px py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">{kind === 'mock' ? 'Full mock' : 'Single station'} · {new Date(startedAt).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-tight text-navy">Your MMI feedback</h1>
          <p className="text-ink-soft max-w-[64ch] mt-2">Each station is scored 1–5 on the three attributes it tests. This is AI practice feedback, not a predicted interview score: real MMI reviewers are people. Watch your recordings and mark yourself too.</p>
        </div>
        <Link href={`/app/interview?edition=${edition}`} className="btn btn-navy">Back to interview practice</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {summary.map((s) => (
          <div key={s.k} className="rounded-md border border-line bg-surface p-4">
            <div className="text-[13px] text-ink-muted">{s.label}</div>
            <div className="text-[1.8rem] font-extrabold text-navy font-mono">{s.ai ?? s.me ?? '–'}</div>
            <div className="text-[12.5px] text-ink-muted">{s.ai ? `AI · ${s.aiN} station${s.aiN === 1 ? '' : 's'}${s.me ? ` · you ${s.me}` : ''}` : s.me ? `your marks · ${s.meN}` : 'not assessed'}</div>
          </div>
        ))}
      </div>

      {missing > 0 && <p className="rounded-md p-3 mb-6 bg-surface-cool text-ink-soft">{missing} station{missing === 1 ? ' was' : 's were'} not answered in this attempt.</p>}

      <div className="space-y-6">
        {items.map((it) => (
          <article key={it.id} className="rounded-lg border border-line bg-surface p-[clamp(16px,2.5vw,28px)]">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[13px] text-ink-muted">Station {it.position + 1} · {it.domain} · {it.durationS}s of {it.allowedS}s · {it.wordCount} words</div>
                <h2 className="text-[1.25rem] font-bold text-navy">{it.title}</h2>
                <p className="text-[14.5px] text-ink-soft mt-1">{it.question}</p>
              </div>
              {it.aiStatus === 'done' && it.aiFeedback && (
                <span className="px-3 py-1 rounded-pill text-[13px] font-bold" style={{ background: BAND_STYLE[it.aiFeedback.band]?.bg, color: BAND_STYLE[it.aiFeedback.band]?.fg }}>{it.aiFeedback.band}</span>
              )}
            </div>

            {it.mediaUrl ? (
              it.mediaKind === 'video' ? (
                <video src={it.mediaUrl} controls playsInline preload="metadata" className="w-full max-w-[560px] rounded-md bg-black mb-4" />
              ) : (
                <audio src={it.mediaUrl} controls preload="metadata" className="w-full max-w-[560px] mb-4" />
              )
            ) : (
              <p className="text-[14px] text-ink-muted mb-4">No recording for this station.</p>
            )}

            <Feedback item={it} />

            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer font-semibold text-navy py-1">Mark it yourself{it.attributes.every((a) => it.selfScores[a.key]) ? ' (done)' : ''}</summary>
              <p className="text-[14px] text-ink-soft my-2">Watch your answer, then choose the level that fits best. Your marks are saved as you go.</p>
              <div className="space-y-3">
                {it.attributes.map((a) => (
                  <div key={a.key} className="rounded-md border border-line p-3">
                    <div className="font-semibold text-navy">{a.label}</div>
                    <div className="text-[13px] text-ink-muted my-1 space-y-0.5">
                      <div>1: {a.levels['1']}</div>
                      <div>3: {a.levels['3']}</div>
                      <div>5: {a.levels['5']}</div>
                    </div>
                    <div className="flex gap-2 mt-2" role="radiogroup" aria-label={`${a.label} mark`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          role="radio"
                          aria-checked={it.selfScores[a.key] === n}
                          onClick={() => setSelf(it.id, a.key, n)}
                          className={`w-11 h-11 rounded-md border-2 font-bold ${it.selfScores[a.key] === n ? 'bg-navy border-navy text-white' : 'border-line text-navy hover:border-teal'}`}
                        >
                          {n}
                        </button>
                      ))}
                      {it.aiFeedback?.scores[a.key] != null && it.aiStatus === 'done' && <span className="self-center text-[13px] text-ink-muted ml-2">AI: {it.aiFeedback.scores[a.key]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <details className="mt-3 border-t border-line pt-3">
              <summary className="cursor-pointer font-semibold text-navy py-1">Your answer{it.answerMode === 'speak' ? ' (transcript)' : ''}</summary>
              <p className="text-ink-soft mt-2 whitespace-pre-wrap">{it.transcript || 'No transcript captured.'}</p>
              {it.notes && <p className="text-[14px] text-ink-muted mt-2">Notes: {it.notes}</p>}
            </details>

            <div className="mt-4">
              <Link href={`/app/interview/session?edition=${edition}&station=${encodeURIComponent(it.stationId)}`} className="btn btn-ghost">Try this station again</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Feedback({ item }: { item: ResultItem }) {
  const f = item.aiFeedback;
  if (item.aiStatus === 'pending') {
    return <p className="rounded-md p-3 bg-surface-cool text-ink-soft text-[14.5px]">Writing your feedback… this usually takes under a minute.</p>;
  }
  if (item.aiStatus === 'skipped') {
    return <p className="rounded-md p-3 bg-surface-cool text-ink-soft text-[14.5px]">There wasn&apos;t enough of a transcript to mark automatically. Watch your recording and mark yourself below.</p>;
  }
  if (item.aiStatus === 'error' || !f) {
    return <p className="rounded-md p-3 text-[14.5px]" style={{ background: 'var(--violet-soft)', color: 'var(--violet)' }}>Feedback could not be generated for this station. You can still mark yourself below.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-ink">{f.summary}</p>
      <div className="space-y-2 max-w-[560px]">
        {item.attributes.map((a) => (
          <div key={a.key} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-[14px]">
            <span className="text-ink-soft">{a.label}</span>
            <div className="h-2 rounded-pill bg-surface-cool overflow-hidden"><div className="h-full bg-navy" style={{ width: `${(f.scores[a.key] ?? 0) * 20}%` }} /></div>
            <span className="text-right font-mono">{f.scores[a.key]}/5</span>
          </div>
        ))}
      </div>
      {f.strengths.length > 0 && (
        <div>
          <h3 className="font-bold text-navy mb-1">What worked</h3>
          <ul className="list-disc pl-5 text-ink-soft space-y-1">{f.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {f.improvements.length > 0 && (
        <div>
          <h3 className="font-bold text-navy mb-1">To improve</h3>
          <div className="space-y-2">
            {f.improvements.map((x, i) => (
              <div key={i} className="border-l-4 pl-3" style={{ borderColor: 'hsl(355, 65%, 47%)' }}>
                <div className="font-semibold text-navy">{x.issue}</div>
                {x.quote && <div className="italic text-ink-muted">“{x.quote}”</div>}
                <div className="text-ink-soft">Try: {x.tryInstead}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {f.missed.length > 0 && (
        <div>
          <h3 className="font-bold text-navy mb-1">Points you missed</h3>
          <ul className="list-disc pl-5 text-ink-soft space-y-1">{f.missed.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {f.outline.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold text-navy">Outline of a strong answer</summary>
          <ul className="list-disc pl-5 text-ink-soft space-y-1 mt-2">{f.outline.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
