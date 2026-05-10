// Client-safe gamification constants
export const PERCENTILE_BADGES = [
  { id: "top_1",  label: "Top 1%",  threshold: 99, icon: "👑", color: "#dc2626", glow: "#fca5a5" },
  { id: "top_5",  label: "Top 5%",  threshold: 95, icon: "🔥", color: "#d97706", glow: "#fcd34d" },
  { id: "top_10", label: "Top 10%", threshold: 90, icon: "💫", color: "#7c3aed", glow: "#c4b5fd" },
  { id: "top_25", label: "Top 25%", threshold: 75, icon: "🌟", color: "#2563eb", glow: "#93c5fd" },
  { id: "top_50", label: "Top 50%", threshold: 50, icon: "⭐",     color: "#059669", glow: "#6ee7b7" },
] as const;
export type PercentileBadge = typeof PERCENTILE_BADGES[number];
export function getBadgeForPercentile(percentile: number): PercentileBadge | null {
  for (const badge of PERCENTILE_BADGES) { if (percentile >= badge.threshold) return badge; }
  return null;
}
export const XP = { ANSWER: 10, CORRECT_BONUS: 15, STREAK_BONUS: 25, SPEED_BONUS_MAX: 20, MOCK_COMPLETE: 200, QOTD: 75 } as const;
const SUBTEST_AVG_MS: Record<string, number> = { verbal_reasoning: 28000, decision_making: 64000, quantitative_reasoning: 40000, abstract_reasoning: 16000, situational_judgement: 23000 };
export function calcSpeedBonus(timeTakenMs: number, subtest: string): number {
  const avg = SUBTEST_AVG_MS[subtest] ?? 30000;
  const ratio = timeTakenMs / avg;
  if (ratio >= 0.5) return 0;
  return Math.round(20 * (1 - ratio / 0.5));
}
