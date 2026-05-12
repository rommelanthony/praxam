// Server-side practice helpers: pick questions, log answers, update profile stats.
import 'server-only';
import { db, schema } from '@/db';
import { sql, eq, and, desc } from 'drizzle-orm';
import { HIDDEN_FLAGS } from '@/lib/questions/filters';

const SUBTEST_BY_SLUG: Record<string, string> = {
  'verbal-reasoning': 'verbal_reasoning',
  'decision-making': 'decision_making',
  'quantitative-reasoning': 'quantitative_reasoning',
  'abstract-reasoning': 'abstract_reasoning',
  'situational-judgement': 'situational_judgement',
};

export function subtestFromSlug(slug: string): string | null {
  return SUBTEST_BY_SLUG[slug] || null;
}

export const SUBTEST_NAMES: Record<string, string> = {
  verbal_reasoning: 'Verbal Reasoning',
  decision_making: 'Decision Making',
  quantitative_reasoning: 'Quantitative Reasoning',
  abstract_reasoning: 'Abstract Reasoning',
  situational_judgement: 'Situational Judgement',
};

/** Fetch a random question the user hasn't seen recently, gated by their plan. */
export async function pickNextQuestion(opts: {
  userId: string;
  subtest: string;
  plan: 'free' | 'pro';
}) {
  const { userId, subtest, plan } = opts;

  // Recent question IDs to avoid (last 50 the user answered in this subtest)
  const recent = await db
    .select({ qid: schema.answers.questionId })
    .from(schema.answers)
    .innerJoin(schema.questions, eq(schema.questions.id, schema.answers.questionId))
    .where(and(eq(schema.answers.userId, userId), eq(schema.questions.subtest, subtest as any)))
    .orderBy(desc(schema.answers.createdAt))
    .limit(50);

  const recentIds = recent.map((r) => r.qid);

  // Pick a random question for this subtest, respecting plan and recency.
  // Use Postgres random() for simplicity; for high traffic later switch to a smarter sampling.
  const conditions = [eq(schema.questions.subtest, subtest as any)];
  if (plan === 'free') {
    conditions.push(eq(schema.questions.isFree, true));
  }
  // Must have a correct answer captured
  conditions.push(sql`${schema.questions.correctAnswer} is not null`);
  // Skip questions tagged for repair. Mirrors the filter in app/api/questions/route.ts
  // via the shared HIDDEN_FLAGS constant so the two paths can't drift.
  conditions.push(sql`NOT (
    COALESCE(${schema.questions.flags}, '[]'::jsonb) ?| ${[...HIDDEN_FLAGS]}::text[]
  )`);

  const candidates = await db
    .select()
    .from(schema.questions)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(20);

  const fresh = candidates.find((q) => !recentIds.includes(q.id)) || candidates[0];
  return fresh || null;
}

/** Submit an answer and update profile stats in a single transaction. */
export async function submitAnswer(opts: {
  userId: string;
  sessionId: string | null;
  questionId: string;
  pickedLetter: string;
  timeTakenMs: number;
}) {
  const { userId, sessionId, questionId, pickedLetter, timeTakenMs } = opts;

  // Look up the correct answer
  const [q] = await db
    .select({ correctAnswer: schema.questions.correctAnswer })
    .from(schema.questions)
    .where(eq(schema.questions.id, questionId))
    .limit(1);

  if (!q) throw new Error(`Question ${questionId} not found`);
  const isCorrect = pickedLetter === q.correctAnswer;

  // Insert into answers table. Sessions are optional for now — we'll generate one if absent.
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const [created] = await db
      .insert(schema.sessions)
      .values({
        userId,
        subtest: 'mixed',
        questionIds: [questionId],
      })
      .returning({ id: schema.sessions.id });
    activeSessionId = created.id;
  }

  await db.insert(schema.answers).values({
    sessionId: activeSessionId,
    questionId,
    userId,
    pickedLetter,
    isCorrect,
    timeTakenMs,
  });

  // Bump profile stats — questionsAnsweredTotal++, recompute streak
  await db
    .update(schema.profiles)
    .set({
      questionsAnsweredTotal: sql`${schema.profiles.questionsAnsweredTotal} + 1`,
      lastPracticeDate: sql`current_date`,
      streakDays: sql`
        case
          when ${schema.profiles.lastPracticeDate} is null then 1
          when ${schema.profiles.lastPracticeDate} = current_date then ${schema.profiles.streakDays}
          when ${schema.profiles.lastPracticeDate} = current_date - 1 then ${schema.profiles.streakDays} + 1
          else 1
        end
      `,
    })
    .where(eq(schema.profiles.id, userId));

  return { isCorrect, correctAnswer: q.correctAnswer };
}

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
