// Decision Making "Yes/No" questions (UCAT drag-and-drop format).
//
// Storage (no schema change):
//   choices        — one entry per statement, labelled A, B, C, …
//   correct_answer — one Y/N character per statement, in choice order, e.g. "NYNNN"
//   picked_letter  — the student's answer in the same form, e.g. "NYNYN"
//
// Marking follows the UCAT rule: full marks (2) when every statement is right,
// 1 mark when exactly one is wrong, otherwise 0. `isCorrect` (used for scores,
// streaks and XP) is true only when every statement is right.

type Choice = { label: string; text: string };
type Gradable = { correctAnswer: string | null; choices: unknown };

const YN = /^[YN]{2,10}$/;

export function isYesNo(q: Gradable): boolean {
  if (!q.correctAnswer || !YN.test(q.correctAnswer)) return false;
  const choices = q.choices as Choice[] | null;
  return Array.isArray(choices) && choices.length === q.correctAnswer.length;
}

export type YesNoGrade = { right: number; total: number; marks: 0 | 1 | 2; allCorrect: boolean };

export function gradeYesNo(picked: string | null | undefined, key: string): YesNoGrade {
  const total = key.length;
  let right = 0;
  for (let i = 0; i < total; i++) if (picked?.[i] === key[i]) right++;
  const marks: 0 | 1 | 2 = right === total ? 2 : right === total - 1 ? 1 : 0;
  return { right, total, marks, allCorrect: right === total };
}

// Single place to decide whether an answer is right, for both formats.
export function isAnswerCorrect(q: Gradable, picked: string | null | undefined): boolean {
  if (picked == null) return false;
  if (isYesNo(q)) return gradeYesNo(picked, q.correctAnswer!).allCorrect;
  return picked === q.correctAnswer;
}

export const yesNoWord = (c: string | undefined) => (c === 'Y' ? 'Yes' : c === 'N' ? 'No' : '—');
