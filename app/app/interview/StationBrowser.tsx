'use client';
import Link from 'next/link';
import { useState } from 'react';

type Group = { domain: string; stations: Array<{ id: string; title: string; question: string; attributes: string[] }> };

export default function StationBrowser({ edition, groups }: { edition: string; groups: Group[] }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({ ...g, stations: term ? g.stations.filter((s) => (s.title + ' ' + s.question).toLowerCase().includes(term)) : g.stations }))
    .filter((g) => g.stations.length);

  return (
    <div>
      <label className="block mb-4">
        <span className="sr-only">Search stations</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stations, e.g. vaping or organ donation"
          className="w-full max-w-[420px] rounded-md border border-line bg-surface px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-teal"
        />
      </label>
      {filtered.map((g, i) => (
        <details key={g.domain} open={i === 0 || !!term} className="border-t border-line py-3">
          <summary className="cursor-pointer font-bold text-navy text-[17px] py-1">
            {g.domain} <span className="text-[13px] font-medium text-ink-muted">{g.stations.length} stations</span>
          </summary>
          <div className="grid gap-3 mt-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.stations.map((s) => (
              <Link
                key={s.id}
                href={`/app/interview/session?edition=${edition}&station=${encodeURIComponent(s.id)}`}
                className="block rounded-md border border-line bg-surface p-4 hover:border-teal hover:shadow-md transition"
              >
                <div className="font-bold text-navy mb-1">{s.title}</div>
                <div className="text-[14px] text-ink-soft mb-2">{s.question}</div>
                <div className="text-[12.5px] text-ink-muted">Assesses: {s.attributes.join(', ')}</div>
              </Link>
            ))}
          </div>
        </details>
      ))}
      {!filtered.length && <p className="text-ink-soft">No stations match that search.</p>}
    </div>
  );
}
