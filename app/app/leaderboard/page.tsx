"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PERCENTILE_BADGES, getBadgeForPercentile } from "@/lib/gamification-shared";
type Entry = { username: string; xp: number; streakDays: number; questionsAnsweredTotal: number; weeklyXp: number; };
function Medal({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-2xl">🥇</span>;
  if (pos === 2) return <span className="text-2xl">🥈</span>;
  if (pos === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-[13px] font-bold text-ink-muted font-mono w-6 text-center inline-block">{pos}</span>;
}
export default function LeaderboardPage() {
  const [board, setBoard] = useState<Entry[]>([]);
  const [myProfile, setMyProfile] = useState<Entry | null>(null);
  const [percentile, setPercentile] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all_time" | "weekly">("all_time");
  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.json()).then(d => {
      setBoard(d.board ?? []); setMyProfile(d.myProfile ?? null); setPercentile(d.percentile ?? 0); setLoading(false);
    });
  }, []);
  const sorted = tab === "all_time" ? [...board].sort((a,b) => b.xp - a.xp) : [...board].sort((a,b) => b.weeklyXp - a.weeklyXp);
  const myBadge = getBadgeForPercentile(percentile);
  const myPos = myProfile ? sorted.findIndex(e => e.username === myProfile.username) + 1 : 0;
  return (
    <div className="container-px py-10 max-w-3xl">
      <Link href="/app" className="text-[13px] text-ink-muted hover:text-teal-deep mb-6 inline-block">← Dashboard</Link>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-teal-deep mb-1">Global Rankings</p>
          <h1 className="text-[2rem] font-extrabold tracking-tight text-navy">Leaderboard</h1>
          <p className="text-[14px] text-ink-soft mt-1">Everyone competing globally. No hiding.</p>
        </div>
        {myBadge && (
          <div className="flex flex-col items-center px-6 py-4 rounded-2xl border-2" style={{ borderColor: myBadge.color, background: myBadge.glow + "20" }}>
            <span className="text-3xl mb-1">{myBadge.icon}</span>
            <p className="font-extrabold text-[15px]" style={{ color: myBadge.color }}>{myBadge.label}</p>
            <p className="text-[11px] text-ink-muted">your rank</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        {PERCENTILE_BADGES.map(b => (
          <span key={b.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold border" style={{ borderColor: b.color + "60", background: b.glow + "20", color: b.color }}>{b.icon} {b.label}</span>
        ))}
      </div>
      <div className="flex gap-1 p-1 bg-surface-cool border border-line rounded-xl mb-5 w-fit">
        {[{ key: "all_time", label: "All time XP" }, { key: "weekly", label: "This week" }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${tab === key ? "bg-white shadow-sm text-navy" : "text-ink-muted hover:text-navy"}`}>{label}</button>
        ))}
      </div>
      {myProfile?.username && (
        <div className="rounded-xl p-4 mb-5 flex items-center gap-4" style={{ background: "var(--navy)", color: "white" }}>
          {myBadge && <span className="text-2xl">{myBadge.icon}</span>}
          <div className="flex-1">
            <p className="font-bold text-[15px]">{myProfile.username} <span className="opacity-60 font-normal">(you)</span></p>
            <p className="text-[13px] opacity-70">{myPos > 0 ? `#${myPos} globally` : "Not ranked"} · {myProfile.xp.toLocaleString()} XP · 🔥{myProfile.streakDays}</p>
          </div>
          <p className="font-mono text-[13px] opacity-70">{myProfile.questionsAnsweredTotal} Qs</p>
        </div>
      )}
      {!myProfile?.username && (
        <div className="rounded-xl p-4 mb-5 bg-amber-50 border border-amber-200">
          <p className="text-[14px] text-amber-800 font-medium"><Link href="/app/account" className="underline font-bold">Set a username</Link> in Account to appear on the global leaderboard.</p>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-teal-deep border-t-transparent rounded-full animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16"><p className="text-4xl mb-4">🏆</p><p className="text-ink-soft">Be the first — set your username and start practising!</p></div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[44px_1fr_90px_70px_70px] gap-3 px-5 py-3 bg-surface-cool border-b border-line">
            <div /><p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Player</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted text-right">{tab === "all_time" ? "XP" : "Week XP"}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted text-right">Streak</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted text-right">Qs</p>
          </div>
          {sorted.map((entry, i) => {
            const entryBadge = getBadgeForPercentile(Math.round(((sorted.length - i) / sorted.length) * 100));
            const isMe = entry.username === myProfile?.username;
            return (
              <div key={entry.username} className={`grid grid-cols-[44px_1fr_90px_70px_70px] gap-3 px-5 py-3.5 border-b border-line last:border-0 transition-colors ${isMe ? "bg-teal-50" : "hover:bg-surface-cool"}`}>
                <div className="flex items-center justify-center"><Medal pos={i + 1} /></div>
                <div className="flex items-center gap-2 min-w-0">
                  {entryBadge && <span className="flex-shrink-0 text-base">{entryBadge.icon}</span>}
                  <div className="min-w-0">
                    <p className={`font-bold text-[14px] truncate ${isMe ? "text-teal-deep" : "text-navy"}`}>{entry.username}{isMe ? " (you)" : ""}</p>
                    {entryBadge && <p className="text-[11px] font-semibold" style={{ color: entryBadge.color }}>{entryBadge.label}</p>}
                  </div>
                </div>
                <p className="text-right font-mono font-bold text-[14px] text-navy self-center">{(tab === "all_time" ? entry.xp : entry.weeklyXp).toLocaleString()}</p>
                <p className="text-right text-[13px] self-center">{entry.streakDays > 0 ? `${entry.streakDays}🔥` : "—"}</p>
                <p className="text-right font-mono text-[13px] text-ink-muted self-center">{entry.questionsAnsweredTotal}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

