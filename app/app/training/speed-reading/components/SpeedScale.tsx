// Horizontal WPM scale with five tier stops (Avg/Min/Target/Stretch/Ceiling)
// and a marker positioned at the user's current WPM. Used by the Baseline
// result and the Passage Drill result to give a "where you are on the scale"
// visual. Light-themed port of the prototype's dark gradient track.

export function SpeedScale({ current }: { current: number }) {
  const stops: { wpm: number; label: string; emphasis?: boolean }[] = [
    { wpm: 200, label: 'Avg' },
    { wpm: 300, label: 'Min' },
    { wpm: 400, label: 'Target', emphasis: true },
    { wpm: 500, label: 'Stretch' },
    { wpm: 600, label: 'Ceiling' },
  ];
  const max = 600;
  const pct = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="my-6">
      <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-3">
        Where you sit on the UCAT scale
      </div>
      <div className="relative h-2 rounded-pill bg-surface-cool overflow-visible">
        {/* Gradient fill from danger -> warn -> success -> accent, capped at current WPM */}
        <div
          className="absolute inset-y-0 left-0 rounded-pill"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, hsl(355, 65%, 47%) 0%, hsl(32, 75%, 42%) 35%, hsl(180, 70%, 36%) 70%, hsl(259, 36%, 48%) 100%)',
          }}
          aria-hidden="true"
        />
        {/* Marker at current WPM */}
        <div
          className="absolute -top-1 -translate-x-1/2"
          style={{ left: `${pct}%` }}
        >
          <div className="w-4 h-4 rounded-full bg-navy border-2 border-paper shadow-md" />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[12px] font-bold text-navy whitespace-nowrap">
            {current}
          </div>
        </div>
        {/* Stop ticks under the track */}
        {stops.map((s) => (
          <div
            key={s.wpm}
            className="absolute top-3 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${(s.wpm / max) * 100}%` }}
          >
            <div className="w-px h-1.5 bg-line" />
            <div
              className={`mt-1 text-[11px] tabular-nums ${s.emphasis ? 'text-teal-deep font-semibold' : 'text-ink-muted'}`}
            >
              {s.wpm}
              <span className="ml-1 opacity-70">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-8" aria-hidden="true" /> {/* spacer for stop labels below */}
    </div>
  );
}
