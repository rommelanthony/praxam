import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

const REGIONS = new Set(['ANZ', 'UK']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Updates = {
  ucatRegion?: 'ANZ' | 'UK' | null;
  ucatTestDate?: string | null;
};

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Updates = {};

  if ('ucatRegion' in body) {
    let r = body.ucatRegion;
    if (r === '') r = null;
    if (r === null) {
      updates.ucatRegion = null;
    } else if (typeof r === 'string' && REGIONS.has(r)) {
      updates.ucatRegion = r as 'ANZ' | 'UK';
    } else {
      return NextResponse.json({ error: 'ucatRegion must be "ANZ", "UK", or null.' }, { status: 400 });
    }
  }

  if ('ucatTestDate' in body) {
    const d = body.ucatTestDate;
    if (d === null || d === '') {
      updates.ucatTestDate = null;
    } else if (typeof d === 'string' && DATE_RE.test(d) && !Number.isNaN(Date.parse(d))) {
      updates.ucatTestDate = d;
    } else {
      return NextResponse.json({ error: 'ucatTestDate must be a YYYY-MM-DD date or null.' }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const [updated] = await db
    .update(profiles)
    .set(updates)
    .where(eq(profiles.id, user.id))
    .returning();

  return NextResponse.json({ profile: updated });
}
