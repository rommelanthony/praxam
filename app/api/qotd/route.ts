import { NextResponse } from "next/server";
import { db } from "@/db";
import { qotd, questions, profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let [today] = await db.select().from(qotd).where(eq(qotd.date, sql`current_date`)).limit(1);
  if (!today) {
    const [q] = await db.select({ id: questions.id }).from(questions).where(sql`${questions.isFree} = true and ${questions.correctAnswer} is not null`).orderBy(sql`random()`).limit(1);
    if (q) { await db.insert(qotd).values({ date: new Date().toISOString().slice(0,10), questionId: q.id }).onConflictDoNothing(); today = { date: new Date().toISOString().slice(0,10), questionId: q.id }; }
  }
  if (!today) return NextResponse.json({ question: null });
  const [question] = await db.select().from(questions).where(eq(questions.id, today.questionId)).limit(1);
  const [profile] = await db.select({ qotdLastCompleted: profiles.qotdLastCompleted }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const completedToday = String(profile?.qotdLastCompleted) === new Date().toISOString().slice(0,10);
  return NextResponse.json({ question, completedToday });
}
