// Labeled range input. Used by Pacer/Chunking drills (PR 2) to set target WPM.
// Native range styling is browser-fickle; we keep it simple here and rely on
// the system look-and-feel rather than fighting it cross-browser.

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
        <span className="text-[16px] font-bold text-navy tabular-nums">
          {value}
          {suffix && <span className="text-[13px] text-ink-soft font-medium ml-0.5">{suffix}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal"
      />
    </div>
  );
}
