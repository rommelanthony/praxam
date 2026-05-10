import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers, sessions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    let sessionId: string = body.sessionId;
    if (body.isQotd || !sessionId) {
      const [row] = await db
        .insert(sessions)
        .values({
          userId: user.id,
          subtest: body.subtest ?? 'qotd',
          questionIds: [body.questionId],
          currentIndex: 0,
        })
        .returning({ id: sessions.id });
      sessionId = row.id;
    }

    await db.insert(answers).values({
      questionId: body.questionId,
      userId: user.id,
      sessionId,
      pickedLetter: body.pickedLetter,
      isCorrect: body.isCorrect,
      timeTakenMs: body.timeTakenMs,
    });

    return NextResponse.json({ ok: true, xpAwarded: 0, newAchievements: [] });
  } catch (err) {
    console.error('[api/answers] error:', err);
    return NextResponse.json(
      { error: 'Internal error', xpAwarded: 0, newAchievements: [] },
      { status: 500 },
    );
  }
}
