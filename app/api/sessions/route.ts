import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const subtest: string = body.subtest;
    const questionIds: string[] = body.questionIds;

    if (!subtest || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const [row] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        subtest,
        questionIds,
        currentIndex: 0,
      })
      .returning({ id: sessions.id });

    return NextResponse.json({ id: row.id });
  } catch (err) {
    console.error('[api/sessions] error:', err);
    return NextResponse.json({ error: 'Could not create session' }, { status: 500 });
  }
}
