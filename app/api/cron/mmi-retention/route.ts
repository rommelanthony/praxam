// GET /api/cron/mmi-retention: deletes MMI recordings older than
// MMI_RETENTION_DAYS (default 30). Run daily by Vercel Cron (vercel.json).
// Transcripts, feedback and marks are kept; only the media file goes.
import { NextRequest, NextResponse } from 'next/server';
import { and, inArray, isNotNull, lt } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { db, schema } from '@/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const BATCH = 500;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'not_configured' }, { status: 500 });

  const days = Math.max(1, Number(process.env.MMI_RETENTION_DAYS) || 30);
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({ id: schema.mmiResponses.id, path: schema.mmiResponses.mediaPath })
    .from(schema.mmiResponses)
    .where(and(isNotNull(schema.mmiResponses.mediaPath), lt(schema.mmiResponses.createdAt, cutoff)))
    .limit(BATCH);
  if (!rows.length) return NextResponse.json({ deleted: 0, days });

  const storage = createClient(url, serviceKey, { auth: { persistSession: false } }).storage.from('mmi-recordings');
  const done: string[] = [];
  let failed = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await storage.remove(chunk.map((r) => r.path!));
    if (error) failed += chunk.length;
    else done.push(...chunk.map((r) => r.id));
  }
  if (done.length) {
    await db.update(schema.mmiResponses).set({ mediaPath: null, mediaBytes: null }).where(inArray(schema.mmiResponses.id, done));
  }
  return NextResponse.json({ deleted: done.length, failed, days, more: rows.length === BATCH });
}
