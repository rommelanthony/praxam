import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { excludeHiddenFlags } from '@/lib/questions/filters';
import { hydratePassages } from '@/lib/questions/passages';

export async function GET(req: NextRequest) {
  const subtest = req.nextUrl.searchParams.get('subtest');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20');

  if (!subtest) {
    return NextResponse.json({ error: 'subtest required' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(questions)
    .where(
      sql`${questions.subtest} = ${subtest} AND ${excludeHiddenFlags(questions.flags)}`
    )
    .orderBy(sql`random()`)
    .limit(limit);

  const resolved = await hydratePassages(rows);

  return NextResponse.json({ questions: resolved });
}
