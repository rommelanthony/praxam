// Light-themed Callout — icon + title + body, tinted by tone. Replaces the
// prototype's three-tone (accent/warn/muted) with the project's semantic tones.
import type { LucideIcon } from 'lucide-react';
import { TONE_CLASSES, type Tone } from '@/lib/speed-reading/tones';

export function Callout({
  icon: Icon,
  tone = 'accent',
  title,
  body,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title?: string;
  body: React.ReactNode;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-md border ${t.border} ${t.bg}`}>
      <Icon className={t.text} size={18} aria-hidden="true" />
      <div className="min-w-0">
        {title && <div className={`font-semibold mb-1 ${t.text}`}>{title}</div>}
        <div className="text-ink-soft text-sm leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
