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

// PR-2 plan decision (b): column `wpm` carries the target WPM the user trained
// at; meta carries the drill-specific knob (chunkSize for Pacer,
// wordsPerFixation for Chunking). Lets Progress queries treat wpm as the
// canonical column across drills without coalescing from meta. Drill column
// already disambiguates row semantics.
export async function savePacerSession(input: {
  passageId: string;
  elapsedSec: number;
  targetWpm: number;
  chunkSize: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  await logSession({
    userId: user.id,
    drill: 'pacer',
    wpm: input.targetWpm,
    passageId: input.passageId,
    elapsedSec: input.elapsedSec,
    meta: { chunkSize: input.chunkSize },
  });

  return { ok: true };
}

export async function saveChunkingSession(input: {
  passageId: string;
  elapsedSec: number;
  targetWpm: number;
  wordsPerFixation: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  await logSession({
    userId: user.id,
    drill: 'chunking',
    wpm: input.targetWpm,
    passageId: input.passageId,
    elapsedSec: input.elapsedSec,
    meta: { wordsPerFixation: input.wordsPerFixation },
  });

  return { ok: true };
}

// Scan has no target WPM and no comprehension check — wpm and
// comprehensionPct columns stay null. Meta carries the keyword count and the
// per-keyword find times (deltas between consecutive finds, first measured
// from start). perKeywordSec preserves the full per-keyword breakdown so
// Progress can chart find-speed over time later; avg is trivially derivable.
export async function saveScanSession(input: {
  passageId: string;
  elapsedSec: number;
  keywordCount: number;
  perKeywordSec: number[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  await logSession({
    userId: user.id,
    drill: 'scan',
    passageId: input.passageId,
    elapsedSec: input.elapsedSec,
    meta: {
      keywordCount: input.keywordCount,
      perKeywordSec: input.perKeywordSec,
    },
  });

  return { ok: true };
}
