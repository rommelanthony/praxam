"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Question } from "@/db/schema";
const SUBTESTS = [{ key: "verbal_reasoning", label: "Verbal Reasoning", seconds: 280, icon: "📖" }, { key: "decision_making", label: "Decision Making", seconds: 640, icon: "🧩" }, { key: "quantitative_reasoning", label: "Quantitative Reasoning", seconds: 400, icon: "📊" }, { key: "abstract_reasoning", label: "Abstract Reasoning", seconds: 160, icon: "🔷" }, { key: "situational_judgement", label: "Situational Judgement", seconds: 230, icon: "⚖️" }];
type Phase = "pick" | "playing" | "done";
export default function ChallengePage() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [selectedSubtest, setSelectedSubtest] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [seconds, setSeconds] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());
  const sessionId = useRef(crypto.randomUUID());
  const cfg = SUBTESTS.find(s => s.key === selectedSubtest);
  const fmtSecs = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const fmtMs = (ms: number) => { const s=Math.floor(ms/1000); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };
  async function startChallenge(key: string) {
    setSelectedSubtest(key); sessionId.current = crypto.randomUUID();
    const res = await fetch(`/api/questions?subtest=${key}&limit=10`);
    const data = await res.json();
    const qs: Question[] = (data.questions ?? []).slice(0, 10);
    setQuestions(qs); setQIdx(0); setAnswers({});
    const c = SUBTESTS.find(s => s.key === key)!;
    setSeconds(c.seconds); startRef.current = Date.now(); setPhase("playing");
  }
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => {
      setSeconds(s => { if (s <= 1) { clearInterval(timerRef.current!); setPhase("done"); return 0; } return s - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, selectedSubtest]);
  async function pickAnswer(letter: string) {
    if (answers[qIdx] !== undefined || !questions[qIdx]) return;
    const q = questions[qIdx];
    const isCorrect = letter === q.correctAnswer;
    const newAnswers = { ...answers, [qIdx]: letter };
    setAnswers(newAnswers);
    const isLast = qIdx === questions.length - 1;
    const correct = Object.values(newAnswers).filter((a,i) => a === questions[i]?.correctAnswer).length;
    const res = await fetch("/api/answers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, sessionId: sessionId.current, pickedLetter: letter, isCorrect, timeTakenMs: Date.now() - startRef.current, subtest: selectedSubtest, isSessionEnd: isLast, sessionCorrect: correct, sessionTotal: questions.length }) });
    const data = await res.json();
    if (isLast) { clearInterval(timerRef.current!); setXpEarned(data.xpAwarded ?? 0); setPhase("done"); }
    else setTimeout(() => setQIdx(i => i + 1), 500);
  }
  const correctCount = Object.entries(answers).filter(([i,l]) => l === questions[parseInt(i)]?.correctAnswer).length;
  const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const urgent = seconds < 30;
  if (phase === "pick") return (
    <div className="container-px py-10 max-w-2xl">
      <Link href="/app" className="text-[13px] text-ink-muted hover:text-teal-deep mb-6 inline-block">← Dashboard</Link>
      <p className="text-[12px] font-bold uppercase tracking-widest text-teal-deep mb-1">Speed Round</p>
      <h1 className="text-[2rem] font-extrabold tracking-tight text-navy mb-2">Challenge Mode</h1>
      <p className="text-ink-soft mb-8">10 questions. Real UCAT timing. Go.</p>
      <div className="grid gap-3">
        {SUBTESTS.map(s => (
          <button key={s.key} onClick={() => startChallenge(s.key)} className="flex items-center gap-4 p-5 bg-surface border border-line rounded-xl hover:border-teal-deep hover:shadow-md transition-all text-left group">
            <span className="text-3xl">{s.icon}</span>
            <div className="flex-1"><p className="font-bold text-navy text-[15px]">{s.label}</p><p className="text-[13px] text-ink-muted">10 questions · {fmtSecs(s.seconds)}</p></div>
            <span className="text-ink-muted group-hover:text-teal-deep text-xl">→</span>
          </button>
        ))}
      </div>
    </div>
  );
  if (phase === "done") return (
    <div className="container-px py-10 max-w-xl">
      <div className="bg-surface border border-line rounded-2xl p-8 text-center">
        <p className="text-5xl mb-4">{pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : "💪"}</p>
        <h1 className="text-[1.8rem] font-extrabold text-navy mb-2">{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good effort!" : "Keep practising!"}</h1>
        <p className="text-ink-soft mb-6">{cfg?.label}</p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-cool rounded-xl p-4"><p className="text-[2rem] font-extrabold text-navy">{correctCount}</p><p className="text-[12px] text-ink-muted uppercase tracking-wide">Correct</p></div>
          <div className="bg-surface-cool rounded-xl p-4"><p className="text-[2rem] font-extrabold text-navy">{pct}%</p><p className="text-[12px] text-ink-muted uppercase tracking-wide">Accuracy</p></div>
          <div className="bg-surface-cool rounded-xl p-4"><p className="text-[2rem] font-extrabold text-teal-deep">{xpEarned}</p><p className="text-[12px] text-ink-muted uppercase tracking-wide">XP Earned</p></div>
        </div>
        <div className="flex flex-col gap-2 mb-8 text-left">
          {questions.map((q,i) => { const correct = answers[i] === q.correctAnswer; return (<div key={q.id} className={`flex items-start gap-3 p-3 rounded-lg text-[13px] ${correct ? "bg-green-50" : "bg-red-50"}`}><span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${correct ? "bg-green-500" : "bg-red-400"}`}>{correct ? "✓" : "✗"}</span><p className={`line-clamp-1 ${correct ? "text-green-900" : "text-red-900"}`}>{q.stem}</p></div>); })}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setPhase("pick"); setAnswers({}); setQIdx(0); setXpEarned(0); }} className="flex-1 py-3 rounded-xl bg-navy text-white font-bold hover:bg-navy/90">Try again →</button>
          <Link href="/app" className="flex-1 py-3 rounded-xl border border-line text-ink font-semibold hover:bg-surface-cool text-center">Dashboard</Link>
        </div>
      </div>
    </div>
  );
  const q = questions[qIdx];
  const choices = q ? (q.choices as Array<{ label: string; text: string }>) : [];
  const picked = answers[qIdx];
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-line shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{cfg?.icon} {cfg?.label}</p>
            <div className="flex gap-1 mt-1">{questions.map((_,i) => (<div key={i} className={`flex-1 h-1.5 rounded-full ${i < qIdx ? (answers[i] === questions[i]?.correctAnswer ? "bg-green-400" : "bg-red-400") : i === qIdx ? "bg-navy" : "bg-line"}`} />))}</div>
          </div>
          <div className={`font-mono font-bold text-[20px] px-4 py-1.5 rounded-lg ${urgent ? "bg-red-50 text-red-600 animate-pulse" : "bg-surface-cool text-navy"}`}>{fmtSecs(seconds)}</div>
          <p className="text-[13px] text-ink-muted font-mono">{qIdx+1}/{questions.length}</p>
        </div>
      </header>
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {q && (<>
          {q.passage && (<div className="bg-surface border border-line rounded-xl p-5 mb-5 text-[15px] text-ink leading-relaxed">{q.passageTitle && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">{q.passageTitle}</p>}<p className="whitespace-pre-line">{q.passage}</p></div>)}
          <p className="text-[17px] font-semibold text-navy leading-snug mb-5">{q.stem}</p>
          <div className="flex flex-col gap-2.5">
            {choices.map(c => {
              const isPicked = picked === c.label;
              const isCorrect = c.label === q.correctAnswer;
              let cls = "flex items-start gap-3 p-4 rounded-xl border text-[15px] text-left transition-all ";
              if (!picked) cls += "border-line bg-surface hover:border-navy hover:shadow-sm cursor-pointer";
              else if (isPicked && isCorrect) cls += "border-green-400 bg-green-50 text-green-900 cursor-default";
              else if (isPicked) cls += "border-red-400 bg-red-50 text-red-900 cursor-default";
              else if (isCorrect && picked) cls += "border-green-400 bg-green-50/50 cursor-default";
              else cls += "border-line bg-surface opacity-40 cursor-default";
              return (
                <button key={c.label} onClick={() => pickAnswer(c.label)} disabled={!!picked} className={cls}>
                  <span className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center text-[12px] font-bold mt-0.5 ${isPicked && isCorrect ? "border-green-500 bg-green-500 text-white" : isPicked ? "border-red-500 bg-red-500 text-white" : !isPicked && isCorrect && picked ? "border-green-500 bg-green-500 text-white" : "border-current"}`}>{c.label}</span>
                  <span>{c.text}</span>
                </button>
              );
            })}
          </div>
        </>)}
      </div>
    </div>
  );
}

