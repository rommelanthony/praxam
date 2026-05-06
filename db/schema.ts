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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
