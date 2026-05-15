// Server-side user-profile helper.
//
// Historical note: this file previously also exported pickNextQuestion,
// submitAnswer, subtestFromSlug, SUBTEST_NAMES, and SUBTEST_BY_SLUG. The
// plan-gating PR retired the entire answerAndNext / QuestionRunner server-
// action chain that consumed those exports — see the deleted
// app/app/practice/[subtest]/actions.ts and components/practice/
// QuestionRunner.tsx. The live practice flow at app/app/practice/[subtest]/
// page.tsx talks directly to /api/questions and /api/answers; nothing in
// the chain was load-bearing. SUBTEST_NAMES moved to lib/questions/labels.ts
// for shared client/server use.
//
// File-name follow-up: this module's name no longer matches its contents
// (only `getOrCreateProfile` remains). Future hygiene PR can rename to
// lib/profile.ts and update the three import sites (account/page.tsx,
// app/page.tsx, training/speed-reading/page.tsx).
import 'server-only';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

/** Get the user's profile or create one if missing (defensive — usually trigger handles this). */
export async function getOrCreateProfile(userId: string, email: string) {
  const [existing] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(schema.profiles)
    .values({ id: userId, email })
    .returning();
  return created;
}
