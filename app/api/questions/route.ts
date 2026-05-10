import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { sql } from 'drizzle-orm';

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
      sql`${questions.subtest} = ${subtest}
        AND NOT (
          COALESCE(${questions.flags}, '[]'::jsonb) @> '["needs_asset"]'::jsonb
          OR COALESCE(${questions.flags}, '[]'::jsonb) @> '["needs_passage"]'::jsonb
        )`
    )
    .orderBy(sql`random()`)
    .limit(limit);

  return NextResponse.json({ questions: rows });
}
