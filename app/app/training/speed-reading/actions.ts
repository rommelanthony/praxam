'use server';
// Server actions for the Speed Reading Tutor. Each drill gets its own narrow
// action so the meta shape is validated per-drill (PR 2/3 will add savePacerSession,
// saveTriageSession, etc. as those drills land). The underlying logSession() in
// lib/speed-reading/sessions.ts stays generic.
import { createClient } from '@/lib/supabase/server';
import { logSession } from '@/lib/speed-reading/sessions';

export async function saveBaselineSession(input: {
  wpm: number;
  comprehensionPct: number;
  passageId: string;
  elapsedSec: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  // No meta shape for baseline — wpm, comprehension, passage, and elapsed are
  // top-level columns and that's everything we capture for this drill.
  await logSession({
    userId: user.id,
    drill: 'baseline',
    wpm: input.wpm,
    comprehensionPct: input.comprehensionPct,
    passageId: input.passageId,
    elapsedSec: input.elapsedSec,
  });

  return { ok: true };
}
