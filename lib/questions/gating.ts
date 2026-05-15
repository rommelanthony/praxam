// Plan-gating helper for the question bank. Single source of truth for the
// "free user gets 10 questions per subtest then hits a paywall" rule.
//
// Two consumers wire into this (in subsequent commits of the plan-gating PR):
//   1. app/api/questions/route.ts — bulk fetch at session start (limit=20)
//   2. lib/practice.ts:pickNextQuestion — single-pick after each answered
//      question, called via app/app/practice/[subtest]/actions.ts server action
//
// Both must use the same gating semantics; otherwise free users could bypass
// the hard-stop by alternating between the two paths. Colocated with
// lib/questions/filters.ts (HIDDEN_FLAGS) and lib/questions/passages.ts
// (hydratePassages) so all question-eligibility logic lives in one folder.
//
// Auth is the caller's responsibility — the helper trusts userId and plan as
// inputs. Callers should pull user via createClient()/auth.getUser() and read
// profile.plan before invoking.

import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions, answers, type Question } from '@/db/schema';
import { excludeHiddenFlags } from './filters';
import { hydratePassages } from './passages';

// UCAT free-tier ceiling. Mirrors the 10-per-subtest is_free=true flagging
// applied to public.questions on 2026-05-15 (50 questions total across the
// 5 subtests). If this changes, the reflag UPDATE and this constant must
// move together.
export const FREE_LIMIT_PER_SUBTEST = 10;

export type PaywallInfo = {
  reason: 'free_limit_reached';
  subtest: string;
  attempted: number;
  freeLimit: number;
};

export type GatingResult =
  | { questions: Question[] }
  | { paywall: PaywallInfo };

export async function getNextQuestionsForUser(input: {
  userId: string;
  subtest: string;          // Schema subtest enum value, e.g. 'verbal_reasoning'
  plan: 'free' | 'pro';
  limit: number;
  // Optional set of question IDs the caller wants excluded (e.g. recent
  // questions a user just answered in this session). Ignored for free users
  // — the helper computes its own attempted-set against the is_free pool,
  // which is the gating signal. Pro users get this respected if provided.
  alreadyAttempted?: Set<string>;
}): Promise<GatingResult> {
  const { userId, subtest, plan, limit, alreadyAttempted } = input;

  if (plan === 'free') {
    // 1. Compute the user's attempted free-question IDs in this subtest.
    //    Used both for the exhaustion check and for excluding from the
    //    serve query so we don't repeat a question they've already seen
    //    until they've cycled through all 10.
    const attemptedRows = await db
      .select({ qid: answers.questionId })
      .from(answers)
      .innerJoin(questions, eq(questions.id, answers.questionId))
      .where(
        and(
          eq(answers.userId, userId),
          eq(questions.subtest, subtest as 'verbal_reasoning'),
          eq(questions.isFree, true),
        ),
      );

    const attemptedFreeIds = new Set(attemptedRows.map((r) => r.qid));
    const attemptedCount = attemptedFreeIds.size;

    // 2. Hard-stop: free user has exhausted their 10. Return paywall signal.
    if (attemptedCount >= FREE_LIMIT_PER_SUBTEST) {
      return {
        paywall: {
          reason: 'free_limit_reached',
          subtest,
          attempted: attemptedCount,
          freeLimit: FREE_LIMIT_PER_SUBTEST,
        },
      };
    }

    // 3. Serve next free unattempted question(s) for this subtest.
    const rows = await db
      .select()
      .from(questions)
      .where(buildFreeWhere(subtest, attemptedFreeIds))
      .orderBy(sql`random()`)
      .limit(limit);

    const resolved = await hydratePassages(rows);
    return { questions: resolved };
  }

  // Pro path: full subtest pool, HIDDEN_FLAGS-filtered, optionally exclude
  // alreadyAttempted (for pickNextQuestion-style recent dedup). No
  // exhaustion check; no plan filter on is_free.
  const rows = await db
    .select()
    .from(questions)
    .where(buildProWhere(subtest, alreadyAttempted))
    .orderBy(sql`random()`)
    .limit(limit);

  const resolved = await hydratePassages(rows);
  return { questions: resolved };
}

// --- WHERE-clause builders ---------------------------------------------------
// Both follow the same shape: subtest match + HIDDEN_FLAGS exclusion +
// optional NOT IN exclusion list. The NOT IN clause expands the JS Set as
// individual scalar parameters via sql.join — the same pattern used by
// excludeHiddenFlags() to avoid postgres-js's array-as-record serialization
// bug (see commit e48e236).

// correctAnswer IS NOT NULL guards against serving un-gradable rows (rare
// data-quality holdouts that survived the HIDDEN_FLAGS filter but lack a
// correct_answer value). Applied to both paths so the helper is consistently
// safe regardless of plan.

// Per-subtest attempt counts for a user against the is_free pool. Used by the
// practice picker (server component) to compute per-tile lock state. Returns
// only subtests the user has attempted at least one free question in; absent
// subtests imply attempted=0 — picker code coalesces.
export async function getAttemptCountsByFreeSubtest(userId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({
      subtest: questions.subtest,
      attempted: sql<number>`count(distinct ${answers.questionId})::int`,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .where(and(eq(answers.userId, userId), eq(questions.isFree, true)))
    .groupBy(questions.subtest);
  return Object.fromEntries(rows.map((r) => [r.subtest, r.attempted]));
}

function buildFreeWhere(subtest: string, attempted: Set<string>) {
  const base = sql`${questions.subtest} = ${subtest}
    AND ${questions.isFree} = true
    AND ${questions.correctAnswer} IS NOT NULL
    AND ${excludeHiddenFlags(questions.flags)}`;
  return appendExclusion(base, attempted);
}

function buildProWhere(subtest: string, attempted?: Set<string>) {
  const base = sql`${questions.subtest} = ${subtest}
    AND ${questions.correctAnswer} IS NOT NULL
    AND ${excludeHiddenFlags(questions.flags)}`;
  return appendExclusion(base, attempted);
}

function appendExclusion(base: ReturnType<typeof sql>, ids?: Set<string>) {
  if (!ids || ids.size === 0) return base;
  const idList = sql.join(
    Array.from(ids).map((id) => sql`${id}`),
    sql`, `,
  );
  return sql`${base} AND ${questions.id} NOT IN (${idList})`;
}
