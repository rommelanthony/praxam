// Hidden flag types — questions carrying any of these are not served.
// Used by both the public question API (app/api/questions/route.ts) and the
// server-side picker (lib/practice.ts) to keep the gating identical.
export const HIDDEN_FLAGS = [
  'needs_asset',
  'needs_passage',
  'requires_image',
  'needs_image',
  'needs_review',
  'yes_no_format',
  'most_least_format',
  'passage_mismatch',
] as const;

export type HiddenFlag = (typeof HIDDEN_FLAGS)[number];
