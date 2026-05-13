'use server';
// Server actions for the Speed Reading Tutor. Each drill gets its own narrow
// action so the meta shape is validated per-drill (PR 2/3 will add savePacerSession,
// saveTriageSession, etc. as those drills land). The underlying logSession() in
// lib/speed-reading/sessions.ts stays generic.
import { createClient } from '@/lib/supabase/server';
import { logSession } from '@/lib/speed-reading/sessions';

export type BaselineMeta = {
  // The user's picked option index per question (length = questionCount).
  answers: number[];
  // The correct option index per question, as resolved by toQuestion() in
  // lib/speed-reading/passages.ts (label-letter -> choices array index).
  correctAnswers: number[];
  questionCount: number;
  // The passage word count used in the WPM calc (wpm = wordCount / elapsedSec * 60).
  wordCount: number;
};

export async function saveBaselineSession(input: {
  wpm: number;
  comprehensionPct: number;
  passageId: string;
  elapsedSec: number;
  meta: BaselineMeta;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  await logSession({
    userId: user.id,
    drill: 'baseline',
    wpm: input.wpm,
    comprehensionPct: input.comprehensionPct,
    passageId: input.passageId,
    elapsedSec: input.elapsedSec,
    meta: input.meta,
  });

  return { ok: true };
}
