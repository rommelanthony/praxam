// Large value + label + unit for hero stats (Baseline result, Passage result).
import { TONE_CLASSES, type Tone } from '@/lib/speed-reading/tones';

export function BigStat({
  label,
  value,
  unit,
  tone = 'accent',
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: Tone;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div className="bg-surface border border-line rounded-md p-4">
      <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[2rem] font-extrabold leading-none ${t.text}`}>{value}</span>
        {unit && <span className="text-[14px] text-ink-soft font-medium">{unit}</span>}
      </div>
    </div>
  );
}
