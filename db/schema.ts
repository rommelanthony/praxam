// Database schema. Source of truth for the Postgres tables.
// Drizzle infers TypeScript types from these definitions.
import { pgTable, text, integer, jsonb, timestamp, uuid, boolean, date, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// User profile, extending the Supabase auth.users table.
// Created automatically via a trigger when a user signs up (see migration 0001).
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().notNull(),
  email: text('email').notNull(),
  plan: text('plan', { enum: ['free', 'pro'] }).notNull().default('free'),
  questionsAnsweredTotal: integer('questions_answered_total').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  lastPracticeDate: date('last_practice_date'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  ucatRegion: text('ucat_region', { enum: ['ANZ', 'UK'] }),
  ucatTestDate: date('ucat_test_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Gamification fields
  xp: integer('xp').notNull().default(0),
  username: text('username'),
  weeklyXp: integer('weekly_xp').notNull().default(0),
  weeklyQuestions: integer('weekly_questions').notNull().default(0),
  weeklyGoal: integer('weekly_goal').notNull().default(50),
  weeklyResetAt: date('weekly_reset_at'),
  longestStreak: integer('longest_streak').notNull().default(0),
  qotdLastCompleted: date('qotd_last_completed'),
});

// The master question bank.
export const questions = pgTable('questions', {
  id: text('id').primaryKey().notNull(),
  subtest: text('subtest', {
    enum: ['verbal_reasoning', 'decision_making', 'quantitative_reasoning', 'abstract_reasoning', 'situational_judgement'],
  }).notNull(),
  topic: text('topic'),
  difficulty: text('difficulty'),
  passage: text('passage'),
  passageTitle: text('passage_title'),
  passageId: text('passage_id'),
  stem: text('stem').notNull(),
  choices: jsonb('choices').$type<Array<{ label: string; text: string }>>().notNull(),
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  groupExplanation: text('group_explanation'),
  imageRefs: jsonb('image_refs').$type<string[]>().default(sql`'[]'::jsonb`),
  imageRoles: jsonb('image_roles').$type<Record<string, string>>().default(sql`'{}'::jsonb`),
  source: jsonb('source').$type<{ book: string; bookTitle: string; originalNumber: string }>(),
  flags: jsonb('flags').$type<string[]>().default(sql`'[]'::jsonb`),
  // First N questions per subtest are free; the rest gated to Pro.
  // Set during seeding.
  isFree: boolean('is_free').notNull().default(false),
});

// A practice session (a sitting at the desk). One row per session start.
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  subtest: text('subtest').notNull(),
  questionIds: text('question_ids').array().notNull(),
  currentIndex: integer('current_index').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

// Individual answer records — one row per question attempt.
export const answers = pgTable('answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  questionId: text('question_id').notNull(),
  userId: uuid('user_id').notNull(),
  pickedLetter: text('picked_letter'),
  isCorrect: boolean('is_correct'),
  timeTakenMs: integer('time_taken_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Question of the Day — one row per calendar date.
export const qotd = pgTable('qotd', {
  date: date('date').primaryKey().notNull(),
  questionId: text('question_id').notNull().references(() => questions.id),
});

// Achievement definitions (static, seeded).
export const achievements = pgTable('achievements', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  xpReward: integer('xp_reward').notNull().default(0),
  category: text('category').notNull(),
});

// Per-user achievement unlocks.
export const userAchievements = pgTable('user_achievements', {
  userId: uuid('user_id').notNull(),
  achievementId: text('achievement_id').notNull().references(() => achievements.id),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.achievementId] }),
}));

// XP event log — every XP grant gets a row.
export const xpEvents = pgTable('xp_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Speed Reading Tutor session log — append-only record of completed drills.
// One row per drill completion (baseline, pacer, chunking, scan, qualifier,
// triage, passage). RLS restricts each row to its owner; no UPDATE/DELETE
// policies exist on the underlying table (see db/migrations/0002).
export const speedReadingSessions = pgTable('speed_reading_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  drill: text('drill', {
    enum: ['baseline', 'pacer', 'chunking', 'scan', 'qualifier', 'triage', 'passage'],
  }).notNull(),
  wpm: integer('wpm'),
  comprehensionPct: integer('comprehension_pct'),
  passageId: text('passage_id'),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  elapsedSec: text('elapsed_sec'), // numeric(6,2); Drizzle returns numeric as string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Daily/timed challenges — one row per attempt.
export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  subtest: text('subtest').notNull(),
  questionIds: text('question_ids').array().notNull(),
  answers: jsonb('answers').$type<Array<{ questionId: string; pickedLetter: string | null; isCorrect: boolean | null }>>().default(sql`'[]'::jsonb`),
  score: integer('score'),
  timeTakenMs: integer('time_taken_ms'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// MMI practice (see db/migrations/0003_mmi.sql). Station content lives in
// lib/mmi/data/*.json; these tables hold attempts, responses and marks.
export type MmiFeedback = {
  scores: Record<string, number>;
  band: 'Strong' | 'Competent' | 'Developing' | 'Limited';
  summary: string;
  strengths: string[];
  improvements: Array<{ issue: string; quote: string; tryInstead: string }>;
  missed: string[];
  outline: string[];
  model?: string;
  error?: string;
};

export const mmiAttempts = pgTable('mmi_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  edition: text('edition', { enum: ['nz', 'au'] }).notNull(),
  preset: text('preset').notNull(),
  kind: text('kind', { enum: ['mock', 'single'] }).notNull(),
  stationIds: text('station_ids').array().notNull(),
  recordMode: text('record_mode', { enum: ['video', 'audio', 'none'] }).notNull().default('video'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const mmiResponses = pgTable('mmi_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id').notNull().references(() => mmiAttempts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  stationId: text('station_id').notNull(),
  position: integer('position').notNull(),
  mediaPath: text('media_path'),
  mediaKind: text('media_kind', { enum: ['video', 'audio'] }),
  mime: text('mime'),
  mediaBytes: integer('media_bytes'),
  durationS: integer('duration_s'),
  allowedS: integer('allowed_s').notNull(),
  transcript: text('transcript'),
  wordCount: integer('word_count').notNull().default(0),
  notes: text('notes'),
  answerMode: text('answer_mode', { enum: ['speak', 'type'] }).notNull(),
  aiStatus: text('ai_status', { enum: ['pending', 'done', 'error', 'skipped'] }).notNull().default('pending'),
  aiFeedback: jsonb('ai_feedback').$type<MmiFeedback>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mmiMarks = pgTable('mmi_marks', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => mmiResponses.id, { onDelete: 'cascade' }),
  markerId: uuid('marker_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  markerType: text('marker_type', { enum: ['self', 'peer', 'teacher'] }).notNull(),
  scores: jsonb('scores').$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
  comment: text('comment'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type Qotd = typeof qotd.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type XpEvent = typeof xpEvents.$inferSelect;
export type NewXpEvent = typeof xpEvents.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type SpeedReadingSession = typeof speedReadingSessions.$inferSelect;
export type NewSpeedReadingSession = typeof speedReadingSessions.$inferInsert;
export type MmiAttempt = typeof mmiAttempts.$inferSelect;
export type MmiResponse = typeof mmiResponses.$inferSelect;
export type MmiMark = typeof mmiMarks.$inferSelect;
