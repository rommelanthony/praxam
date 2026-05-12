import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { and, inArray, isNotNull, sql } from 'drizzle-orm';

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
          COALESCE(${questions.flags}, '[]'::jsonb) ?| array[
            'needs_asset',
            'needs_passage',
            'requires_image',
            'needs_image',
            'needs_review',
            'yes_no_format',
            'most_least_format',
            'passage_mismatch'
          ]
        )`
    )
    .orderBy(sql`random()`)
    .limit(limit);

  const orphanPassageIds = Array.from(
    new Set(
      rows
        .filter((r) => r.passage == null && r.passageId != null)
        .map((r) => r.passageId as string)
    )
  );

  let resolved = rows;
  if (orphanPassageIds.length > 0) {
    const anchors = await db
      .select({ passageId: questions.passageId, passage: questions.passage })
      .from(questions)
      .where(and(inArray(questions.passageId, orphanPassageIds), isNotNull(questions.passage)));

    const lookup = new Map<string, string>();
    for (const a of anchors) {
      if (a.passageId == null || a.passage == null) continue;
      if (lookup.has(a.passageId)) {
        console.warn(
          `[api/questions] multiple non-null passages for passage_id=${a.passageId}; keeping first`
        );
        continue;
      }
      lookup.set(a.passageId, a.passage);
    }

    resolved = rows.map((r) =>
      r.passage == null && r.passageId != null
        ? { ...r, passage: lookup.get(r.passageId) ?? null }
        : r
    );
  }

  return NextResponse.json({ questions: resolved });
}
