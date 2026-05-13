// Dropdown that picks a Passage from a supplied list. Used by Passage Drill,
// possibly Pacer/Chunking too. The parent owns the passage list and the
// selected index — this component stays presentational.
import type { Passage } from '@/lib/speed-reading/types';

export function PassageSelector({
  passages,
  value,
  onChange,
  label = 'Passage',
}: {
  passages: Passage[];
  value: number;
  onChange: (index: number) => void;
  label?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-semibold uppercase tracking-wider text-ink-soft mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-surface border border-line rounded-md px-3 py-2 text-[14px] text-navy focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
      >
        {passages.map((p, i) => (
          <option key={p.id} value={i}>
            {p.title} · {p.difficulty} · {p.wordCount}w
          </option>
        ))}
      </select>
    </div>
  );
}
