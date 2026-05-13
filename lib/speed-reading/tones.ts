// Single source of truth for tone -> Tailwind token mapping. Semantic tones
// live in lib/speed-reading/constants.ts (TIER, LANGUAGE_TRAPS, STRATEGIES);
// rendering components import TONE_CLASSES from here so the data layer never
// references concrete colors. When/if a yellow token is added for the 'caution'
// tier, only this file changes.
//
// All class names are written out as full literals — Tailwind's purge can only
// find statically-present strings, so no `bg-${color}-soft` interpolation.

import type { TierInfo, LanguageTrap, Strategy } from '@/lib/speed-reading/types';

export type Tone = TierInfo['tone'] | LanguageTrap['tone'] | Strategy['tone'];

export const TONE_CLASSES: Record<
  Tone,
  { text: string; bg: string; border: string; ring: string; dot: string }
> = {
  danger:  { text: 'text-red',       bg: 'bg-red-soft',    border: 'border-red',    ring: 'ring-red',    dot: 'bg-red' },
  warn:    { text: 'text-amber',     bg: 'bg-amber-soft',  border: 'border-amber',  ring: 'ring-amber',  dot: 'bg-amber' },
  // 'caution' currently shares the amber palette — see constants.ts comment on
  // the Minimum Viable tier. Add a yellow token if visual distinction is needed.
  caution: { text: 'text-amber',     bg: 'bg-amber-soft',  border: 'border-amber',  ring: 'ring-amber',  dot: 'bg-amber' },
  success: { text: 'text-teal-deep', bg: 'bg-teal-soft',   border: 'border-teal',   ring: 'ring-teal',   dot: 'bg-teal' },
  accent:  { text: 'text-violet',    bg: 'bg-violet-soft', border: 'border-violet', ring: 'ring-violet', dot: 'bg-violet' },
};
