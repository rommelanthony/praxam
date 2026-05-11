'use client';

import { useState } from 'react';

type Props = {
  initialRegion: 'ANZ' | 'UK' | null;
  initialTestDate: string | null;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

export default function UcatDetailsForm({ initialRegion, initialTestDate }: Props) {
  const [region, setRegion] = useState<string>(initialRegion ?? '');
  const [testDate, setTestDate] = useState<string>(initialTestDate ?? '');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function save() {
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ucatRegion: region === '' ? null : region,
          ucatTestDate: testDate === '' ? null : testDate,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Save failed.' }));
        setStatus({ kind: 'error', message: error || 'Save failed.' });
        return;
      }
      setStatus({ kind: 'saved' });
      setTimeout(() => {
        setStatus((s) => (s.kind === 'saved' ? { kind: 'idle' } : s));
      }, 3000);
    } catch {
      setStatus({ kind: 'error', message: 'Network error.' });
    }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="block">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5 block">
          Region
        </span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full bg-surface border border-line rounded-md px-3 py-2 text-navy focus:outline-none focus:border-teal-soft"
        >
          <option value="">Select region</option>
          <option value="ANZ">Australia / New Zealand</option>
          <option value="UK">United Kingdom</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5 block">
          UCAT test date
        </span>
        <input
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          className="w-full bg-surface border border-line rounded-md px-3 py-2 text-navy focus:outline-none focus:border-teal-soft"
        />
      </label>

      <div className="sm:col-span-2 flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={status.kind === 'saving'}
          className="btn btn-teal disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status.kind === 'saved' && (
          <span
            className="text-[13px] font-medium px-2.5 py-1 rounded-md"
            style={{ color: 'var(--teal-deep)', background: 'var(--teal-soft)' }}
          >
            Saved
          </span>
        )}
        {status.kind === 'error' && (
          <span className="text-[13px] text-red-600">{status.message}</span>
        )}
      </div>
    </div>
  );
}
