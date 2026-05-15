// Display labels for UCAT subtest enum values. Maps the schema's subtest
// enum (e.g. 'verbal_reasoning') to user-facing strings ('Verbal Reasoning').
//
// Plain const, no 'server-only' directive — importable from client and server
// alike. Used by the practice paywall lock state, future Progress views, and
// anywhere a subtest key needs to render as text.
export const SUBTEST_NAMES: Record<string, string> = {
  verbal_reasoning: 'Verbal Reasoning',
  decision_making: 'Decision Making',
  quantitative_reasoning: 'Quantitative Reasoning',
  abstract_reasoning: 'Abstract Reasoning',
  situational_judgement: 'Situational Judgement',
};
