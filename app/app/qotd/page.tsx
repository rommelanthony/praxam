"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Question } from "@/db/schema";
import { XP } from "@/lib/gamification-shared";
import ChartPassage from "@/components/practice/ChartPassage";
export default function QotdPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [newAchs, setNewAchs] = useState<string[]>([]);
  const startMs = useRef(Date.now());
  useEffect(() => { fetch("/api/qotd").then(r => r.json()).then(d => { setQuestion(d.question); setCompletedToday(d.completedToday); setLoading(false); }); }, []);
  async function pick(letter: string) {
    if (picked || !question) return;
    const isCorrect = letter === question.correctAnswer;
    setPicked(letter);
    const res = await fetch("/api/answers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, sessionId: crypto.randomUUID(), pickedLetter: letter, isCorrect, timeTakenMs: Date.now() - startMs.current, subtest: question.subtest, isQotd: true }) });
    const data = await res.json();
    setXpEarned(data.xpAwarded ?? 0); setNewAchs(data.newAchievements ?? []); setRevealed(true);
  }
  if (loading) return <div className="container-px py-16 flex justify-center"><div className="w-8 h-8 border-4 border-teal-deep border-t-transparent rounded-full animate-spin" /></div>;
  if (!question) return <div className="container-px py-16 text-center"><p className="text-4xl mb-4">☀️</p><p className="text-ink-soft">No question today. Check back soon!</p><Link href="/app" className="text-teal-deep underline text-sm mt-4 inline-block">← Dashboard</Link></div>;
  const choices = question.choices as Array<{ label: string; text: string }>;
  const isCorrect = picked === question.correctAnswer;
  return (
    <div className="container-px py-10 max-w-2xl">
      <Link href="/app" className="text-[13px] text-ink-muted hover:text-teal-deep mb-6 inline-block">← Dashboard</Link>
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: "linear-gradient(135deg, #1B9D9D 0%, #0F2D4F 100%)" }}>
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-[1.5rem] font-extrabold mb-1">☀️ Question of the Day</h1>
        <p className="opacity-75 text-[14px]">Answer correctly for <strong>+{XP.QOTD} XP</strong> bonus</p>
      </div>
      {completedToday && !revealed ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">✅</p><p className="text-[1.1rem] font-bold text-green-800 mb-2">Already completed today!</p>
          <p className="text-[14px] text-green-700 mb-6">Come back tomorrow for a new question.</p>
          <Link href="/app/practice" className="btn btn-teal text-[14px]">Keep practising →</Link>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl p-7">
          {question.passage && (<div className="bg-surface-cool border border-line rounded-xl p-5 mb-6 text-[15px] text-ink leading-relaxed">{question.passageTitle && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">{question.passageTitle}</p>}<ChartPassage passage={question.passage} /></div>)}
          <p className="text-[17px] font-semibold text-navy leading-snug mb-6">{question.stem}</p>
          <div className="flex flex-col gap-2.5 mb-6">
            {choices.map(c => {
              const isCor = c.label === question.correctAnswer;
              const isPicked = c.label === picked;
              let cls = "flex items-start gap-3 p-4 rounded-xl border text-[15px] text-left transition-all ";
              if (!picked) cls += "border-line bg-surface hover:border-teal-deep hover:shadow-sm cursor-pointer";
              else if (revealed && isCor) cls += "border-green-400 bg-green-50 text-green-900";
              else if (revealed && isPicked) cls += "border-red-400 bg-red-50 text-red-900";
              else if (isPicked) cls += "border-navy bg-navy/5";
              else cls += "border-line bg-surface opacity-40";
              return (
                <button key={c.label} onClick={() => pick(c.label)} disabled={!!picked} className={cls}>
                  <span className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center text-[12px] font-bold mt-0.5 ${revealed && isCor ? "border-green-500 bg-green-500 text-white" : revealed && isPicked && !isCor ? "border-red-500 bg-red-500 text-white" : isPicked ? "border-navy bg-navy text-white" : "border-current"}`}>{c.label}</span>
                  <span>{c.text}</span>
                </button>
              );
            })}
          </div>
          {revealed && (
            <div className={`rounded-xl p-5 mb-5 ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{isCorrect ? "🎉" : "😔"}</span>
                <p className={`font-extrabold text-[16px] ${isCorrect ? "text-green-800" : "text-red-800"}`}>{isCorrect ? "Correct!" : "Not quite"}</p>
                <span className="ml-auto font-bold text-teal-deep font-mono">+{xpEarned} XP</span>
              </div>
              {question.explanation && <div className={`text-[13px] ${isCorrect ? "text-green-900" : "text-red-900"}`}><ReactMarkdown>{question.explanation}</ReactMarkdown></div>}
              {newAchs.length > 0 && <div className="mt-3 pt-3 border-t border-current/10"><p className="text-[12px] font-bold uppercase tracking-wider mb-1 opacity-70">🏆 Achievement unlocked!</p>{newAchs.map(id => <p key={id} className="text-[13px] font-semibold">{id}</p>)}</div>}
            </div>
          )}
          {revealed && (
            <div className="flex gap-3">
              <Link href="/app/practice" className="flex-1 btn btn-teal justify-center">Keep practising →</Link>
              <Link href="/app" className="flex-1 btn btn-ghost border border-line justify-center">Dashboard</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

