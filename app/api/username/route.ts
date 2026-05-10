import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, sql } from 'drizzle-orm';
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;
const RESERVED = new Set(['admin','support','pracxam','ucat','test','mod','staff']);
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { username } = await req.json();
  if (!username || !USERNAME_RE.test(username))
    return NextResponse.json({ error: 'Username must be 3-20 characters, letters/numbers/_ only.' }, { status: 400 });
  if (RESERVED.has(username.toLowerCase()))
    return NextResponse.json({ error: 'That username is reserved.' }, { status: 400 });
  const [existing] = await db.select({ id: profiles.id }).from(profiles)
    .where(sql`lower(${profiles.username}) = lower(${username})`).limit(1);
  if (existing && existing.id !== user.id)
    return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
  await db.update(profiles).set({ username }).where(eq(profiles.id, user.id));
  return NextResponse.json({ ok: true, username });
}
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [profile] = await db.select({ username: profiles.username })
    .from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return NextResponse.json({ username: profile?.username ?? null });
}
