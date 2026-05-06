import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  await db.insert(answers).values({
    questionId: body.questionId,
    userId: user.id,
    sessionId: body.sessionId ?? crypto.randomUUID(),
    pickedLetter: body.pickedLetter,
    isCorrect: body.isCorrect,
    timeTakenMs: body.timeTakenMs,
  });

  return NextResponse.json({ ok: true });
}
