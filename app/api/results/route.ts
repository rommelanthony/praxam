import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { answers, questions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  // All answers for this session by this user
  const sessionAnswers = await db
    .select()
    .from(answers)
    .where(and(eq(answers.sessionId, sessionId), eq(answers.userId, user.id)))
    .orderBy(answers.createdAt);

  if (!sessionAnswers.length) {
    return NextResponse.json({ error: 'No answers found' }, { status: 404 });
  }

  // Fetch question data
  const questionIds = sessionAnswers.map((a) => a.questionId);
  const questionData = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, questionIds));

  const questionMap = Object.fromEntries(questionData.map((q) => [q.id, q]));

  const results = sessionAnswers.map((a) => ({
    answer: a,
    question: questionMap[a.questionId] ?? null,
  }));

  const correct = sessionAnswers.filter((a) => a.isCorrect).length;
  const totalMs = sessionAnswers.reduce((sum, a) => sum + (a.timeTakenMs ?? 0), 0);

  return NextResponse.json({
    sessionId,
    results,
    summary: {
      correct,
      total: sessionAnswers.length,
      totalMs,
      subtest: questionData[0]?.subtest ?? '',
    },
  });
}
