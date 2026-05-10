import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles, userAchievements, achievements, xpEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getBadgeForPercentile, getUserPercentile } from "@/lib/gamification";
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [percentile, unlockedAchs, recentXp] = await Promise.all([
    getUserPercentile(user.id),
    db.select({ achievement: achievements, unlockedAt: userAchievements.unlockedAt }).from(userAchievements).innerJoin(achievements, eq(achievements.id, userAchievements.achievementId)).where(eq(userAchievements.userId, user.id)).orderBy(desc(userAchievements.unlockedAt)),
    db.select().from(xpEvents).where(eq(xpEvents.userId, user.id)).orderBy(desc(xpEvents.createdAt)).limit(10),
  ]);
  return NextResponse.json({ profile, percentile, badge: getBadgeForPercentile(percentile), achievements: unlockedAchs, recentXp });
}
