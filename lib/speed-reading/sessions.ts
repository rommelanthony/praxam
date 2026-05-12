// Server-side accessors for the speed_reading_sessions table.
// All callers should be inside the auth-gated /app/* tree so userId is trusted.
// Note: the "Session saved" toast in spec sect 4.3 fires from the client component
// that awaits a server action wrapping logSession, not from this module —
// fireToast lives in the client bundle.
import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { speedReadingSessions, type SpeedReadingSession } from '@/db/schema';
import type { SessionDrill } from '@/lib/speed-reading/types';

export async function logSession(input: {
  userId: string;
  drill: SessionDrill;
  wpm?: number;
  comprehensionPct?: number;
  passageId?: string;
  meta?: Record<string, unknown>;
  elapsedSec?: number;
}): Promise<void> {
  await db.insert(speedReadingSessions).values({
    userId: input.userId,
    drill: input.drill,
    wpm: input.wpm ?? null,
    comprehensionPct: input.comprehensionPct ?? null,
    passageId: input.passageId ?? null,
    meta: input.meta ?? {},
    // elapsedSec is numeric(6,2) in Postgres; Drizzle exchanges numeric as string.
    elapsedSec: input.elapsedSec != null ? input.elapsedSec.toFixed(2) : null,
  });
}

// Earliest baseline row for the user, or null if they haven't taken one yet.
// The Speed Reading shell uses this to force the Baseline tab on first visit.
export async function getBaseline(userId: string): Promise<SpeedReadingSession | null> {
  const [row] = await db
    .select()
    .from(speedReadingSessions)
    .where(
      and(
        eq(speedReadingSessions.userId, userId),
        eq(speedReadingSessions.drill, 'baseline')
      )
    )
    .orderBy(asc(speedReadingSessions.createdAt))
    .limit(1);
  return row ?? null;
}

// Most recent sessions, newest first. Used by the Progress screen and the
// Overview's "latest session" hero stat. Default limit matches answers-table
// recency window used elsewhere in the app.
export async function getHistory(
  userId: string,
  opts?: { limit?: number; drill?: SessionDrill }
): Promise<SpeedReadingSession[]> {
  const conditions = [eq(speedReadingSessions.userId, userId)];
  if (opts?.drill) conditions.push(eq(speedReadingSessions.drill, opts.drill));
  return await db
    .select()
    .from(speedReadingSessions)
    .where(and(...conditions))
    .orderBy(desc(speedReadingSessions.createdAt))
    .limit(opts?.limit ?? 50);
}
