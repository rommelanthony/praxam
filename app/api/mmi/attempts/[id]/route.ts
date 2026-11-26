// GET /api/mmi/attempts/:id — feedback status for the results page (polling).
// PATCH /api/mmi/attempts/:id — mark the attempt complete.
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { currentUser, getAttemptResponses, getOwnedAttempt } from '@/lib/mmi/server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const attempt = await getOwnedAttempt(id, user.id);
  if (!attempt) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const responses = await getAttemptResponses(id);
  return NextResponse.json({
    responses: responses.map((r) => ({ id: r.id, aiStatus: r.aiStatus, aiFeedback: r.aiFeedback })),
  });
}

export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const attempt = await getOwnedAttempt(id, user.id);
  if (!attempt) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await db.update(schema.mmiAttempts).set({ completedAt: new Date() }).where(eq(schema.mmiAttempts.id, id));
  return NextResponse.json({ ok: true });
}
