// POST /api/mmi/feedback — generate AI feedback for one saved response.
// Fired by the runner after each station; idempotent.
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { currentUser } from '@/lib/mmi/server';
import { getBank, getStation } from '@/lib/mmi/content';
import { generateFeedback } from '@/lib/mmi/feedback';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { responseId } = (await req.json().catch(() => ({}))) as { responseId?: string };
  if (!responseId || !/^[0-9a-f-]{36}$/i.test(responseId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const [row] = await db
    .select({ r: schema.mmiResponses, edition: schema.mmiAttempts.edition })
    .from(schema.mmiResponses)
    .innerJoin(schema.mmiAttempts, eq(schema.mmiAttempts.id, schema.mmiResponses.attemptId))
    .where(and(eq(schema.mmiResponses.id, responseId), eq(schema.mmiResponses.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const r = row.r;
  if (r.aiStatus === 'done') return NextResponse.json({ status: 'done' });

  const set = (aiStatus: 'done' | 'error' | 'skipped', aiFeedback: schema.MmiFeedback | null) =>
    db.update(schema.mmiResponses).set({ aiStatus, aiFeedback }).where(eq(schema.mmiResponses.id, r.id));

  // Too little to mark (e.g. no transcript in browsers without speech recognition).
  if (r.wordCount < 12) {
    await set('skipped', null);
    return NextResponse.json({ status: 'skipped' });
  }
  const station = getStation(row.edition, r.stationId);
  if (!station) {
    await set('error', null);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
  try {
    const fb = await generateFeedback(getBank(row.edition, { staging: true }), station, {
      transcript: r.transcript ?? '',
      durationS: r.durationS ?? 0,
      allowedS: r.allowedS,
      answerMode: r.answerMode,
    });
    await set('done', fb);
    return NextResponse.json({ status: 'done' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    await set('error', { scores: {}, band: 'Limited', summary: '', strengths: [], improvements: [], missed: [], outline: [], error: msg });
    return NextResponse.json({ status: 'error', error: msg }, { status: 502 });
  }
}
