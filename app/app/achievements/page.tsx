import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
export const metadata = { title: "Achievements — PracXAM" };
export const dynamic = "force-dynamic";
const CATEGORY_LABELS: Record<string, string> = { streak: "🔥 Streaks", questions: "📚 Questions", accuracy: "🎯 Accuracy", speed: "⚡ Speed", mock: "📋 Mock Exam", rank: "🏆 Rank Badges", special: "⭐ Special" };
export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const allAchs = await db.select().from(schema.achievements).orderBy(schema.achievements.category);
  const userAchs = await db.select({ id: schema.userAchievements.achievementId, at: schema.userAchievements.unlockedAt }).from(schema.userAchievements).where(eq(schema.userAchievements.userId, user.id));
  const unlockedMap = new Map(userAchs.map(u => [u.id, u.at]));
  const totalXpEarned = allAchs.filter(a => unlockedMap.has(a.id)).reduce((s,a) => s + a.xpReward, 0);
  const categories = Object.keys(CATEGORY_LABELS);
  const grouped = Object.fromEntries(categories.map(cat => [cat, allAchs.filter(a => a.category === cat)]));
  return (
    <div className="container-px py-10 max-w-4xl">
      <Link href="/app" className="text-[13px] text-ink-muted hover:text-teal-deep mb-6 inline-block">← Dashboard</Link>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-teal-deep mb-1">Badges</p>
          <h1 className="text-[2rem] font-extrabold tracking-tight text-navy">Achievements</h1>
          <p className="text-ink-soft mt-1">{unlockedMap.size} of {allAchs.length} unlocked · {totalXpEarned.toLocaleString()} XP earned</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16">
            <svg className="-rotate-90 w-full h-full" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#DCE3EC" strokeWidth="7" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--teal)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(unlockedMap.size / allAchs.length) * 163} 163`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-[13px] font-extrabold text-navy">{Math.round((unlockedMap.size / allAchs.length) * 100)}%</span></div>
          </div>
          <div><p className="font-bold text-navy">{unlockedMap.size}/{allAchs.length}</p><p className="text-[12px] text-ink-muted">completed</p></div>
        </div>
      </div>
      <div className="flex flex-col gap-10">
        {categories.map(cat => {
          const achs = grouped[cat] ?? [];
          if (achs.length === 0) return null;
          const catUnlocked = achs.filter(a => unlockedMap.has(a.id)).length;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[1rem] font-extrabold text-navy">{CATEGORY_LABELS[cat]}</h2>
                <span className="text-[12px] text-ink-muted">{catUnlocked}/{achs.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {achs.map(ach => {
                  const unlockedAt = unlockedMap.get(ach.id);
                  const isUnlocked = !!unlockedAt;
                  return (
                    <div key={ach.id} className={`rounded-xl p-5 border transition-all ${isUnlocked ? "bg-surface border-teal-soft shadow-sm" : "bg-surface-cool border-line opacity-60"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`text-3xl ${!isUnlocked ? "grayscale" : ""}`}>{isUnlocked ? ach.icon : "🔒"}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-[14px] ${isUnlocked ? "text-navy" : "text-ink-muted"}`}>{ach.name}</p>
                          <p className="text-[12px] text-ink-muted leading-snug mt-0.5">{ach.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] font-bold text-teal-deep font-mono">+{ach.xpReward} XP</span>
                            {isUnlocked && unlockedAt && <span className="text-[11px] text-ink-muted">· {new Date(unlockedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
