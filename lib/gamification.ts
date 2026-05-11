import "server-only";
import { db, schema } from "@/db";
import { eq, sql, desc } from "drizzle-orm";
export { PERCENTILE_BADGES, getBadgeForPercentile, XP, calcSpeedBonus } from "@/lib/gamification-shared";
export type { PercentileBadge } from "@/lib/gamification-shared";

export async function awardXp(userId: string, amount: number, reason: string, meta?: Record<string, unknown>): Promise<void> {
  if (amount <= 0) return;
  await db.insert(schema.xpEvents).values({ userId, amount, reason, meta });
  await db.update(schema.profiles).set({
    xp:       sql`${schema.profiles.xp} + ${amount}`,
    weeklyXp: sql`${schema.profiles.weeklyXp} + ${amount}`,
  }).where(eq(schema.profiles.id, userId));
}

export async function processAnswer(opts: {
  userId: string; isCorrect: boolean; timeTakenMs: number; subtest: string;
  sessionCorrect?: number; sessionTotal?: number;
  isSessionEnd?: boolean; isQotd?: boolean;
}): Promise<{ xpAwarded: number; newAchievements: string[] }> {
  const { userId, isCorrect, timeTakenMs, subtest, sessionCorrect, sessionTotal, isSessionEnd, isQotd } = opts;
  const { calcSpeedBonus, XP } = await import("@/lib/gamification-shared");

  await resetWeeklyStatsIfNeeded(userId);

  const [prof] = await db.select({
    lastPracticeDate: schema.profiles.lastPracticeDate,
    streakDays:       schema.profiles.streakDays,
    longestStreak:    schema.profiles.longestStreak,
  }).from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const last = prof?.lastPracticeDate ? String(prof.lastPracticeDate) : null;
  const firstToday = last !== today;

  let newStreak = prof?.streakDays ?? 0;
  if (firstToday) newStreak = last === yesterday ? newStreak + 1 : 1;
  const newLongest = Math.max(prof?.longestStreak ?? 0, newStreak);

  await db.update(schema.profiles).set({
    questionsAnsweredTotal: sql`${schema.profiles.questionsAnsweredTotal} + 1`,
    weeklyQuestions:        sql`${schema.profiles.weeklyQuestions} + 1`,
    streakDays:             newStreak,
    longestStreak:          newLongest,
    lastPracticeDate:       sql`current_date`,
  }).where(eq(schema.profiles.id, userId));

  let total = 0;
  await awardXp(userId, XP.ANSWER, "answer"); total += XP.ANSWER;
  if (isCorrect) {
    await awardXp(userId, XP.CORRECT_BONUS, "correct_bonus"); total += XP.CORRECT_BONUS;
    const sb = calcSpeedBonus(timeTakenMs, subtest);
    if (sb > 0) { await awardXp(userId, sb, "speed_bonus", { timeTakenMs, subtest }); total += sb; }
  }
  if (firstToday) { await awardXp(userId, XP.STREAK_BONUS, "streak_bonus"); total += XP.STREAK_BONUS; }
  if (isQotd) {
    await awardXp(userId, XP.QOTD, "qotd"); total += XP.QOTD;
    await db.update(schema.profiles).set({ qotdLastCompleted: sql`current_date` }).where(eq(schema.profiles.id, userId));
  }

  const newAchievements = await checkAchievements(userId, { isSessionEnd, sessionCorrect, sessionTotal, isCorrect, isQotd });

  return { xpAwarded: total, newAchievements };
}

export async function checkAchievements(userId: string, ctx: {
  isCorrect?: boolean; sessionCorrect?: number; sessionTotal?: number; isSessionEnd?: boolean; isQotd?: boolean;
}): Promise<string[]> {
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);
  if (!profile) return [];
  const existing = await db.select({ id: schema.userAchievements.achievementId }).from(schema.userAchievements).where(eq(schema.userAchievements.userId, userId));
  const unlocked = new Set(existing.map(e => e.id));
  const toUnlock: string[] = [];
  const maybe = (id: string, cond: boolean) => { if (cond && !unlocked.has(id)) toUnlock.push(id); };
  maybe("streak_3",  (profile.streakDays ?? 0) >= 3);
  maybe("streak_7",  (profile.streakDays ?? 0) >= 7);
  maybe("streak_14", (profile.streakDays ?? 0) >= 14);
  maybe("streak_30", (profile.streakDays ?? 0) >= 30);
  const q = profile.questionsAnsweredTotal ?? 0;
  maybe("q_10", q>=10); maybe("q_50", q>=50); maybe("q_100", q>=100);
  maybe("q_250", q>=250); maybe("q_500", q>=500); maybe("q_1000", q>=1000);
  if (ctx.isSessionEnd && (ctx.sessionTotal ?? 0) >= 5) {
    const acc = (ctx.sessionCorrect ?? 0) / (ctx.sessionTotal ?? 1);
    maybe("acc_70", acc>=0.70); maybe("acc_80", acc>=0.80); maybe("acc_90", acc>=0.90); maybe("acc_100", acc>=1.00);
  }
  if (ctx.isQotd) {
    maybe("qotd_first", true);
    const [row] = await db.execute(sql`select count(*) as cnt from xp_events where user_id = ${userId} and reason = 'qotd'`);
    maybe("qotd_7", Number((row as any)?.cnt ?? 0) >= 7);
  }
  const [stRow] = await db.execute(sql`select count(distinct q.subtest) as cnt from answers a join questions q on q.id = a.question_id where a.user_id = ${userId}`);
  maybe("all_subtests", Number((stRow as any)?.cnt ?? 0) >= 5);
  if ((profile.questionsAnsweredTotal ?? 0) >= 50) {
    const percentile = await getUserPercentile(userId);
    maybe("top_50", percentile>=50); maybe("top_25", percentile>=75);
    maybe("top_10", percentile>=90); maybe("top_5", percentile>=95); maybe("top_1", percentile>=99);
  }
  if (toUnlock.length > 0) {
    await db.insert(schema.userAchievements).values(toUnlock.map(id => ({ userId, achievementId: id }))).onConflictDoNothing();
    for (const id of toUnlock) {
      const [ach] = await db.select().from(schema.achievements).where(eq(schema.achievements.id, id)).limit(1);
      if (ach?.xpReward) await awardXp(userId, ach.xpReward, "achievement", { achievementId: id });
    }
  }
  return toUnlock;
}

export async function resetWeeklyStatsIfNeeded(userId: string): Promise<void> {
  const [p] = await db.select({ weeklyResetAt: schema.profiles.weeklyResetAt }).from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);
  if (!p) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (new Date().getDay() === 1 && String(p.weeklyResetAt) !== todayStr) {
    await db.update(schema.profiles).set({ weeklyXp: 0, weeklyQuestions: 0, weeklyResetAt: sql`current_date` }).where(eq(schema.profiles.id, userId));
  }
}

export async function getLeaderboard(limit = 50) {
  return db.select({
    username: schema.profiles.username, xp: schema.profiles.xp,
    streakDays: schema.profiles.streakDays, questionsAnsweredTotal: schema.profiles.questionsAnsweredTotal,
    weeklyXp: schema.profiles.weeklyXp,
  }).from(schema.profiles).where(sql`${schema.profiles.username} is not null`).orderBy(sql`${schema.profiles.xp} desc`).limit(limit);
}

export async function getUserPercentile(userId: string): Promise<number> {
  const [result] = await db.execute(sql`
    with target as (select xp, username from profiles where id = ${userId}),
         cohort as (select xp from profiles where username is not null and xp > 0)
    select
      (select username from target) as username,
      (select count(*) from cohort) as cohort_size,
      (select count(*) from cohort where xp < (select xp from target)) as below_count
  `);
  const row = result as any;
  if (!row?.username) return 0;
  const cohortSize = Number(row.cohort_size ?? 0);
  if (cohortSize < 20) return 0;
  const below = Number(row.below_count ?? 0);
  return Math.min(99, Math.round((100 * below) / cohortSize));
}

export async function isFirstAnswerToday(userId: string): Promise<boolean> {
  const [p] = await db.select({ lastPracticeDate: schema.profiles.lastPracticeDate }).from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);
  return p?.lastPracticeDate !== new Date().toISOString().slice(0, 10);
}
