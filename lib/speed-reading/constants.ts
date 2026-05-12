// Constants and reference content for the Speed Reading Tutor.
// Ported from docs/SpeedReadingTutor.jsx — values must stay in sync with the
// prototype until the spec is updated. Hex colors from the dark-themed prototype
// are translated here to semantic `tone` strings; rendering components map tones
// to the project's Tailwind tokens (navy/teal/violet/amber/red).

import type {
  LanguageTrap,
  Strategy,
  TierInfo,
  TriageQuestion,
} from '@/lib/speed-reading/types';

// UCAT Verbal Reasoning structural facts. Drives Overview math, target WPM, etc.
export const UCAT = {
  totalMin: 22,
  passages: 11,
  qPerPassage: 4,
  totalQ: 44,
  secPerPassage: 120,
  secPerQ: 30,
  wordsLo: 200,
  wordsHi: 300,
  minWPM: 300,
  targetWPM: 400,
  stretchWPM: 500,
  ceilingWPM: 500,
  compFloor: 80,
} as const;

// Five tiers based on reading speed. Used by Baseline result and Overview hero.
// The 'caution' tone is unique to the Minimum Viable tier; the prototype used a
// yellow (#F4D35E) that sits between warn (amber) and success (teal) and has no
// direct equivalent in the existing teal/violet/amber/red token set. Step F/G
// will map this tone to a Tailwind token (likely a lighter amber or new yellow).
export function TIER(wpm: number): TierInfo {
  if (wpm < 250) return { name: 'Below baseline', tone: 'danger',  note: "Most untrained readers sit here. Big gains available." };
  if (wpm < 300) return { name: 'Baseline',       tone: 'warn',    note: "Around average. You'll struggle for time on UCAT." };
  if (wpm < 400) return { name: 'Minimum viable', tone: 'caution', note: 'Workable with strong scanning, but no buffer.' };
  if (wpm < 500) return { name: 'Training target', tone: 'success', note: 'Strong UCAT pace — finish with time to check.' };
  return                  { name: 'Stretch',       tone: 'accent',  note: 'Elite pace. Watch comprehension carefully.' };
}

// Words that flip meaning in UCAT VR. Drives Qualifier Hunt and the Strategy
// page reference panel. Tones map to: extreme=red, soft=teal, negation=amber.
export const LANGUAGE_TRAPS: Record<'extreme' | 'soft' | 'negation', LanguageTrap> = {
  extreme: {
    name: 'Extreme qualifiers',
    tone: 'danger',
    rule: 'Usually signals FALSE. One counter-example in the passage breaks the statement.',
    words: [
      'all', 'every', 'always', 'never', 'none', 'only', 'must', 'no one',
      'everyone', 'nothing', 'everything', 'impossible', 'certain', 'sole',
      'exclusively', 'entirely',
    ],
  },
  soft: {
    name: 'Soft qualifiers',
    tone: 'success',
    rule: "Usually signals TRUE or CAN'T TELL. Hard to disprove because the claim is hedged.",
    words: [
      'some', 'many', 'few', 'may', 'might', 'could', 'often', 'sometimes',
      'usually', 'can', 'tend to', 'likely', 'possibly', 'generally',
      'frequently', 'rarely',
    ],
  },
  negation: {
    name: 'Negations',
    tone: 'warn',
    rule: "EASY to miss when speed-reading. Mentally rewrite 'X is true EXCEPT' as 'which X is false'.",
    words: [
      'not', 'except', 'cannot', 'neither', 'nor', 'without', 'unless',
      'fails to', 'rather than', 'instead of',
    ],
  },
};

// Two-mode strategy: which technique fits which UCAT question type.
// Tones: fullRead=violet (accent), scan=teal (success).
export const STRATEGIES: Record<'fullRead' | 'scan', Strategy> = {
  fullRead: {
    id: 'fullRead',
    name: 'Full-passage speed read',
    short: 'Read fast',
    tone: 'accent',
    when: 'Use when the question needs the whole picture',
    questionTypes: ['Most likely / inference', "Author's opinion", 'Main idea'],
    drills: ['pacer', 'chunking'],
    pace: '400–500 WPM',
    rationale: "These questions test understanding of the passage as a whole. You can't shortcut them with keyword scanning — you need the argument's shape.",
  },
  scan: {
    id: 'scan',
    name: 'Scan-and-locate',
    short: 'Scan & locate',
    tone: 'success',
    when: 'Use when the question points to a specific fact',
    questionTypes: ["True / False / Can't Tell", 'EXCEPT questions', 'Specific detail'],
    drills: ['scan'],
    pace: 'Skim @ ~700+ WPM, read target sentence @ 300 WPM',
    rationale: 'Read the question first, identify a distinctive keyword, scan the passage for it, then carefully read only the sentence around it. Top UCAT scorers rely on this for ~70% of questions.',
  },
};

// Triage Trainer bank — 10 hardcoded items per spec sect 10 (move to DB later
// when content team owns this). Items mix difficulties and traps so the trainer
// surfaces both fast-skip and worth-attempting decisions.
export const TRIAGE_QUESTIONS: TriageQuestion[] = [
  { id: 't1',  stem: 'The passage states the company was founded in 1923.',                                                                                                                                                                                                       context: 'Founded 1923, IPO 1968, acquired 2001.',                                                                                  answer: 'true',      difficulty: 'easy',   expectedSec: 8 },
  { id: 't2',  stem: 'All employees received bonuses in 2023.',                                                                                                                                                                                                                  context: 'Most employees received bonuses; performance-based exceptions applied to senior management.',                              answer: 'false',     difficulty: 'easy',   expectedSec: 10, trap: 'extreme' },
  { id: 't3',  stem: 'The CEO believes AI will replace 30% of office jobs within a decade.',                                                                                                                                                                                     context: 'The CEO discussed automation broadly without giving percentages or timeframes.',                                          answer: 'cant_tell', difficulty: 'medium', expectedSec: 15 },
  { id: 't4',  stem: 'The drug was tested on more than 10,000 patients across three continents, demonstrating efficacy in Phase III trials with statistically significant outcomes versus placebo across multiple demographic subgroups.',                                       context: 'Phase III trials enrolled 8,400 patients across two continents.',                                                          answer: 'false',     difficulty: 'hard',   expectedSec: 35 },
  { id: 't5',  stem: 'Some researchers have questioned the findings.',                                                                                                                                                                                                           context: 'Several scientists raised methodological concerns following publication.',                                                 answer: 'true',      difficulty: 'easy',   expectedSec: 8,  trap: 'soft' },
  { id: 't6',  stem: 'The treatment is not recommended for patients under 18.',                                                                                                                                                                                                  context: 'Pediatric trials are ongoing; current guidelines apply to adults only.',                                                   answer: 'cant_tell', difficulty: 'hard',   expectedSec: 25, trap: 'negation' },
  { id: 't7',  stem: "The author exclusively credits government funding for the program's success.",                                                                                                                                                                             context: 'The author cites government funding, private donations, and volunteer effort.',                                            answer: 'false',     difficulty: 'medium', expectedSec: 12, trap: 'extreme' },
  { id: 't8',  stem: 'The policy was implemented in every European country by 2020.',                                                                                                                                                                                            context: 'By 2020, 21 of 27 EU member states had implemented similar policies.',                                                     answer: 'false',     difficulty: 'medium', expectedSec: 12, trap: 'extreme' },
  { id: 't9',  stem: 'Climate change may contribute to species migration patterns.',                                                                                                                                                                                             context: 'Researchers have observed shifts in migration that correlate with temperature changes, though causation remains debated.',  answer: 'true',      difficulty: 'easy',   expectedSec: 10, trap: 'soft' },
  { id: 't10', stem: 'A comprehensive longitudinal study following 4,200 participants over 15 years across rural and urban settings found that dietary patterns characterized by high vegetable intake correlated with reduced incidence of cardiovascular events.',             context: 'The study tracked 4,200 participants for 12 years across mixed settings.',                                                 answer: 'false',     difficulty: 'hard',   expectedSec: 40 },
];
