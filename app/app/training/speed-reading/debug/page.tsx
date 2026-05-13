// Dev-only render-test for the post-filter VR passage pool.
//
// Spec sect 7.5 calls this _debug, but Next.js treats _-prefixed folders as
// private (not routed). Using `debug` so the URL is /app/training/speed-reading/debug
// and the route actually resolves.
//
// Gated to non-production. Lets you eyeball every passage that getVRPassages()
// will serve and flag the ones with extraction artifacts, fragment-style
// titles, malformed questions, or word-count outliers. Catches data drift
// before users do — the handoff doc's "trust render-tests over flag counts"
// principle, learned the hard way 6+ times across prior sessions.
import { notFound } from 'next/navigation';
import { getVRPassages } from '@/lib/speed-reading/passages';
import type { Passage } from '@/lib/speed-reading/types';

export const metadata = { title: 'Speed Reading · Bank Debug — PracXAM' };
export const dynamic = 'force-dynamic';

type Issue = { kind: 'title' | 'extraction' | 'questions' | 'question' | 'difficulty'; detail: string };

function checkPassage(p: Passage): Issue[] {
  const issues: Issue[] = [];

  // Title
  if (!p.title || p.title === 'Untitled passage') {
    issues.push({ kind: 'title', detail: 'missing title (using fallback)' });
  } else if (/^\d/.test(p.title.trim())) {
    // Handoff example: "17 Due to the legislation enforced by the government"
    issues.push({ kind: 'title', detail: `title starts with digit — likely a text fragment: "${p.title.slice(0, 60)}"` });
  } else if (p.title.length > 120) {
    issues.push({ kind: 'title', detail: `title >120 chars — likely a stem fragment: "${p.title.slice(0, 60)}…"` });
  }

  // Passage text extraction artifacts
  if (/[a-z]\n[a-z]/.test(p.text)) {
    issues.push({ kind: 'extraction', detail: 'mid-word newline (possible OCR/extraction artifact)' });
  }
  // Patterns the handoff flagged: "diff erence", "rifl e", "Rose-\nbud", "boe75"
  if (/\b[a-z]{2,4}\s+(?:erence|ication|culty|tion|ing|ed)\b/i.test(p.text)) {
    issues.push({ kind: 'extraction', detail: 'possible mid-word space artifact (e.g. "diff erence")' });
  }
  if (/[a-z]-\n[a-z]/.test(p.text)) {
    issues.push({ kind: 'extraction', detail: 'hyphenated line-break not rejoined' });
  }

  // Question count — should always be 3..5 post-filter
  if (p.questions.length < 3) {
    issues.push({ kind: 'questions', detail: `only ${p.questions.length} question${p.questions.length === 1 ? '' : 's'} (UCAT-typical is 4)` });
  }
  if (p.questions.length > 5) {
    issues.push({ kind: 'questions', detail: `${p.questions.length} questions (filter should have dropped this — investigate)` });
  }

  // Per-question shape
  for (let i = 0; i < p.questions.length; i++) {
    const q = p.questions[i];
    const qLabel = `q${i + 1}`;
    if (!q.stem || !q.stem.trim()) {
      issues.push({ kind: 'question', detail: `${qLabel}: empty stem` });
    }
    if (q.stem && q.stem.trim().length < 15) {
      issues.push({ kind: 'question', detail: `${qLabel}: very short stem (${q.stem.trim().length} chars) — possible truncation` });
    }
    if (q.options.length < 2) {
      issues.push({ kind: 'question', detail: `${qLabel}: only ${q.options.length} option${q.options.length === 1 ? '' : 's'}` });
    }
    if (q.answer < 0 || q.answer >= q.options.length) {
      issues.push({ kind: 'question', detail: `${qLabel}: answer index ${q.answer} out of options range [0, ${q.options.length - 1}]` });
    }
  }

  return issues;
}

const ISSUE_TONE: Record<Issue['kind'], string> = {
  title: 'text-amber',
  extraction: 'text-red',
  questions: 'text-red',
  question: 'text-red',
  difficulty: 'text-amber',
};

export default async function DebugPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const passages = await getVRPassages();
  const checked = passages.map((p) => ({ p, issues: checkPassage(p) }));
  const flagged = checked.filter((c) => c.issues.length > 0);
  const clean = checked.length - flagged.length;
  const totalQuestions = passages.reduce((n, p) => n + p.questions.length, 0);

  return (
    <div className="container-px py-8">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-amber mb-2">
        Dev only · gated NODE_ENV !== 'production'
      </p>
      <h1 className="text-[1.8rem] font-bold tracking-tight text-navy mb-1">
        Speed Reading · Bank Debug
      </h1>
      <p className="text-ink-soft mb-6">
        Render-test of the post-filter VR passage pool. Catches extraction artifacts, fragment titles,
        malformed questions, and word-count outliers before users hit them. Run after any bank
        update.
      </p>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Passages served" value={passages.length} />
        <StatCard label="Clean" value={clean} tone="success" />
        <StatCard label="Flagged" value={flagged.length} tone={flagged.length > 0 ? 'warn' : 'success'} />
        <StatCard label="Total questions" value={totalQuestions} />
      </section>

      <h2 className="text-lg font-bold text-navy mb-3">
        Flagged passages {flagged.length > 0 && <span className="text-amber">({flagged.length})</span>}
      </h2>
      {flagged.length === 0 ? (
        <p className="text-ink-soft mb-8">
          No issues detected. Bank looks clean post-filter.
        </p>
      ) : (
        <div className="space-y-2 mb-8">
          {flagged.map(({ p, issues }) => (
            <details key={p.id} className="bg-surface border border-line rounded-md p-3">
              <summary className="cursor-pointer flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <code className="font-mono text-[12px] text-ink-soft mr-2">{p.id}</code>
                  <span className="text-navy text-[14px]">{p.title.slice(0, 70)}</span>
                </span>
                <span className="text-amber text-[12px] font-semibold flex-shrink-0">
                  {issues.length} issue{issues.length > 1 ? 's' : ''}
                </span>
              </summary>
              <ul className="mt-3 ml-2 space-y-1 text-[13px] text-ink-soft">
                {issues.map((i, idx) => (
                  <li key={idx}>
                    <span className={`font-semibold ${ISSUE_TONE[i.kind]}`}>{i.kind}:</span> {i.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-3 ml-2 text-[12px] text-ink-muted">
                {p.wordCount} words · {p.questions.length} questions · {p.difficulty}
              </p>
            </details>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold text-navy mb-3">All passages</h2>
      <div className="overflow-x-auto bg-surface border border-line rounded-md">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-cool text-ink-muted uppercase text-[11px]">
            <tr>
              <th className="text-left p-2 font-semibold">passage_id</th>
              <th className="text-left p-2 font-semibold">title</th>
              <th className="text-right p-2 font-semibold">words</th>
              <th className="text-right p-2 font-semibold">qs</th>
              <th className="text-left p-2 font-semibold">difficulty</th>
              <th className="text-right p-2 font-semibold">issues</th>
            </tr>
          </thead>
          <tbody>
            {checked.map(({ p, issues }) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-2 font-mono text-[12px]">{p.id}</td>
                <td className="p-2 text-navy">{p.title.slice(0, 60)}</td>
                <td className="p-2 text-right tabular-nums">{p.wordCount}</td>
                <td className="p-2 text-right tabular-nums">{p.questions.length}</td>
                <td className="p-2 text-ink-soft">{p.difficulty}</td>
                <td className="p-2 text-right tabular-nums">
                  {issues.length > 0 ? <span className="text-amber font-semibold">{issues.length}</span> : <span className="text-ink-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'accent',
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warn' | 'accent';
}) {
  const colorClass = tone === 'success' ? 'text-teal-deep' : tone === 'warn' ? 'text-amber' : 'text-violet';
  return (
    <div className="bg-surface border border-line rounded-md p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">{label}</div>
      <div className={`text-[1.8rem] font-extrabold tabular-nums ${colorClass}`}>{value}</div>
    </div>
  );
}
