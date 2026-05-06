import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const subtest = req.nextUrl.searchParams.get('subtest');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20');

  if (!subtest) {
    return NextResponse.json({ error: 'subtest required' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.subtest, subtest as any))
    .orderBy(sql`random()`)
    .limit(limit);

  return NextResponse.json({ questions: rows });
}
