// Shared server helpers for the MMI API routes and pages.
import 'server-only';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { createClient } from '@/lib/supabase/server';

export async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getOwnedAttempt(attemptId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return null;
  const [a] = await db
    .select()
    .from(schema.mmiAttempts)
    .where(and(eq(schema.mmiAttempts.id, attemptId), eq(schema.mmiAttempts.userId, userId)))
    .limit(1);
  return a ?? null;
}

export async function getAttemptResponses(attemptId: string) {
  return db
    .select()
    .from(schema.mmiResponses)
    .where(eq(schema.mmiResponses.attemptId, attemptId))
    .orderBy(schema.mmiResponses.position);
}

export async function getSelfMarks(responseIds: string[], userId: string) {
  if (!responseIds.length) return [];
  return db
    .select()
    .from(schema.mmiMarks)
    .where(and(inArray(schema.mmiMarks.responseId, responseIds), eq(schema.mmiMarks.markerId, userId), eq(schema.mmiMarks.markerType, 'self')));
}

export async function getSeenStationIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ stationId: schema.mmiResponses.stationId })
    .from(schema.mmiResponses)
    .where(eq(schema.mmiResponses.userId, userId));
  return new Set(rows.map((r) => r.stationId));
}

export async function getRecentAttempts(userId: string, limit = 10) {
  return db
    .select()
    .from(schema.mmiAttempts)
    .where(eq(schema.mmiAttempts.userId, userId))
    .orderBy(desc(schema.mmiAttempts.startedAt))
    .limit(limit);
}
