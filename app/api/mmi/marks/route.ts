// POST /api/mmi/marks — save the user's own rubric marks for a response.
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { currentUser } from '@/lib/mmi/server';
import { getStation } from '@/lib/mmi/content';

export async function POST(req: NextRequest) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { responseId?: string; scores?: Record<string, unknown>; comment?: unknown };
  if (!b.responseId || !/^[0-9a-f-]{36}$/i.test(b.responseId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const [row] = await db
    .select({ r: schema.mmiResponses, edition: schema.mmiAttempts.edition })
    .from(schema.mmiResponses)
    .innerJoin(schema.mmiAttempts, eq(schema.mmiAttempts.id, schema.mmiResponses.attemptId))
    .where(and(eq(schema.mmiResponses.id, b.responseId), eq(schema.mmiResponses.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const allowed = new Set(getStation(row.edition, row.r.stationId)?.attributes ?? []);
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(b.scores ?? {})) {
    const n = Math.round(Number(v));
    if (allowed.has(k as never) && n >= 1 && n <= 5) scores[k] = n;
  }
  const comment = typeof b.comment === 'string' ? b.comment.slice(0, 2000) : null;

  await db
    .insert(schema.mmiMarks)
    .values({ responseId: row.r.id, markerId: user.id, markerType: 'self', scores, comment })
    .onConflictDoUpdate({
      target: [schema.mmiMarks.responseId, schema.mmiMarks.markerId, schema.mmiMarks.markerType],
      set: { scores, comment, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true, scores });
}
