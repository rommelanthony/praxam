import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getUserPercentile } from "@/lib/gamification";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [board, percentile] = await Promise.all([getLeaderboard(50), getUserPercentile(user.id)]);
  const [myProfile] = await db.select({ username: profiles.username, xp: profiles.xp, streakDays: profiles.streakDays, questionsAnsweredTotal: profiles.questionsAnsweredTotal, weeklyXp: profiles.weeklyXp }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return NextResponse.json({ board, percentile, myProfile });
}
