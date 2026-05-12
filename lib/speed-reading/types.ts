// Shapes consumed by the Speed Reading Tutor UI. Passages and questions are
// derived from the existing public.questions bank (no separate passage table);
// see lib/speed-reading/passages.ts for the assembly.

export type PassageDifficulty = 'easy' | 'medium' | 'hard';

export type PassageQuestion = {
  id: string;
  stem: string;
  options: { label: string; text: string }[]; // matches existing `choices` jsonb shape
  answer: number;                              // index into options
};

export type Passage = {
  id: string;                  // passage_id from DB
  title: string;               // passage_title
  text: string;                // passage (resolved via anchor row if needed)
  wordCount: number;           // computed from text
  difficulty: PassageDifficulty;
  questions: PassageQuestion[];
};

export type SessionDrill =
  | 'baseline'
  | 'pacer'
  | 'chunking'
  | 'scan'
  | 'qualifier'
  | 'triage'
  | 'passage';

// Tier returned by TIER(wpm) — see lib/speed-reading/constants.ts.
export type TierInfo = {
  name: string;
  tone: 'danger' | 'warn' | 'caution' | 'success' | 'accent';
  note: string;
};

// Language-trap category — see LANGUAGE_TRAPS.
export type LanguageTrap = {
  name: string;
  tone: 'danger' | 'success' | 'warn';
  rule: string;
  words: string[];
};

// Strategy router entry — see STRATEGIES.
export type Strategy = {
  id: 'fullRead' | 'scan';
  name: string;
  short: string;
  tone: 'accent' | 'success';
  when: string;
  questionTypes: string[];
  drills: SessionDrill[];
  pace: string;
  rationale: string;
};

// Triage question — see TRIAGE_QUESTIONS.
export type TriageQuestion = {
  id: string;
  stem: string;
  context: string;
  answer: 'true' | 'false' | 'cant_tell';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedSec: number;
  trap?: 'extreme' | 'soft' | 'negation';
};
