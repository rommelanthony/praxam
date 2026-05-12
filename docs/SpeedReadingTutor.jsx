import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BookOpen, Gauge, Eye, Target, Play, Pause, RotateCcw, ChevronRight,
  TrendingUp, Clock, CheckCircle2, XCircle, Zap, Activity, Info,
  Search, AlertCircle, GitBranch, ArrowRight, Flag, SkipForward,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   SPEED READING TUTOR — Standalone module for PracXam (UCAT)
   Tabs: Baseline · Overview · Pacer · Chunking · Scan · Passage · Progress
   ============================================================ */

const UCAT = {
  totalMin: 22, passages: 11, qPerPassage: 4, totalQ: 44,
  secPerPassage: 120, secPerQ: 30, wordsLo: 200, wordsHi: 300,
  minWPM: 300, targetWPM: 400, stretchWPM: 500, ceilingWPM: 500,
  compFloor: 80,
};

// Two-mode strategy: which technique fits which UCAT question type
// Language traps — the words that flip meaning in UCAT VR
const LANGUAGE_TRAPS = {
  extreme: {
    name: "Extreme qualifiers",
    color: "#E76F51",
    rule: "Usually signals FALSE. One counter-example in the passage breaks the statement.",
    words: ["all", "every", "always", "never", "none", "only", "must", "no one", "everyone", "nothing", "everything", "impossible", "certain", "sole", "exclusively", "entirely"],
  },
  soft: {
    name: "Soft qualifiers",
    color: "#22D3A8",
    rule: "Usually signals TRUE or CAN'T TELL. Hard to disprove because the claim is hedged.",
    words: ["some", "many", "few", "may", "might", "could", "often", "sometimes", "usually", "can", "tend to", "likely", "possibly", "generally", "frequently", "rarely"],
  },
  negation: {
    name: "Negations",
    color: "#F4A261",
    rule: "EASY to miss when speed-reading. Mentally rewrite 'X is true EXCEPT' as 'which X is false'.",
    words: ["not", "except", "cannot", "neither", "nor", "without", "unless", "fails to", "rather than", "instead of"],
  },
};

const STRATEGIES = {
  fullRead: {
    id: "fullRead",
    name: "Full-passage speed read",
    short: "Read fast",
    color: "#7C5CFF",
    when: "Use when the question needs the whole picture",
    questionTypes: ["Most likely / inference", "Author's opinion", "Main idea"],
    drills: ["pacer", "chunking"],
    pace: "400–500 WPM",
    rationale: "These questions test understanding of the passage as a whole. You can't shortcut them with keyword scanning — you need the argument's shape.",
  },
  scan: {
    id: "scan",
    name: "Scan-and-locate",
    short: "Scan & locate",
    color: "#22D3A8",
    when: "Use when the question points to a specific fact",
    questionTypes: ["True / False / Can't Tell", "EXCEPT questions", "Specific detail"],
    drills: ["scan"],
    pace: "Skim @ ~700+ WPM, read target sentence @ 300 WPM",
    rationale: "Read the question first, identify a distinctive keyword, scan the passage for it, then carefully read only the sentence around it. Top UCAT scorers rely on this for ~70% of questions.",
  },
};

const TIER = (wpm) => {
  if (wpm < 250) return { name: "Below baseline", color: "#E76F51", note: "Most untrained readers sit here. Big gains available." };
  if (wpm < 300) return { name: "Baseline", color: "#F4A261", note: "Around average. You'll struggle for time on UCAT." };
  if (wpm < 400) return { name: "Minimum viable", color: "#F4D35E", note: "Workable with strong scanning, but no buffer." };
  if (wpm < 500) return { name: "Training target", color: "#22D3A8", note: "Strong UCAT pace — finish with time to check." };
  return { name: "Stretch", color: "#7C5CFF", note: "Elite pace. Watch comprehension carefully." };
};

const PASSAGE_BANK = [
  {
    id: "p1", title: "The Migration of Monarch Butterflies",
    difficulty: "Medium", wordCount: 198,
    text: `Every autumn, millions of monarch butterflies undertake one of nature's most remarkable journeys. From the northern United States and southern Canada, these fragile insects travel up to three thousand miles to reach the oyamel fir forests of central Mexico. What makes this migration extraordinary is that no single butterfly completes the round trip. The generation that flies south will never see the northern fields again; their great-grandchildren are the ones who return.

Scientists have long puzzled over how monarchs navigate. Research suggests they rely on a combination of the sun's position and an internal circadian clock located in their antennae. When the sun is obscured, the butterflies may also detect the Earth's magnetic field, using it as a backup compass. This sophisticated navigation system is encoded entirely in their genes, passed down through generations that have never made the journey before.

Conservationists warn, however, that the migration is in peril. Deforestation in Mexico, the loss of milkweed across North American farmland, and climate change have all contributed to a steep decline in monarch populations over the past two decades. Protecting this phenomenon will require coordinated action across three countries.`,
    questions: [
      { q: "How many generations of monarchs are involved in a typical migration cycle?", options: ["One", "Two", "Multiple generations", "Exactly four"], answer: 2 },
      { q: "Which is NOT mentioned as a navigation method?", options: ["Sun position", "Magnetic field", "Star patterns", "Internal circadian clock"], answer: 2 },
      { q: "The primary threats to monarch migration include all EXCEPT:", options: ["Deforestation", "Loss of milkweed", "Climate change", "Predator increase"], answer: 3 },
    ],
  },
  {
    id: "p2", title: "The Economics of Attention",
    difficulty: "Hard", wordCount: 172,
    text: `In the digital age, attention has become a commodity more valuable than oil. Every notification, headline, and autoplay video is engineered to capture and retain a fragment of human focus, which platforms then monetize through advertising. Economists describe this as the "attention economy," a market in which the supply of content vastly exceeds the cognitive bandwidth available to consume it.

The implications extend beyond commerce. Studies have linked heavy social media use to declines in sustained reading, deteriorating sleep, and increased anxiety. Yet the same technologies have democratized publishing, allowing voices once marginalized to reach global audiences. The challenge, then, is not to reject these tools but to develop the discipline required to use them deliberately.

Some scholars propose treating attention as a finite resource, like water or arable land, that warrants both personal stewardship and public regulation. Whether through digital literacy education or platform design reform, reclaiming agency over our focus may prove to be one of the defining tasks of the century.`,
    questions: [
      { q: "The passage's central metaphor compares attention to:", options: ["A river", "A commodity like oil", "A library", "Currency"], answer: 1 },
      { q: "Which is described as a positive effect of digital platforms?", options: ["Better sleep", "Democratized publishing", "Increased focus", "Reduced anxiety"], answer: 1 },
      { q: "The author's overall stance toward digital technology is best described as:", options: ["Wholly negative", "Wholly positive", "Nuanced and pragmatic", "Indifferent"], answer: 2 },
    ],
  },
  {
    id: "p3", title: "Antibiotic Resistance",
    difficulty: "Medium", wordCount: 215,
    text: `Antibiotic resistance has emerged as one of the most pressing threats to modern medicine. When bacteria are repeatedly exposed to antibiotics, those that happen to possess resistance genes survive and multiply, passing the trait on to subsequent generations. Over time, infections that were once routinely curable can become difficult or impossible to treat. The World Health Organization has identified resistance as a leading cause of preventable death.

The drivers of resistance are well understood. Overprescription in human medicine, the widespread use of antibiotics in livestock farming, and incomplete courses of treatment all create selective pressure that favours resistant strains. Hospitals are particularly vulnerable, as they concentrate both vulnerable patients and the most aggressive bacteria.

Despite the urgency, the development of new antibiotics has slowed dramatically. Pharmaceutical companies face limited financial incentives, since new antibiotics are typically held in reserve for resistant infections rather than prescribed widely. Several governments have begun experimenting with subsidies and prize models to encourage innovation. In parallel, researchers are exploring alternatives such as bacteriophage therapy, which uses viruses to target specific bacteria, and CRISPR-based approaches that disable resistance genes directly. Whether these strategies will arrive in time to prevent a return to the pre-antibiotic era remains uncertain.`,
    questions: [
      { q: "According to the passage, antibiotic resistance develops because:", options: ["Bacteria mutate randomly without cause", "Resistant bacteria survive treatment and multiply", "Antibiotics become weaker over time", "Patients build immunity to drugs"], answer: 1 },
      { q: "Which is NOT listed as a driver of resistance?", options: ["Overprescription", "Livestock farming use", "Genetic engineering", "Incomplete treatment courses"], answer: 2 },
      { q: "Pharmaceutical companies are slow to develop new antibiotics primarily because:", options: ["The science is too difficult", "Regulations are too strict", "Financial incentives are limited", "Patients refuse new drugs"], answer: 2 },
    ],
  },
];

// Triage practice bank — quick questions tagged by estimated difficulty
const TRIAGE_QUESTIONS = [
  { id: "t1", stem: "The passage states the company was founded in 1923.", context: "Founded 1923, IPO 1968, acquired 2001.", answer: "true", difficulty: "easy", expectedSec: 8 },
  { id: "t2", stem: "All employees received bonuses in 2023.", context: "Most employees received bonuses; performance-based exceptions applied to senior management.", answer: "false", difficulty: "easy", expectedSec: 10, trap: "extreme" },
  { id: "t3", stem: "The CEO believes AI will replace 30% of office jobs within a decade.", context: "The CEO discussed automation broadly without giving percentages or timeframes.", answer: "cant_tell", difficulty: "medium", expectedSec: 15 },
  { id: "t4", stem: "The drug was tested on more than 10,000 patients across three continents, demonstrating efficacy in Phase III trials with statistically significant outcomes versus placebo across multiple demographic subgroups.", context: "Phase III trials enrolled 8,400 patients across two continents.", answer: "false", difficulty: "hard", expectedSec: 35 },
  { id: "t5", stem: "Some researchers have questioned the findings.", context: "Several scientists raised methodological concerns following publication.", answer: "true", difficulty: "easy", expectedSec: 8, trap: "soft" },
  { id: "t6", stem: "The treatment is not recommended for patients under 18.", context: "Pediatric trials are ongoing; current guidelines apply to adults only.", answer: "cant_tell", difficulty: "hard", expectedSec: 25, trap: "negation" },
  { id: "t7", stem: "The author exclusively credits government funding for the program's success.", context: "The author cites government funding, private donations, and volunteer effort.", answer: "false", difficulty: "medium", expectedSec: 12, trap: "extreme" },
  { id: "t8", stem: "The policy was implemented in every European country by 2020.", context: "By 2020, 21 of 27 EU member states had implemented similar policies.", answer: "false", difficulty: "medium", expectedSec: 12, trap: "extreme" },
  { id: "t9", stem: "Climate change may contribute to species migration patterns.", context: "Researchers have observed shifts in migration that correlate with temperature changes, though causation remains debated.", answer: "true", difficulty: "easy", expectedSec: 10, trap: "soft" },
  { id: "t10", stem: "A comprehensive longitudinal study following 4,200 participants over 15 years across rural and urban settings found that dietary patterns characterized by high vegetable intake correlated with reduced incidence of cardiovascular events.", context: "The study tracked 4,200 participants for 12 years across mixed settings.", answer: "false", difficulty: "hard", expectedSec: 40 },
];

const theme = {
  bg: "#0E1116", panel: "#161A22", panel2: "#1D222D", border: "#262C39",
  ink: "#E8ECF3", inkDim: "#9AA3B2",
  accent: "#7C5CFF", accent2: "#22D3A8", warn: "#F4A261", warnSoft: "#F4D35E", danger: "#E76F51",
};

// =================================================================
// MAIN
// =================================================================
export default function SpeedReadingTutor() {
  const [tab, setTab] = useState("home");
  const [baseline, setBaseline] = useState(null);
  const [history, setHistory] = useState([]);

  const needsBaseline = !baseline;
  const effectiveTab = needsBaseline && tab !== "baseline" ? "baseline" : tab;

  const logSession = (wpm, comp) => {
    const day = new Date().toLocaleDateString("en-US", { weekday: "short" });
    setHistory((h) => [...h, { date: day, wpm, comp }]);
  };

  const completeBaseline = (wpm, comp) => {
    setBaseline({ wpm, comp });
    logSession(wpm, comp);
    setTab("home");
  };

  return (
    <div style={styles.app}>
      <Header tab={effectiveTab} setTab={setTab} locked={needsBaseline} />
      <main style={styles.main}>
        {effectiveTab === "baseline" && <BaselineMode onComplete={completeBaseline} isFirstRun={needsBaseline} />}
        {effectiveTab === "home" && <Home setTab={setTab} baseline={baseline} history={history} />}
        {effectiveTab === "strategy" && <StrategyMode setTab={setTab} />}
        {effectiveTab === "pacer" && <PacerMode baseline={baseline} />}
        {effectiveTab === "chunking" && <ChunkingMode baseline={baseline} />}
        {effectiveTab === "scan" && <ScanMode />}
        {effectiveTab === "qualifier" && <QualifierMode />}
        {effectiveTab === "triage" && <TriageMode />}
        {effectiveTab === "passage" && <PassageMode onComplete={logSession} baseline={baseline} />}
        {effectiveTab === "progress" && <ProgressMode history={history} baseline={baseline} />}
      </main>
    </div>
  );
}

// =================================================================
// HEADER
// =================================================================
function Header({ tab, setTab, locked }) {
  const tabs = [
    { id: "home", label: "Overview", icon: BookOpen },
    { id: "baseline", label: "Baseline", icon: Activity },
    { id: "strategy", label: "Strategy", icon: GitBranch },
    { id: "pacer", label: "Pacer", icon: Gauge },
    { id: "chunking", label: "Chunking", icon: Eye },
    { id: "scan", label: "Scan", icon: Search },
    { id: "qualifier", label: "Qualifiers", icon: Flag },
    { id: "triage", label: "Triage", icon: SkipForward },
    { id: "passage", label: "Passage", icon: Target },
    { id: "progress", label: "Progress", icon: TrendingUp },
  ];
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <div style={styles.logoMark}><Zap size={16} strokeWidth={2.5} /></div>
        <div>
          <div style={styles.brandTitle}>Speed Reading Tutor</div>
          <div style={styles.brandSub}>PracXam · UCAT Verbal Reasoning</div>
        </div>
      </div>
      <nav style={styles.nav}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const isLocked = locked && t.id !== "baseline";
          return (
            <button
              key={t.id}
              onClick={() => !isLocked && setTab(t.id)}
              disabled={isLocked}
              style={{
                ...styles.navBtn,
                color: active ? theme.ink : isLocked ? "#4A5160" : theme.inkDim,
                background: active ? theme.panel2 : "transparent",
                borderColor: active ? theme.border : "transparent",
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

// =================================================================
// BASELINE
// =================================================================
function BaselineMode({ onComplete, isFirstRun }) {
  const [stage, setStage] = useState("intro");
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const startRef = useRef(0);
  const passage = PASSAGE_BANK[0];

  useEffect(() => {
    if (stage !== "reading") return;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(t);
  }, [stage]);

  const start = () => { setElapsed(0); setAnswers({}); startRef.current = Date.now(); setStage("reading"); };
  const submit = () => {
    const correct = passage.questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const comp = Math.round((correct / passage.questions.length) * 100);
    const wpm = Math.round((passage.wordCount / elapsed) * 60);
    setResult({ wpm, comp });
    setStage("done");
  };

  if (stage === "intro") {
    return (
      <Section
        title={isFirstRun ? "First, let's measure your baseline" : "Retake baseline"}
        desc="Read one real-style passage at your natural pace, then answer 3 questions. This sets your training targets."
      >
        {isFirstRun && (
          <Callout icon={Info} tone="accent" title="Why this matters"
            body="UCAT Verbal Reasoning gives you ~2 minutes per passage. Without knowing your current speed and comprehension, training targets are just guesses. The baseline takes 90 seconds." />
        )}
        <div style={styles.baselineCard}>
          <div style={styles.baselineSteps}>
            <BaselineStep n={1} title="Read naturally" body="Don't try to speed yet. Read as you normally would." />
            <BaselineStep n={2} title="Click 'Done reading'" body="The timer captures your raw WPM." />
            <BaselineStep n={3} title="Answer 3 questions" body="This measures whether you actually absorbed the passage." />
          </div>
          <button style={styles.primaryBtn} onClick={start}><Play size={16} /> Begin baseline test</button>
        </div>
      </Section>
    );
  }

  if (stage === "reading") {
    const wpmNow = elapsed > 0 ? Math.round((passage.wordCount / elapsed) * 60) : 0;
    return (
      <Section title="Baseline: read naturally" desc="Don't rush. We're measuring your current speed.">
        <div style={styles.timerBar}>
          <div style={styles.timerLeft}>
            <Clock size={14} />
            <span>{elapsed.toFixed(1)}s</span>
            <span style={styles.timerDivider}>·</span>
            <span style={{ color: theme.accent }}>{wpmNow} WPM pace</span>
          </div>
          <button style={styles.primaryBtn} onClick={() => setStage("quiz")}>
            Done reading <ChevronRight size={16} />
          </button>
        </div>
        <article style={styles.passageBody}>
          <h2 style={styles.passageTitle}>{passage.title}</h2>
          {passage.text.split("\n\n").map((p, i) => (<p key={i} style={styles.passagePara}>{p}</p>))}
        </article>
      </Section>
    );
  }

  if (stage === "quiz") {
    return (
      <Section title="Comprehension check" desc="A baseline isn't meaningful without comprehension data.">
        <Quiz passage={passage} answers={answers} setAnswers={setAnswers} onSubmit={submit} />
      </Section>
    );
  }

  const tier = TIER(result.wpm);
  return (
    <Section title="Your baseline" desc="This sets your starting line and training targets.">
      <div style={styles.baselineResult}>
        <div style={styles.baselineHero}>
          <div style={styles.baselineHeroLabel}>Your reading speed</div>
          <div style={styles.baselineHeroValue}>
            <span style={{ color: tier.color }}>{result.wpm}</span>
            <span style={styles.baselineHeroUnit}>WPM</span>
          </div>
          <div style={{ ...styles.tierPill, color: tier.color, borderColor: tier.color + "60" }}>{tier.name}</div>
          <p style={styles.baselineNote}>{tier.note}</p>
        </div>
        <div style={styles.baselineStats}>
          <BigStat label="Comprehension" value={result.comp} unit="%" accent={theme.accent2} />
          <BigStat label="Gap to UCAT target" value={Math.max(0, 400 - result.wpm)} unit="WPM" accent={theme.warn} />
        </div>
        <SpeedScale current={result.wpm} />
        <Callout icon={Target} tone="accent" title="Your training plan"
          body={`Aim for ${result.wpm < 300 ? "300 WPM as your first checkpoint" : result.wpm < 400 ? "400 WPM with 80%+ comprehension" : "500 WPM stretch target"}. The Pacer and Chunking drills will get you there; the Passage drill verifies it sticks.`} />
        <button style={styles.primaryBtn} onClick={() => onComplete(result.wpm, result.comp)}>
          Save baseline & continue <ChevronRight size={16} />
        </button>
      </div>
    </Section>
  );
}

function BaselineStep({ n, title, body }) {
  return (
    <div style={styles.baselineStep}>
      <div style={styles.baselineStepN}>{n}</div>
      <div>
        <div style={styles.baselineStepTitle}>{title}</div>
        <div style={styles.baselineStepBody}>{body}</div>
      </div>
    </div>
  );
}

// =================================================================
// SPEED SCALE
// =================================================================
function SpeedScale({ current }) {
  const stops = [
    { wpm: 200, label: "Avg" },
    { wpm: 300, label: "Min" },
    { wpm: 400, label: "Target", emphasis: true },
    { wpm: 500, label: "Stretch" },
    { wpm: 600, label: "Ceiling" },
  ];
  const max = 600;
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div style={styles.scaleWrap}>
      <div style={styles.scaleTitle}>Where you sit on the UCAT scale</div>
      <div style={styles.scaleTrack}>
        <div style={{ ...styles.scaleFill, width: `${pct}%`,
          background: `linear-gradient(90deg, ${theme.danger}, ${theme.warn}, ${theme.warnSoft}, ${theme.accent2}, ${theme.accent})` }} />
        <div style={{ ...styles.scaleMarker, left: `${pct}%` }}>
          <div style={styles.scaleMarkerDot} />
          <div style={styles.scaleMarkerLabel}>{current}</div>
        </div>
        {stops.map((s) => (
          <div key={s.wpm} style={{
            ...styles.scaleStop, left: `${(s.wpm / max) * 100}%`,
            color: s.emphasis ? theme.accent2 : theme.inkDim,
            fontWeight: s.emphasis ? 600 : 400,
          }}>
            <div style={styles.scaleStopTick} />
            <div style={styles.scaleStopLabel}>{s.wpm}<span style={styles.scaleStopSub}>{s.label}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// HOME
// =================================================================
function Home({ setTab, baseline, history }) {
  const tier = TIER(baseline.wpm);
  const latest = history[history.length - 1] || baseline;
  const delta = latest.wpm - baseline.wpm;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={styles.heroPanel}>
        <div>
          <div style={styles.eyebrow}>Your UCAT reading dashboard</div>
          <h1 style={styles.heroTitle}>
            Baseline: <span style={{ color: tier.color }}>{baseline.wpm} WPM</span>
            <br /><span style={styles.heroTitleSub}>Target: 400 WPM at 80%+</span>
          </h1>
          <p style={styles.heroSub}>{tier.note}</p>
          <div style={styles.heroBtns}>
            <button style={styles.primaryBtn} onClick={() => setTab("passage")}>
              Run a passage drill <ChevronRight size={16} />
            </button>
            <button style={styles.ghostBtn} onClick={() => setTab("baseline")}>
              <RotateCcw size={14} /> Retake baseline
            </button>
          </div>
        </div>
        <div style={styles.heroStats}>
          <Stat label="Baseline WPM" value={baseline.wpm} accent={tier.color} />
          <Stat label="Latest WPM" value={latest.wpm} accent={theme.accent}
            sub={delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} since baseline` : null} />
          <Stat label="Comprehension" value={`${latest.comp}%`} accent={theme.accent2} />
        </div>
      </div>

      <div style={styles.contextPanel}>
        <div style={styles.contextHead}>
          <div style={styles.contextIcon}><Info size={16} /></div>
          <div>
            <div style={styles.contextTitle}>Why 400–500 WPM?</div>
            <div style={styles.contextSub}>The math behind the targets</div>
          </div>
        </div>
        <div style={styles.contextGrid}>
          <ContextCell n="22 min" label="Total time for VR section" />
          <ContextCell n="11" label="Passages to read" />
          <ContextCell n="44" label="Questions to answer" />
          <ContextCell n="~2 min" label="Per passage (read + answer)" />
          <ContextCell n="200–300" label="Words per passage" />
          <ContextCell n="30 sec" label="Per question" />
        </div>
        <p style={styles.contextProse}>
          To finish on time you need to read a 250-word passage in ~60–70 seconds and still have ~90 seconds for 4 questions.
          That demands <strong style={{ color: theme.ink }}>~400 WPM</strong> minimum. Push to 500 WPM for buffer time on hard
          passages — but past 500, comprehension drops fast on UCAT-style dense text.
        </p>
      </div>

      <div style={styles.modesBanner}>
        <div style={styles.modesBannerHead}>
          <div style={styles.modesBannerEyebrow}>The two-mode strategy</div>
          <div style={styles.modesBannerTitle}>Match the technique to the question type</div>
          <p style={styles.modesBannerSub}>
            Top scorers don't speed-read every passage. Roughly 70% of UCAT VR questions are answered by scanning;
            the rest need a full read. Train both.
          </p>
        </div>
        <button style={styles.ghostBtn} onClick={() => setTab("strategy")}>
          Learn the strategy <ArrowRight size={14} />
        </button>
      </div>

      <div style={styles.drillsHead}>Mode 1 · Full-passage speed read</div>
      <div style={styles.grid2}>
        <DrillCard onClick={() => setTab("pacer")} icon={Gauge} title="Pacer"
          desc="RSVP word flasher. Locks you to a target WPM and kills regression." tag="5–10 min" />
        <DrillCard onClick={() => setTab("chunking")} icon={Eye} title="Chunking"
          desc="Read 2–5 words per fixation. Widens your visual span." tag="3–5 min" />
      </div>

      <div style={styles.drillsHead}>Mode 2 · Scan-and-locate</div>
      <div style={styles.grid2}>
        <DrillCard onClick={() => setTab("scan")} icon={Search} title="Scan Drill"
          desc="Keyword-locate practice — the UCAT power technique for T/F/CT questions." tag="3–5 min" />
        <DrillCard onClick={() => setTab("strategy")} icon={GitBranch} title="Strategy Router"
          desc="Quick reference: which technique fits which UCAT question type." tag="Reference" />
      </div>

      <div style={styles.drillsHead}>Language traps & exam strategy</div>
      <div style={styles.grid2}>
        <DrillCard onClick={() => setTab("qualifier")} icon={Flag} title="Qualifier Hunt"
          desc="Race to spot every 'all', 'never', 'except'. These words flip T/F/CT answers." tag="45 sec" />
        <DrillCard onClick={() => setTab("triage")} icon={SkipForward} title="Triage Trainer"
          desc="5-second skip-or-attempt decisions. Train the instinct to drop slow questions." tag="3 min" />
      </div>

      <div style={styles.drillsHead}>Verify it sticks</div>
      <div style={styles.grid1}>
        <DrillCard onClick={() => setTab("passage")} icon={Target} title="Passage Drill"
          desc="Full timed passage + comprehension quiz. Verifies your gains on real UCAT-style material." tag="Full workout" />
      </div>
    </div>
  );
}

function ContextCell({ n, label }) {
  return (
    <div style={styles.contextCell}>
      <div style={styles.contextCellN}>{n}</div>
      <div style={styles.contextCellLabel}>{label}</div>
    </div>
  );
}

function DrillCard({ icon: Icon, title, desc, tag, onClick }) {
  return (
    <button style={styles.card} onClick={onClick}>
      <div style={styles.cardIcon}><Icon size={18} /></div>
      <div style={styles.cardTag}>{tag}</div>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardDesc}>{desc}</div>
      <div style={styles.cardCta}>Open <ChevronRight size={14} /></div>
    </button>
  );
}

function Stat({ label, value, accent, sub }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statDot, background: accent }} />
      <div>
        <div style={styles.statLabel}>{label}</div>
        {sub && <div style={styles.statSub}>{sub}</div>}
      </div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

// =================================================================
// STRATEGY — the two-mode router
// =================================================================
function StrategyMode({ setTab }) {
  const [questionType, setQuestionType] = useState(null);

  const questionTypes = [
    { id: "tfct", label: "True / False / Can't Tell", strategy: "scan",
      example: "\"The author claims that monarchs use the magnetic field.\" — T/F/CT?" },
    { id: "except", label: "EXCEPT questions", strategy: "scan",
      example: "\"All of the following are threats EXCEPT...\"" },
    { id: "detail", label: "Specific detail", strategy: "scan",
      example: "\"How many miles do monarchs travel?\"" },
    { id: "inference", label: "Most likely / inference", strategy: "fullRead",
      example: "\"Which conclusion is best supported by the passage?\"" },
    { id: "opinion", label: "Author's opinion / tone", strategy: "fullRead",
      example: "\"The author's attitude toward digital technology is best described as...\"" },
    { id: "main", label: "Main idea", strategy: "fullRead",
      example: "\"The central argument of the passage is...\"" },
  ];

  const recommendation = questionType
    ? STRATEGIES[questionTypes.find((q) => q.id === questionType).strategy]
    : null;

  return (
    <Section
      title="The two-mode strategy"
      desc="Top UCAT scorers don't speed-read every passage. They match the technique to the question type."
    >
      <Callout
        icon={Info} tone="accent" title="Why two modes?"
        body="Speed-reading every passage at 500 WPM wastes effort on questions where you only need one sentence. Scanning every passage costs you on inference questions where you need the whole argument. The winning strategy is reading the question first, then choosing the technique."
      />

      {/* The two-mode comparison */}
      <div style={styles.modeGrid}>
        <ModeCard strategy={STRATEGIES.fullRead} onDrill={() => setTab("pacer")} />
        <ModeCard strategy={STRATEGIES.scan} onDrill={() => setTab("scan")} />
      </div>

      {/* Question-type router */}
      <div style={styles.routerPanel}>
        <div style={styles.routerHead}>
          <div style={styles.routerIcon}><GitBranch size={16} /></div>
          <div>
            <div style={styles.routerTitle}>Which technique should I use?</div>
            <div style={styles.routerSub}>Tap a question type to see the recommended mode</div>
          </div>
        </div>
        <div style={styles.routerGrid}>
          {questionTypes.map((q) => {
            const active = questionType === q.id;
            const strat = STRATEGIES[q.strategy];
            return (
              <button
                key={q.id}
                onClick={() => setQuestionType(q.id)}
                style={{
                  ...styles.routerBtn,
                  borderColor: active ? strat.color : theme.border,
                  background: active ? strat.color + "12" : theme.bg,
                }}
              >
                <div style={styles.routerBtnLabel}>{q.label}</div>
                <div style={{ ...styles.routerBtnTag, color: strat.color }}>
                  {strat.short}
                </div>
              </button>
            );
          })}
        </div>

        {recommendation && (
          <div style={{
            ...styles.routerResult,
            borderColor: recommendation.color + "60",
            background: recommendation.color + "08",
          }}>
            <div style={styles.routerResultHead}>
              <div style={{ ...styles.routerResultBadge, background: recommendation.color }}>
                {recommendation.short}
              </div>
              <div style={styles.routerResultName}>{recommendation.name}</div>
            </div>
            <div style={styles.routerResultBody}>
              <div style={styles.routerResultRow}>
                <span style={styles.routerResultLabel}>Example:</span>
                <span style={styles.routerResultExample}>
                  "{questionTypes.find((q) => q.id === questionType).example}"
                </span>
              </div>
              <div style={styles.routerResultRow}>
                <span style={styles.routerResultLabel}>Pace:</span>
                <span>{recommendation.pace}</span>
              </div>
              <div style={styles.routerResultRow}>
                <span style={styles.routerResultLabel}>Why:</span>
                <span>{recommendation.rationale}</span>
              </div>
            </div>
            <button
              style={{ ...styles.primaryBtn, background: recommendation.color }}
              onClick={() => setTab(recommendation.drills[0])}
            >
              Train {recommendation.short} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Language traps reference */}
      <div style={styles.trapsPanel}>
        <div style={styles.trapsHead}>
          <div style={styles.trapsIcon}><AlertTriangle size={16} /></div>
          <div>
            <div style={styles.trapsTitle}>Language traps to memorise</div>
            <div style={styles.trapsSub}>Three word categories that determine the right answer on most T/F/CT questions</div>
          </div>
        </div>
        <div style={styles.trapsGrid}>
          {Object.entries(LANGUAGE_TRAPS).map(([key, t]) => (
            <div key={key} style={{ ...styles.trapCard, borderColor: t.color + "40" }}>
              <div style={{ ...styles.trapBadge, background: t.color }}>{t.name}</div>
              <div style={styles.trapRule}>{t.rule}</div>
              <div style={styles.trapWords}>
                {t.words.slice(0, 10).map((w) => (
                  <span key={w} style={{ ...styles.trapWord, color: t.color, borderColor: t.color + "40" }}>{w}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button style={{ ...styles.ghostBtn, marginTop: 16 }} onClick={() => setTab("qualifier")}>
          Train this with Qualifier Hunt <ArrowRight size={14} />
        </button>
      </div>

      {/* The combined exam workflow */}
      <div style={styles.workflowPanel}>
        <div style={styles.workflowTitle}>The exam-day workflow</div>
        <div style={styles.workflowSteps}>
          <WorkflowStep n="1" title="Read the question first"
            body="Before looking at the passage. Identify whether it's asking for a fact (scan) or a meaning (full read)." />
          <WorkflowStep n="2" title="Pick the technique"
            body="T/F/CT, EXCEPT, specific detail → scan. Inference, opinion, main idea → full read." />
          <WorkflowStep n="3" title="Execute fast"
            body="Scanning: find keyword, read surrounding sentence. Full read: 400–500 WPM through the whole passage." />
          <WorkflowStep n="4" title="Don't second-guess"
            body="Pick an answer, flag if unsure, move on. You can't afford to re-read." />
        </div>
      </div>
    </Section>
  );
}

function ModeCard({ strategy, onDrill }) {
  return (
    <div style={{ ...styles.modeCard, borderColor: strategy.color + "40" }}>
      <div style={{ ...styles.modeBadge, background: strategy.color }}>
        {strategy.short}
      </div>
      <div style={styles.modeName}>{strategy.name}</div>
      <div style={styles.modeWhen}>{strategy.when}</div>
      <div style={styles.modeDivider} />
      <div style={styles.modeMetaRow}>
        <span style={styles.modeMetaLabel}>For:</span>
        <span style={styles.modeMetaValue}>{strategy.questionTypes.join(", ")}</span>
      </div>
      <div style={styles.modeMetaRow}>
        <span style={styles.modeMetaLabel}>Pace:</span>
        <span style={{ ...styles.modeMetaValue, color: strategy.color, fontWeight: 600 }}>
          {strategy.pace}
        </span>
      </div>
      <p style={styles.modeRationale}>{strategy.rationale}</p>
      <button
        style={{ ...styles.ghostBtn, borderColor: strategy.color + "60", color: strategy.color, width: "100%", justifyContent: "center" }}
        onClick={onDrill}
      >
        Open drill <ArrowRight size={14} />
      </button>
    </div>
  );
}

function WorkflowStep({ n, title, body }) {
  return (
    <div style={styles.workflowStep}>
      <div style={styles.workflowN}>{n}</div>
      <div>
        <div style={styles.workflowStepTitle}>{title}</div>
        <div style={styles.workflowStepBody}>{body}</div>
      </div>
    </div>
  );
}

// =================================================================
// QUALIFIER HUNT — timed highlight drill for extreme/soft/negation words
// =================================================================
function QualifierMode() {
  const [passageIndex, setPassageIndex] = useState(0);
  const [stage, setStage] = useState("ready"); // ready | hunting | done
  const [selected, setSelected] = useState({}); // wordKey -> trapType
  const [elapsed, setElapsed] = useState(0);
  const [timeLimit] = useState(45); // seconds
  const startRef = useRef(0);

  const passage = PASSAGE_BANK[passageIndex];

  // Index every word with its trap type (if any)
  const wordMap = useMemo(() => {
    const words = passage.text.split(/(\s+)/); // keep whitespace
    return words.map((w, i) => {
      const clean = w.replace(/[.,;:"'()]/g, "").toLowerCase().trim();
      if (!clean) return { word: w, key: i, trap: null };
      let trap = null;
      for (const [trapKey, trapData] of Object.entries(LANGUAGE_TRAPS)) {
        if (trapData.words.includes(clean)) { trap = trapKey; break; }
      }
      return { word: w, key: i, trap, clean };
    });
  }, [passage]);

  const allTraps = wordMap.filter((w) => w.trap);

  useEffect(() => {
    if (stage !== "hunting") return;
    const t = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000;
      setElapsed(e);
      if (e >= timeLimit) setStage("done");
    }, 100);
    return () => clearInterval(t);
  }, [stage, timeLimit]);

  const start = () => {
    setSelected({});
    setElapsed(0);
    startRef.current = Date.now();
    setStage("hunting");
  };

  const handleWordClick = (item) => {
    if (stage !== "hunting") return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.key]) delete next[item.key];
      else next[item.key] = item.trap || "wrong";
      return next;
    });
  };

  // Score
  const score = useMemo(() => {
    let hits = 0, misses = 0, falsePositives = 0;
    allTraps.forEach((t) => { if (selected[t.key]) hits++; else misses++; });
    Object.entries(selected).forEach(([key, type]) => {
      if (type === "wrong") falsePositives++;
    });
    return { hits, misses, falsePositives, total: allTraps.length };
  }, [selected, allTraps]);

  return (
    <Section
      title="Qualifier Hunt"
      desc="Race to highlight every qualifier and negation in the passage. These words flip the meaning of T/F/CT statements."
    >
      <Callout
        icon={Info} tone="accent" title="Why this drill"
        body="Extreme words like 'all', 'never', and 'only' are the single most common reason a T/F/CT statement is false. Negations like 'EXCEPT' and 'NOT' are the most-missed words in time-pressured reading. Training your eye to lock onto these costs nothing on exam day."
      />

      {/* Legend */}
      <div style={styles.trapLegend}>
        {Object.entries(LANGUAGE_TRAPS).map(([key, t]) => (
          <div key={key} style={styles.trapLegendItem}>
            <div style={{ ...styles.trapLegendDot, background: t.color }} />
            <div>
              <div style={styles.trapLegendName}>{t.name}</div>
              <div style={styles.trapLegendRule}>{t.rule}</div>
            </div>
          </div>
        ))}
      </div>

      {stage === "ready" && (
        <div style={styles.passageReady}>
          <PassageSelector value={passageIndex} onChange={setPassageIndex} />
          <Callout icon={Clock} tone="muted"
            body={`You'll have ${timeLimit} seconds to click every qualifier and negation. This passage has ${allTraps.length} traps to find.`} />
          <button style={styles.primaryBtn} onClick={start}>
            <Play size={16} /> Start hunt
          </button>
        </div>
      )}

      {stage === "hunting" && (
        <div>
          <div style={styles.timerBar}>
            <div style={styles.timerLeft}>
              <Clock size={14} />
              <span>{Math.max(0, timeLimit - elapsed).toFixed(1)}s left</span>
              <span style={styles.timerDivider}>·</span>
              <span style={{ color: theme.accent }}>
                {Object.keys(selected).length} selected
              </span>
            </div>
            <button style={styles.primaryBtn} onClick={() => setStage("done")}>
              Finish early <ChevronRight size={16} />
            </button>
          </div>
          <article style={styles.passageBody}>
            <h2 style={styles.passageTitle}>{passage.title}</h2>
            <p style={styles.passagePara}>
              {wordMap.map((item) => {
                if (!item.clean) return <span key={item.key}>{item.word}</span>;
                const isSelected = selected[item.key];
                return (
                  <span
                    key={item.key}
                    onClick={() => handleWordClick(item)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? theme.accent + "30" : "transparent",
                      borderRadius: 3, padding: "0 2px",
                      transition: "background 0.1s",
                    }}
                  >
                    {item.word}
                  </span>
                );
              })}
            </p>
          </article>
        </div>
      )}

      {stage === "done" && (
        <QualifierResults
          score={score} elapsed={Math.min(elapsed, timeLimit)}
          wordMap={wordMap} selected={selected} allTraps={allTraps}
          onRestart={() => setStage("ready")}
        />
      )}
    </Section>
  );
}

function QualifierResults({ score, elapsed, wordMap, selected, allTraps, onRestart }) {
  const accuracy = score.total > 0 ? Math.round((score.hits / score.total) * 100) : 0;
  const cleanScore = Math.max(0, score.hits - score.falsePositives);

  return (
    <div style={styles.results}>
      <div style={styles.resultsGrid}>
        <BigStat label="Traps caught" value={`${score.hits}/${score.total}`} unit="" accent={accuracy >= 80 ? theme.accent2 : theme.warn} />
        <BigStat label="Accuracy" value={accuracy} unit="%" accent={accuracy >= 80 ? theme.accent2 : theme.warn} />
        <BigStat label="False positives" value={score.falsePositives} unit="" accent={score.falsePositives === 0 ? theme.accent2 : theme.danger} />
      </div>

      <Callout
        icon={accuracy >= 80 ? CheckCircle2 : AlertCircle}
        tone={accuracy >= 80 ? "accent" : "warn"}
        body={
          accuracy >= 80
            ? `Strong hit rate. ${score.falsePositives > 0 ? `Watch your ${score.falsePositives} false positives — clicking non-qualifiers slows you down on exam day.` : "Clean run."}`
            : `You missed ${score.misses} qualifiers. These are the words that determine the right answer in T/F/CT — building eye-locking on them is high-leverage.`
        }
      />

      {/* Reveal — show passage with all traps colored */}
      <div style={styles.passageBody}>
        <div style={styles.resultsReviewTitle}>All traps revealed</div>
        <p style={{ ...styles.passagePara, marginTop: 16 }}>
          {wordMap.map((item) => {
            if (!item.clean) return <span key={item.key}>{item.word}</span>;
            const trap = item.trap;
            const wasSelected = selected[item.key];
            const color = trap ? LANGUAGE_TRAPS[trap].color : null;
            const isMiss = trap && !wasSelected;
            const isFalsePos = !trap && wasSelected;
            return (
              <span
                key={item.key}
                style={{
                  background: trap ? color + "30" : isFalsePos ? theme.danger + "20" : "transparent",
                  borderBottom: isMiss ? `2px solid ${color}` : "none",
                  color: trap ? color : isFalsePos ? theme.danger : theme.ink,
                  fontWeight: trap ? 600 : 400,
                  padding: "0 2px", borderRadius: 3,
                }}
                title={trap ? `${LANGUAGE_TRAPS[trap].name}${isMiss ? " (missed)" : ""}` : isFalsePos ? "False positive" : ""}
              >
                {item.word}
              </span>
            );
          })}
        </p>
      </div>

      <button style={styles.primaryBtn} onClick={onRestart}>
        <RotateCcw size={16} /> Another passage
      </button>
    </div>
  );
}

// =================================================================
// TRIAGE TRAINER — fast skip-or-attempt decision drill
// =================================================================
function TriageMode() {
  const [stage, setStage] = useState("ready"); // ready | active | done
  const [idx, setIdx] = useState(0);
  const [decisions, setDecisions] = useState([]); // {id, decision, answer?, correct?, timeSpent}
  const [questionStart, setQuestionStart] = useState(0);
  const [phase, setPhase] = useState("triage"); // triage | answer
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const decisionDeadlineSec = 5; // 5s to decide skip-or-attempt
  const [decisionTimer, setDecisionTimer] = useState(decisionDeadlineSec);

  const q = TRIAGE_QUESTIONS[idx];

  // Decision phase countdown
  useEffect(() => {
    if (stage !== "active" || phase !== "triage") return;
    setDecisionTimer(decisionDeadlineSec);
    setQuestionStart(Date.now());
    const t = setInterval(() => {
      const elapsed = (Date.now() - questionStart) / 1000;
      setDecisionTimer(Math.max(0, decisionDeadlineSec - elapsed));
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, phase, idx]);

  const start = () => {
    setIdx(0); setDecisions([]); setPhase("triage");
    setStage("active");
  };

  const handleDecision = (decision) => {
    const timeSpent = (Date.now() - questionStart) / 1000;
    if (decision === "skip") {
      const rec = { id: q.id, decision: "skip", correct: null, timeSpent, expected: q.expectedSec, difficulty: q.difficulty };
      const nextDecisions = [...decisions, rec];
      setDecisions(nextDecisions);
      advance(nextDecisions);
    } else {
      setPhase("answer");
      setCurrentAnswer(null);
    }
  };

  const handleAnswer = (ans) => {
    const timeSpent = (Date.now() - questionStart) / 1000;
    const correct = ans === q.answer;
    const rec = { id: q.id, decision: "attempt", answer: ans, correct, timeSpent, expected: q.expectedSec, difficulty: q.difficulty };
    const nextDecisions = [...decisions, rec];
    setDecisions(nextDecisions);
    advance(nextDecisions);
  };

  const advance = (nextDecisions) => {
    if (idx + 1 >= TRIAGE_QUESTIONS.length) {
      setStage("done");
    } else {
      setIdx(idx + 1);
      setPhase("triage");
    }
  };

  return (
    <Section
      title="Triage Trainer"
      desc="All UCAT questions are worth the same. The fastest path to a high score is skipping slow questions and banking the easy ones. This drill trains that decision."
    >
      <Callout
        icon={AlertTriangle} tone="warn" title="The triage rule"
        body="If a question looks like it'll take more than ~30 seconds, FLAG AND SKIP. Guess an answer, mark it, move on. You can return at the end. The skill is recognising a slow question in 5 seconds — not solving it."
      />

      {stage === "ready" && (
        <div style={styles.baselineCard}>
          <div style={styles.baselineSteps}>
            <BaselineStep n={1} title="See a question stem" body="You get a glance at the question and a short context — no full passage." />
            <BaselineStep n={2} title="Decide in 5 seconds" body="Skip (flag & guess) or Attempt (answer now). The clock is your enemy." />
            <BaselineStep n={3} title="Review your triage" body="At the end, see if you skipped the right ones and attempted the right ones." />
          </div>
          <button style={styles.primaryBtn} onClick={start}>
            <Play size={16} /> Begin triage
          </button>
        </div>
      )}

      {stage === "active" && phase === "triage" && (
        <div style={styles.triageCard}>
          <div style={styles.triageHead}>
            <span style={styles.triageProgress}>Question {idx + 1} / {TRIAGE_QUESTIONS.length}</span>
            <div style={styles.triageCountdown}>
              <div style={{
                ...styles.triageCountdownBar,
                width: `${(decisionTimer / decisionDeadlineSec) * 100}%`,
                background: decisionTimer < 2 ? theme.danger : decisionTimer < 3 ? theme.warn : theme.accent,
              }} />
            </div>
            <span style={styles.triageTimer}>{decisionTimer.toFixed(1)}s</span>
          </div>
          <div style={styles.triageStem}>{q.stem}</div>
          <div style={styles.triageContext}>
            <span style={styles.triageContextLabel}>Context:</span> {q.context}
          </div>
          <div style={styles.triageBtns}>
            <button
              style={{ ...styles.ghostBtn, flex: 1, justifyContent: "center", borderColor: theme.warn + "60", color: theme.warn }}
              onClick={() => handleDecision("skip")}
            >
              <SkipForward size={16} /> Skip & guess
            </button>
            <button
              style={{ ...styles.primaryBtn, flex: 1, justifyContent: "center" }}
              onClick={() => handleDecision("attempt")}
            >
              Attempt <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {stage === "active" && phase === "answer" && (
        <div style={styles.triageCard}>
          <div style={styles.triageHead}>
            <span style={styles.triageProgress}>Question {idx + 1} / {TRIAGE_QUESTIONS.length}</span>
            <span style={styles.triagePill}>Answering</span>
          </div>
          <div style={styles.triageStem}>{q.stem}</div>
          <div style={styles.triageContext}>
            <span style={styles.triageContextLabel}>Context:</span> {q.context}
          </div>
          <div style={styles.triageAnswerBtns}>
            {["true", "false", "cant_tell"].map((a) => (
              <button
                key={a}
                onClick={() => handleAnswer(a)}
                style={{
                  ...styles.quizOpt,
                  borderColor: currentAnswer === a ? theme.accent : theme.border,
                  justifyContent: "center",
                  fontWeight: 600,
                }}
              >
                {a === "cant_tell" ? "Can't tell" : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "done" && (
        <TriageResults decisions={decisions} onRestart={() => setStage("ready")} />
      )}
    </Section>
  );
}

function TriageResults({ decisions, onRestart }) {
  // Triage quality: did they skip the slow ones and attempt the fast ones?
  const skipped = decisions.filter((d) => d.decision === "skip");
  const attempted = decisions.filter((d) => d.decision === "attempt");
  const correctAttempts = attempted.filter((d) => d.correct).length;

  // A "good skip" = skipped a hard/long question (expectedSec > 20)
  // A "good attempt" = attempted an easy/medium question (expectedSec <= 20)
  const goodSkips = skipped.filter((d) => d.expected > 20).length;
  const badSkips = skipped.filter((d) => d.expected <= 20).length;
  const goodAttempts = attempted.filter((d) => d.expected <= 20).length;
  const badAttempts = attempted.filter((d) => d.expected > 20).length;

  const triageScore = Math.round(((goodSkips + goodAttempts) / decisions.length) * 100);
  const accuracy = attempted.length > 0 ? Math.round((correctAttempts / attempted.length) * 100) : 0;

  // Time saved by skipping vs. attempting everything
  const timeSpent = decisions.reduce((s, d) => s + d.timeSpent, 0);
  const timeIfAllAttempted = decisions.reduce((s, d) => s + d.expected, 0);
  const timeSaved = Math.round(timeIfAllAttempted - timeSpent);

  return (
    <div style={styles.results}>
      <div style={styles.resultsGrid}>
        <BigStat label="Triage quality" value={triageScore} unit="%" accent={triageScore >= 70 ? theme.accent2 : theme.warn} />
        <BigStat label="Attempt accuracy" value={accuracy} unit="%" accent={accuracy >= 70 ? theme.accent2 : theme.warn} />
        <BigStat label="Time saved" value={timeSaved} unit="sec" accent={theme.accent} />
      </div>

      <Callout
        icon={triageScore >= 70 ? CheckCircle2 : AlertCircle}
        tone={triageScore >= 70 ? "accent" : "warn"}
        title="Triage breakdown"
        body={
          `Good skips: ${goodSkips} (skipped hard questions). Bad skips: ${badSkips} (skipped easy ones). ` +
          `Good attempts: ${goodAttempts}. Bad attempts: ${badAttempts} (attempted slow ones — these are the leaks). ` +
          (badAttempts > badSkips ? "Be quicker to flag-and-skip when a question looks complex." : "You're being appropriately ruthless. Good triage.")
        }
      />

      <div style={styles.resultsReview}>
        <div style={styles.resultsReviewTitle}>Decision review</div>
        {decisions.map((d, i) => {
          const q = TRIAGE_QUESTIONS.find((x) => x.id === d.id);
          const isGood = (d.decision === "skip" && d.expected > 20) || (d.decision === "attempt" && d.expected <= 20);
          return (
            <div key={i} style={styles.resultRow}>
              {isGood ? (
                <CheckCircle2 size={16} color={theme.accent2} />
              ) : (
                <XCircle size={16} color={theme.warn} />
              )}
              <div style={styles.resultRowText}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: theme.inkDim, marginRight: 8 }}>
                    [{q.difficulty}, ~{q.expected}s]
                  </span>
                  {q.stem.slice(0, 60)}{q.stem.length > 60 ? "…" : ""}
                </div>
                <div style={{ color: theme.inkDim, fontSize: 12, marginTop: 4 }}>
                  {d.decision === "skip" ? "Skipped" : `Attempted (${d.correct ? "correct" : "wrong"})`} in {d.timeSpent.toFixed(1)}s
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button style={styles.primaryBtn} onClick={onRestart}>
        <RotateCcw size={16} /> Run again
      </button>
    </div>
  );
}

// =================================================================
// PACER
// =================================================================
function PacerMode({ baseline }) {
  const recommended = Math.min(500, Math.max(300, baseline.wpm + 50));
  const [wpm, setWpm] = useState(recommended);
  const [chunkSize, setChunkSize] = useState(1);
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [passageIndex, setPassageIndex] = useState(0);
  const passage = PASSAGE_BANK[passageIndex];
  const words = useMemo(() => passage.text.split(/\s+/).filter(Boolean), [passage]);
  const chunks = useMemo(() => {
    const out = [];
    for (let i = 0; i < words.length; i += chunkSize) out.push(words.slice(i, i + chunkSize).join(" "));
    return out;
  }, [words, chunkSize]);
  const interval = (60 / wpm) * 1000 * chunkSize;

  useEffect(() => {
    if (!running) return;
    if (idx >= chunks.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setIdx((i) => i + 1), interval);
    return () => clearTimeout(t);
  }, [running, idx, interval, chunks.length]);

  const reset = () => { setRunning(false); setIdx(0); };
  const current = chunks[idx] || "";
  const orp = Math.max(0, Math.floor(current.length / 3));

  return (
    <Section title="Pacer Drill" desc={`Locks you to ${wpm} WPM. Focus on the red letter — let the meaning land without subvocalising.`}>
      <Callout icon={Info} tone="muted"
        body={`Recommended start: ${recommended} WPM (50 above your baseline). Push up by 25–50 WPM once comprehension feels solid.`} />
      <div style={styles.pacerStage}>
        <div style={styles.pacerCrosshair}>
          <span style={styles.pacerWordLeft}>{current.slice(0, orp)}</span>
          <span style={styles.pacerWordOrp}>{current[orp] || " "}</span>
          <span style={styles.pacerWordRight}>{current.slice(orp + 1)}</span>
        </div>
        <div style={styles.pacerProgress}>
          <div style={{ ...styles.pacerProgressFill, width: `${(idx / Math.max(chunks.length - 1, 1)) * 100}%` }} />
        </div>
        <div style={styles.pacerMeta}>Word {idx + 1} of {chunks.length} · {wpm} WPM · chunks of {chunkSize}</div>
      </div>
      <div style={styles.controls}>
        <PresetRow current={wpm} onPick={setWpm} />
        <Slider label="Target WPM" value={wpm} min={150} max={700} step={10} onChange={setWpm} />
        <Slider label="Chunk size" value={chunkSize} min={1} max={4} step={1} onChange={setChunkSize} />
        <PassageSelector value={passageIndex} onChange={(v) => { setPassageIndex(v); reset(); }} />
        <div style={styles.btnRow}>
          <button style={styles.primaryBtn} onClick={() => setRunning((r) => !r)}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
          </button>
          <button style={styles.ghostBtn} onClick={reset}><RotateCcw size={16} /> Reset</button>
        </div>
      </div>
    </Section>
  );
}

function PresetRow({ current, onPick }) {
  const presets = [
    { wpm: 300, label: "Min" },
    { wpm: 400, label: "Target" },
    { wpm: 500, label: "Stretch" },
  ];
  return (
    <div style={styles.presetRow}>
      <span style={styles.label}>UCAT presets</span>
      <div style={styles.presetBtns}>
        {presets.map((p) => (
          <button key={p.wpm} onClick={() => onPick(p.wpm)}
            style={{
              ...styles.presetBtn,
              borderColor: current === p.wpm ? theme.accent : theme.border,
              color: current === p.wpm ? theme.ink : theme.inkDim,
              background: current === p.wpm ? "rgba(124,92,255,0.12)" : theme.bg,
            }}>
            <span style={styles.presetBtnWpm}>{p.wpm}</span>
            <span style={styles.presetBtnLabel}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// CHUNKING
// =================================================================
function ChunkingMode({ baseline }) {
  const [cols, setCols] = useState(3);
  const [highlight, setHighlight] = useState(0);
  const [running, setRunning] = useState(false);
  const [wpm, setWpm] = useState(Math.min(500, Math.max(350, baseline.wpm + 50)));
  const [passageIndex, setPassageIndex] = useState(0);
  const passage = PASSAGE_BANK[passageIndex];
  const lines = useMemo(() => {
    const words = passage.text.split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < words.length; i += cols) out.push(words.slice(i, i + cols));
    return out;
  }, [passage, cols]);

  useEffect(() => {
    if (!running) return;
    const interval = (60 / wpm) * 1000 * cols;
    if (highlight >= lines.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setHighlight((h) => h + 1), interval);
    return () => clearTimeout(t);
  }, [running, highlight, wpm, cols, lines.length]);

  return (
    <Section title="Chunking Drill" desc="Take in word groups in one fixation. Don't read word-by-word — let your eye land between the columns.">
      <div style={styles.chunkStage}>
        {lines.map((line, i) => (
          <div key={i} style={{
            ...styles.chunkLine,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            opacity: i === highlight ? 1 : i < highlight ? 0.25 : 0.45,
            background: i === highlight ? "rgba(124,92,255,0.08)" : "transparent",
            borderLeft: i === highlight ? `2px solid ${theme.accent}` : "2px solid transparent",
          }}>
            {line.map((w, j) => (<span key={j} style={styles.chunkWord}>{w}</span>))}
          </div>
        ))}
      </div>
      <div style={styles.controls}>
        <Slider label="Words per fixation" value={cols} min={2} max={5} step={1} onChange={setCols} />
        <Slider label="Target WPM" value={wpm} min={200} max={700} step={10} onChange={setWpm} />
        <PassageSelector value={passageIndex} onChange={(v) => { setPassageIndex(v); setHighlight(0); setRunning(false); }} />
        <div style={styles.btnRow}>
          <button style={styles.primaryBtn} onClick={() => setRunning((r) => !r)}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
          </button>
          <button style={styles.ghostBtn} onClick={() => { setHighlight(0); setRunning(false); }}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>
    </Section>
  );
}

// =================================================================
// SCAN
// =================================================================
function ScanMode() {
  const [passageIndex, setPassageIndex] = useState(0);
  const [stage, setStage] = useState("ready");
  const [targetIdx, setTargetIdx] = useState(0);
  const [found, setFound] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const passage = PASSAGE_BANK[passageIndex];

  const keywords = useMemo(() => {
    const candidates = passage.text
      .replace(/[.,;:"']/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 6 && /^[a-z]+$/.test(w));
    const unique = [...new Set(candidates)];
    return unique.slice(0, 4);
  }, [passage]);

  useEffect(() => {
    if (stage !== "scanning") return;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(t);
  }, [stage]);

  const start = () => {
    setStage("scanning"); setTargetIdx(0); setFound([]); setElapsed(0); startRef.current = Date.now();
  };

  const handleWordClick = (word) => {
    const clean = word.replace(/[.,;:"']/g, "").toLowerCase();
    const target = keywords[targetIdx]?.toLowerCase();
    if (clean === target) {
      const next = targetIdx + 1;
      setFound([...found, { word: target, t: elapsed }]);
      if (next >= keywords.length) setStage("done");
      else setTargetIdx(next);
    }
  };

  return (
    <Section title="Scan Drill" desc="The dominant UCAT VR strategy: read the question first, then scan for keywords. This drill trains the scan itself.">
      <Callout icon={AlertCircle} tone="warn" title="Why this matters for UCAT"
        body="Most T/F/CT questions don't need a full read. Top scorers scan for keywords and read only the surrounding sentence. This drill builds that reflex." />
      {stage === "ready" && (
        <div style={styles.passageReady}>
          <PassageSelector value={passageIndex} onChange={setPassageIndex} />
          <div style={styles.passagePreview}>
            <div style={styles.passageMeta}>
              <span>{passage.difficulty}</span><span>·</span>
              <span>{passage.wordCount} words</span><span>·</span>
              <span>4 keywords to find</span>
            </div>
            <h3 style={styles.passageTitle}>{passage.title}</h3>
            <p style={styles.passagePreviewText}>You'll be shown one keyword at a time. Click it in the passage as fast as you can.</p>
          </div>
          <button style={styles.primaryBtn} onClick={start}><Play size={16} /> Start scanning</button>
        </div>
      )}
      {stage === "scanning" && (
        <div>
          <div style={styles.scanBar}>
            <div style={styles.scanTarget}>
              <span style={styles.scanTargetLabel}>Find:</span>
              <span style={styles.scanTargetWord}>{keywords[targetIdx]}</span>
            </div>
            <div style={styles.scanProgress}>
              <Clock size={14} />
              <span>{elapsed.toFixed(1)}s</span>
              <span style={styles.timerDivider}>·</span>
              <span>{targetIdx} / {keywords.length}</span>
            </div>
          </div>
          <article style={styles.passageBody}>
            <h2 style={styles.passageTitle}>{passage.title}</h2>
            {passage.text.split("\n\n").map((p, pi) => (
              <p key={pi} style={styles.passagePara}>
                {p.split(/\s+/).map((w, wi) => {
                  const clean = w.replace(/[.,;:"']/g, "").toLowerCase();
                  const isFound = found.some((f) => f.word === clean);
                  return (
                    <React.Fragment key={wi}>
                      <span onClick={() => handleWordClick(w)} style={{
                        cursor: "pointer",
                        background: isFound ? "rgba(34,211,168,0.15)" : "transparent",
                        color: isFound ? theme.accent2 : theme.ink,
                        padding: "0 1px", borderRadius: 2,
                      }}>{w}</span>{" "}
                    </React.Fragment>
                  );
                })}
              </p>
            ))}
          </article>
        </div>
      )}
      {stage === "done" && (
        <div style={styles.results}>
          <div style={styles.resultsGrid}>
            <BigStat label="Total scan time" value={elapsed.toFixed(1)} unit="sec" accent={theme.accent} />
            <BigStat label="Avg per keyword" value={(elapsed / keywords.length).toFixed(1)} unit="sec" accent={theme.accent2} />
          </div>
          <div style={styles.resultsReview}>
            <div style={styles.resultsReviewTitle}>Keyword find times</div>
            {found.map((f, i) => (
              <div key={i} style={styles.resultRow}>
                <CheckCircle2 size={16} color={theme.accent2} />
                <div style={styles.resultRowText}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{f.word}</span>
                  <span style={{ color: theme.inkDim, marginLeft: 12 }}>
                    {i === 0 ? f.t.toFixed(1) : (f.t - found[i - 1].t).toFixed(1)}s
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button style={styles.primaryBtn} onClick={() => setStage("ready")}>
            <RotateCcw size={16} /> Another scan
          </button>
        </div>
      )}
    </Section>
  );
}

// =================================================================
// PASSAGE
// =================================================================
function PassageMode({ onComplete, baseline }) {
  const [passageIndex, setPassageIndex] = useState(0);
  const [stage, setStage] = useState("ready");
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState({});
  const startRef = useRef(0);
  const passage = PASSAGE_BANK[passageIndex];

  useEffect(() => {
    if (stage !== "reading") return;
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(t);
  }, [stage]);

  const startReading = () => { setElapsed(0); setAnswers({}); startRef.current = Date.now(); setStage("reading"); };
  const submitQuiz = () => {
    const correct = passage.questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const comp = Math.round((correct / passage.questions.length) * 100);
    const wpm = Math.round((passage.wordCount / elapsed) * 60);
    onComplete(wpm, comp);
    setStage("done");
  };

  const wpmNow = elapsed > 0 ? Math.round((passage.wordCount / elapsed) * 60) : 0;
  const ucatPassageTarget = Math.round((passage.wordCount / 400) * 60);

  return (
    <Section title="Passage Drill" desc="Real UCAT-style passage, timed end-to-end, then comprehension check.">
      {stage === "ready" && (
        <div style={styles.passageReady}>
          <PassageSelector value={passageIndex} onChange={setPassageIndex} />
          <div style={styles.passagePreview}>
            <div style={styles.passageMeta}>
              <span>{passage.difficulty}</span><span>·</span>
              <span>{passage.wordCount} words</span><span>·</span>
              <span>{passage.questions.length} questions</span><span>·</span>
              <span style={{ color: theme.accent2 }}>UCAT target: {ucatPassageTarget}s read</span>
            </div>
            <h3 style={styles.passageTitle}>{passage.title}</h3>
            <p style={styles.passagePreviewText}>{passage.text.slice(0, 140)}…</p>
          </div>
          <button style={styles.primaryBtn} onClick={startReading}><Play size={16} /> Start timing</button>
        </div>
      )}
      {stage === "reading" && (
        <div>
          <div style={styles.timerBar}>
            <div style={styles.timerLeft}>
              <Clock size={14} />
              <span>{elapsed.toFixed(1)}s</span>
              <span style={styles.timerDivider}>·</span>
              <span style={{ color: wpmNow >= 400 ? theme.accent2 : wpmNow >= 300 ? theme.warnSoft : theme.warn }}>
                {wpmNow} WPM pace
              </span>
              <span style={styles.timerDivider}>·</span>
              <span style={{ color: theme.inkDim }}>UCAT target {ucatPassageTarget}s</span>
            </div>
            <button style={styles.primaryBtn} onClick={() => setStage("quiz")}>
              Done reading <ChevronRight size={16} />
            </button>
          </div>
          <article style={styles.passageBody}>
            <h2 style={styles.passageTitle}>{passage.title}</h2>
            {passage.text.split("\n\n").map((p, i) => (<p key={i} style={styles.passagePara}>{p}</p>))}
          </article>
        </div>
      )}
      {stage === "quiz" && (
        <Quiz passage={passage} answers={answers} setAnswers={setAnswers} onSubmit={submitQuiz} elapsed={elapsed} wpm={wpmNow} />
      )}
      {stage === "done" && (
        <Results passage={passage} answers={answers} elapsed={elapsed} baseline={baseline} onRestart={() => setStage("ready")} />
      )}
    </Section>
  );
}

function Quiz({ passage, answers, setAnswers, onSubmit, elapsed, wpm }) {
  return (
    <div style={styles.quiz}>
      <div style={styles.quizHeader}>
        <span style={styles.quizPill}>Comprehension check</span>
        {elapsed != null && <span style={styles.quizTime}>Read in {elapsed.toFixed(1)}s · {wpm} WPM</span>}
      </div>
      {passage.questions.map((q, i) => (
        <div key={i} style={styles.quizQ}>
          <div style={styles.quizQText}>{i + 1}. {q.q}</div>
          <div style={styles.quizOpts}>
            {q.options.map((opt, j) => (
              <button key={j} onClick={() => setAnswers({ ...answers, [i]: j })}
                style={{
                  ...styles.quizOpt,
                  borderColor: answers[i] === j ? theme.accent : theme.border,
                  background: answers[i] === j ? "rgba(124,92,255,0.12)" : theme.panel,
                }}>
                <span style={styles.quizOptLetter}>{"ABCD"[j]}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button style={{ ...styles.primaryBtn, opacity: Object.keys(answers).length === passage.questions.length ? 1 : 0.4 }}
        disabled={Object.keys(answers).length !== passage.questions.length}
        onClick={onSubmit}>
        Submit <ChevronRight size={16} />
      </button>
    </div>
  );
}

function Results({ passage, answers, elapsed, baseline, onRestart }) {
  const correct = passage.questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const wpm = Math.round((passage.wordCount / elapsed) * 60);
  const comp = Math.round((correct / passage.questions.length) * 100);
  const delta = baseline ? wpm - baseline.wpm : 0;
  const tier = TIER(wpm);
  return (
    <div style={styles.results}>
      <div style={styles.resultsGrid}>
        <BigStat label="Reading speed" value={wpm} unit="WPM" accent={tier.color} />
        <BigStat label="Comprehension" value={comp} unit="%" accent={comp >= 80 ? theme.accent2 : theme.warn} />
        <BigStat label="Time" value={elapsed.toFixed(1)} unit="sec" accent={theme.warn} />
      </div>
      {baseline && delta !== 0 && (
        <Callout icon={delta > 0 ? TrendingUp : AlertCircle} tone={delta > 0 ? "accent" : "warn"}
          body={`${delta > 0 ? "+" : ""}${delta} WPM vs your baseline of ${baseline.wpm} WPM. ${comp < 80 ? "Comprehension is below 80% — slow down slightly until it stabilises." : "Keep pushing."}`} />
      )}
      <SpeedScale current={wpm} />
      <div style={styles.resultsReview}>
        <div style={styles.resultsReviewTitle}>Question review</div>
        {passage.questions.map((q, i) => {
          const ok = answers[i] === q.answer;
          return (
            <div key={i} style={styles.resultRow}>
              {ok ? <CheckCircle2 size={16} color={theme.accent2} /> : <XCircle size={16} color={theme.danger} />}
              <div style={styles.resultRowText}>
                <div>{q.q}</div>
                {!ok && <div style={styles.resultCorrect}>Correct: {q.options[q.answer]}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <button style={styles.primaryBtn} onClick={onRestart}><RotateCcw size={16} /> Another passage</button>
    </div>
  );
}

function BigStat({ label, value, unit, accent }) {
  return (
    <div style={styles.bigStat}>
      <div style={styles.bigStatLabel}>{label}</div>
      <div style={styles.bigStatValueRow}>
        <span style={{ ...styles.bigStatValue, color: accent }}>{value}</span>
        <span style={styles.bigStatUnit}>{unit}</span>
      </div>
    </div>
  );
}

// =================================================================
// PROGRESS
// =================================================================
function ProgressMode({ history, baseline }) {
  if (history.length === 0) {
    return <Section title="Progress" desc="Run a passage drill to start tracking sessions.">
      <div style={styles.emptyState}>No sessions yet.</div>
    </Section>;
  }
  const maxWpm = Math.max(...history.map((h) => h.wpm), 500);
  const avgWpm = Math.round(history.reduce((a, b) => a + b.wpm, 0) / history.length);
  const avgComp = Math.round(history.reduce((a, b) => a + b.comp, 0) / history.length);
  const latest = history[history.length - 1];
  const delta = latest.wpm - baseline.wpm;
  return (
    <Section title="Progress" desc="Reading speed and comprehension across sessions.">
      <div style={styles.progressTop}>
        <BigStat label="Best WPM" value={Math.max(...history.map((h) => h.wpm))} unit="WPM" accent={theme.accent} />
        <BigStat label="Avg WPM" value={avgWpm} unit="WPM" accent={theme.accent2} />
        <BigStat label="Avg comprehension" value={avgComp} unit="%" accent={theme.warn} />
        <BigStat label="Gain vs baseline" value={`${delta >= 0 ? "+" : ""}${delta}`} unit="WPM"
          accent={delta >= 0 ? theme.accent2 : theme.danger} />
      </div>
      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>WPM trend (target line: 400 WPM)</div>
        <div style={styles.chart}>
          <div style={{ ...styles.targetLine, bottom: `${(400 / (maxWpm * 1.15)) * 100}%` }}>
            <span style={styles.targetLineLabel}>400 target</span>
          </div>
          {history.map((h, i) => {
            const heightPct = (h.wpm / (maxWpm * 1.15)) * 100;
            return (
              <div key={i} style={styles.chartCol}>
                <div style={styles.chartVal}>{h.wpm}</div>
                <div style={{
                  ...styles.chartBar, height: `${heightPct}%`,
                  background: h.wpm >= 400
                    ? `linear-gradient(180deg, ${theme.accent} 0%, ${theme.accent2} 100%)`
                    : `linear-gradient(180deg, ${theme.warn} 0%, ${theme.warnSoft} 100%)`,
                }} />
                <div style={styles.chartLabel}>{h.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// =================================================================
// SHARED
// =================================================================
function Section({ title, desc, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHead}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.sectionDesc}>{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <div style={styles.sliderRow}>
      <div style={styles.sliderHead}>
        <span style={styles.label}>{label}</span>
        <span style={styles.sliderVal}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={styles.slider} />
    </div>
  );
}

function PassageSelector({ value, onChange }) {
  return (
    <div style={styles.selectRow}>
      <label style={styles.label}>Passage</label>
      <select style={styles.select} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {PASSAGE_BANK.map((p, i) => (
          <option key={p.id} value={i}>{p.title} · {p.difficulty} · {p.wordCount}w</option>
        ))}
      </select>
    </div>
  );
}

function Callout({ icon: Icon, tone, title, body }) {
  const toneStyles = {
    accent: { border: theme.accent + "60", bg: "rgba(124,92,255,0.08)", color: theme.accent },
    warn: { border: theme.warn + "60", bg: "rgba(244,162,97,0.08)", color: theme.warn },
    muted: { border: theme.border, bg: theme.panel, color: theme.inkDim },
  }[tone || "muted"];
  return (
    <div style={{ ...styles.callout, borderColor: toneStyles.border, background: toneStyles.bg }}>
      <div style={{ color: toneStyles.color, marginTop: 2 }}><Icon size={16} /></div>
      <div>
        {title && <div style={styles.calloutTitle}>{title}</div>}
        <div style={styles.calloutBody}>{body}</div>
      </div>
    </div>
  );
}

// =================================================================
// STYLES
// =================================================================
const styles = {
  app: { minHeight: "100vh", background: theme.bg, color: theme.ink,
    fontFamily: '"Inter", -apple-system, sans-serif', padding: "24px 32px 64px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: { width: 36, height: 36, borderRadius: 10,
    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`,
    display: "grid", placeItems: "center", color: "#0E1116" },
  brandTitle: { fontWeight: 600, fontSize: 16, letterSpacing: -0.2 },
  brandSub: { fontSize: 11, color: theme.inkDim, letterSpacing: 0.5, textTransform: "uppercase" },
  nav: { display: "flex", gap: 4, background: theme.panel, padding: 4, borderRadius: 10,
    border: `1px solid ${theme.border}`, flexWrap: "wrap" },
  navBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 7,
    fontSize: 13, border: "1px solid transparent", fontWeight: 500, transition: "all 0.15s" },
  main: { maxWidth: 1100, margin: "0 auto" },

  heroPanel: {
    background: `linear-gradient(135deg, ${theme.panel} 0%, ${theme.panel2} 100%)`,
    border: `1px solid ${theme.border}`, borderRadius: 16, padding: 32,
    display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "center",
  },
  eyebrow: { fontSize: 11, color: theme.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 },
  heroTitle: { fontSize: 34, lineHeight: 1.15, margin: 0, fontWeight: 700, letterSpacing: -1 },
  heroTitleSub: { fontSize: 18, color: theme.inkDim, fontWeight: 500 },
  heroSub: { color: theme.inkDim, fontSize: 14, lineHeight: 1.6, margin: "16px 0 24px", maxWidth: 420 },
  heroBtns: { display: "flex", gap: 8 },
  heroStats: { display: "grid", gap: 12 },

  stat: { display: "grid", gridTemplateColumns: "8px 1fr auto", alignItems: "center", gap: 12,
    background: theme.bg, padding: "14px 16px", borderRadius: 10, border: `1px solid ${theme.border}` },
  statDot: { width: 8, height: 8, borderRadius: 99 },
  statLabel: { color: theme.inkDim, fontSize: 13 },
  statSub: { color: theme.accent2, fontSize: 11, marginTop: 2 },
  statValue: { fontWeight: 600, fontSize: 18 },

  contextPanel: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24 },
  contextHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  contextIcon: { width: 32, height: 32, borderRadius: 8, background: theme.panel2,
    display: "grid", placeItems: "center", color: theme.accent, border: `1px solid ${theme.border}` },
  contextTitle: { fontWeight: 600, fontSize: 15 },
  contextSub: { color: theme.inkDim, fontSize: 12 },
  contextGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 },
  contextCell: { background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
    padding: "12px 10px", textAlign: "center" },
  contextCellN: { fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 600, color: theme.accent2 },
  contextCellLabel: { fontSize: 10.5, color: theme.inkDim, marginTop: 4, lineHeight: 1.3 },
  contextProse: { color: theme.inkDim, fontSize: 13.5, lineHeight: 1.65, margin: 0 },

  drillsHead: { fontSize: 11, color: theme.inkDim, letterSpacing: 1.5,
    textTransform: "uppercase", fontWeight: 600, marginTop: 4 },
  grid1: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },

  modesBanner: {
    background: `linear-gradient(135deg, rgba(124,92,255,0.08), rgba(34,211,168,0.08))`,
    border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24,
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24,
  },
  modesBannerHead: { flex: 1 },
  modesBannerEyebrow: { fontSize: 11, color: theme.accent2, letterSpacing: 1.5,
    textTransform: "uppercase", fontWeight: 600, marginBottom: 6 },
  modesBannerTitle: { fontSize: 18, fontWeight: 700, letterSpacing: -0.3 },
  modesBannerSub: { color: theme.inkDim, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0", maxWidth: 500 },

  modeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  modeCard: {
    background: theme.panel, border: "1px solid",
    borderRadius: 14, padding: 24, position: "relative",
  },
  modeBadge: {
    display: "inline-block", padding: "4px 10px", borderRadius: 6,
    color: "#0E1116", fontSize: 11, fontWeight: 700,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12,
  },
  modeName: { fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginBottom: 4 },
  modeWhen: { color: theme.inkDim, fontSize: 13, lineHeight: 1.5 },
  modeDivider: { height: 1, background: theme.border, margin: "16px 0" },
  modeMetaRow: { display: "flex", gap: 8, fontSize: 13, marginBottom: 8, lineHeight: 1.5 },
  modeMetaLabel: { color: theme.inkDim, minWidth: 50, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, paddingTop: 2 },
  modeMetaValue: { flex: 1, color: theme.ink },
  modeRationale: { color: theme.inkDim, fontSize: 13, lineHeight: 1.6, margin: "12px 0 16px" },

  routerPanel: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24 },
  routerHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  routerIcon: { width: 32, height: 32, borderRadius: 8, background: theme.panel2,
    display: "grid", placeItems: "center", color: theme.accent, border: `1px solid ${theme.border}` },
  routerTitle: { fontWeight: 600, fontSize: 15 },
  routerSub: { color: theme.inkDim, fontSize: 12 },
  routerGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 },
  routerBtn: {
    padding: "14px 12px", border: "1px solid", borderRadius: 9, cursor: "pointer",
    textAlign: "left", color: theme.ink, transition: "all 0.15s",
    display: "flex", flexDirection: "column", gap: 6,
  },
  routerBtnLabel: { fontSize: 13, fontWeight: 500 },
  routerBtnTag: { fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 },

  routerResult: { border: "1px solid", borderRadius: 12, padding: 20, marginTop: 8, display: "grid", gap: 16 },
  routerResultHead: { display: "flex", alignItems: "center", gap: 10 },
  routerResultBadge: {
    padding: "4px 10px", borderRadius: 6, color: "#0E1116",
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
  },
  routerResultName: { fontSize: 16, fontWeight: 600 },
  routerResultBody: { display: "grid", gap: 10 },
  routerResultRow: { display: "grid", gridTemplateColumns: "70px 1fr", gap: 12, fontSize: 13, lineHeight: 1.55 },
  routerResultLabel: { color: theme.inkDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, paddingTop: 2 },
  routerResultExample: { fontStyle: "italic", color: theme.ink },

  workflowPanel: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24 },
  workflowTitle: { fontSize: 11, color: theme.inkDim, letterSpacing: 1.5,
    textTransform: "uppercase", fontWeight: 600, marginBottom: 20 },
  workflowSteps: { display: "grid", gap: 16 },
  workflowStep: { display: "grid", gridTemplateColumns: "32px 1fr", gap: 14, alignItems: "start" },
  workflowN: { width: 28, height: 28, borderRadius: 8, background: theme.panel2,
    color: theme.accent2, fontWeight: 700, display: "grid", placeItems: "center",
    fontSize: 13, fontFamily: '"JetBrains Mono", monospace', border: `1px solid ${theme.border}` },
  workflowStepTitle: { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  workflowStepBody: { color: theme.inkDim, fontSize: 13, lineHeight: 1.5 },

  // Language traps panel (Strategy page)
  trapsPanel: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24 },
  trapsHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  trapsIcon: {
    width: 32, height: 32, borderRadius: 8, background: theme.panel2,
    display: "grid", placeItems: "center", color: theme.warn, border: `1px solid ${theme.border}`,
  },
  trapsTitle: { fontWeight: 600, fontSize: 15 },
  trapsSub: { color: theme.inkDim, fontSize: 12 },
  trapsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  trapCard: {
    background: theme.bg, border: "1px solid", borderRadius: 10, padding: 16,
    display: "grid", gap: 12,
  },
  trapBadge: {
    display: "inline-block", padding: "4px 10px", borderRadius: 6,
    color: "#0E1116", fontSize: 11, fontWeight: 700,
    letterSpacing: 0.5, textTransform: "uppercase",
    justifySelf: "start",
  },
  trapRule: { fontSize: 12.5, color: theme.inkDim, lineHeight: 1.55 },
  trapWords: { display: "flex", flexWrap: "wrap", gap: 4 },
  trapWord: {
    fontSize: 11, padding: "3px 7px", borderRadius: 4,
    border: "1px solid", fontFamily: '"JetBrains Mono", monospace',
  },

  // Qualifier drill legend
  trapLegend: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  trapLegendItem: {
    background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10,
    padding: 14, display: "grid", gridTemplateColumns: "12px 1fr", gap: 10, alignItems: "start",
  },
  trapLegendDot: { width: 12, height: 12, borderRadius: 99, marginTop: 4 },
  trapLegendName: { fontSize: 13, fontWeight: 600, marginBottom: 3 },
  trapLegendRule: { fontSize: 11.5, color: theme.inkDim, lineHeight: 1.5 },

  // Triage drill
  triageCard: {
    background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14,
    padding: 28, display: "grid", gap: 20,
  },
  triageHead: {
    display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
  },
  triageProgress: {
    fontSize: 11, color: theme.inkDim, letterSpacing: 1,
    textTransform: "uppercase", fontWeight: 600,
  },
  triageCountdown: {
    height: 4, background: theme.panel2, borderRadius: 99, overflow: "hidden",
  },
  triageCountdownBar: { height: "100%", transition: "width 0.1s linear, background 0.2s" },
  triageTimer: {
    fontFamily: '"JetBrains Mono", monospace', fontSize: 14, fontWeight: 600,
    color: theme.ink, minWidth: 50, textAlign: "right",
  },
  triagePill: {
    fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
    background: theme.panel2, padding: "5px 10px", borderRadius: 99,
    border: `1px solid ${theme.border}`, color: theme.accent, fontWeight: 600,
  },
  triageStem: {
    fontSize: 17, lineHeight: 1.55, fontFamily: '"Source Serif Pro", Georgia, serif',
    color: theme.ink,
  },
  triageContext: {
    fontSize: 13, lineHeight: 1.55, color: theme.inkDim,
    padding: "12px 14px", background: theme.bg, borderRadius: 8,
    border: `1px solid ${theme.border}`,
  },
  triageContextLabel: {
    color: theme.accent2, fontWeight: 600,
    textTransform: "uppercase", fontSize: 10, letterSpacing: 1, marginRight: 6,
  },
  triageBtns: { display: "flex", gap: 8 },
  triageAnswerBtns: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  card: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14,
    padding: 20, textAlign: "left", color: theme.ink, cursor: "pointer", position: "relative",
    transition: "all 0.2s" },
  cardIcon: { width: 36, height: 36, borderRadius: 9, background: theme.panel2,
    display: "grid", placeItems: "center", marginBottom: 16, color: theme.accent,
    border: `1px solid ${theme.border}` },
  cardTag: { position: "absolute", top: 20, right: 20, fontSize: 10, letterSpacing: 0.8,
    textTransform: "uppercase", color: theme.inkDim,
    padding: "4px 8px", border: `1px solid ${theme.border}`, borderRadius: 99 },
  cardTitle: { fontWeight: 600, fontSize: 16, marginBottom: 6 },
  cardDesc: { color: theme.inkDim, fontSize: 13, lineHeight: 1.5, marginBottom: 16 },
  cardCta: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: theme.accent, fontWeight: 500 },

  section: { display: "grid", gap: 20 },
  sectionHead: { marginBottom: 4 },
  sectionTitle: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.4 },
  sectionDesc: { color: theme.inkDim, fontSize: 14, marginTop: 6, maxWidth: 600 },

  baselineCard: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 28, display: "grid", gap: 24 },
  baselineSteps: { display: "grid", gap: 16 },
  baselineStep: { display: "grid", gridTemplateColumns: "32px 1fr", gap: 14, alignItems: "start" },
  baselineStepN: { width: 28, height: 28, borderRadius: 8, background: theme.panel2,
    color: theme.accent, fontWeight: 700, display: "grid", placeItems: "center",
    fontSize: 13, fontFamily: '"JetBrains Mono", monospace', border: `1px solid ${theme.border}` },
  baselineStepTitle: { fontWeight: 600, fontSize: 14, marginBottom: 4 },
  baselineStepBody: { color: theme.inkDim, fontSize: 13, lineHeight: 1.5 },

  baselineResult: { display: "grid", gap: 20 },
  baselineHero: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14,
    padding: 32, textAlign: "center" },
  baselineHeroLabel: { fontSize: 11, color: theme.inkDim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 },
  baselineHeroValue: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, margin: "12px 0",
    fontSize: 56, fontWeight: 700, letterSpacing: -2, fontFamily: '"JetBrains Mono", monospace' },
  baselineHeroUnit: { fontSize: 16, color: theme.inkDim, fontFamily: '"Inter", sans-serif', fontWeight: 500 },
  baselineNote: { color: theme.inkDim, fontSize: 14, lineHeight: 1.6, margin: "12px auto 0", maxWidth: 420 },
  baselineStats: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  tierPill: { display: "inline-block", padding: "4px 12px", borderRadius: 99,
    fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
    border: "1px solid", marginTop: 4 },

  scaleWrap: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "20px 24px 36px" },
  scaleTitle: { fontSize: 12, color: theme.inkDim, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 20 },
  scaleTrack: { position: "relative", height: 8, background: theme.panel2, borderRadius: 99, marginTop: 24, marginBottom: 36 },
  scaleFill: { height: "100%", borderRadius: 99, transition: "width 0.6s ease-out" },
  scaleMarker: { position: "absolute", top: -16, transform: "translateX(-50%)", textAlign: "center" },
  scaleMarkerDot: { width: 12, height: 12, borderRadius: 99, background: theme.ink,
    border: `2px solid ${theme.bg}`, margin: "0 auto" },
  scaleMarkerLabel: { fontSize: 12, fontWeight: 600, color: theme.ink, marginTop: 4,
    background: theme.bg, padding: "2px 8px", borderRadius: 6, border: `1px solid ${theme.border}`,
    fontFamily: '"JetBrains Mono", monospace' },
  scaleStop: { position: "absolute", top: 16, transform: "translateX(-50%)", fontSize: 11 },
  scaleStopTick: { width: 1, height: 6, background: theme.border, margin: "0 auto" },
  scaleStopLabel: { marginTop: 4, fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" },
  scaleStopSub: { display: "block", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },

  pacerStage: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14,
    padding: "60px 24px 24px", textAlign: "center" },
  pacerCrosshair: { fontFamily: '"JetBrains Mono", monospace', fontSize: 44, fontWeight: 500,
    letterSpacing: -1, minHeight: 80, display: "flex", justifyContent: "center", alignItems: "center" },
  pacerWordLeft: { color: theme.ink },
  pacerWordOrp: { color: theme.danger, fontWeight: 700 },
  pacerWordRight: { color: theme.ink },
  pacerProgress: { height: 3, background: theme.panel2, borderRadius: 99, marginTop: 40, overflow: "hidden" },
  pacerProgressFill: { height: "100%", background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`, transition: "width 0.1s linear" },
  pacerMeta: { fontSize: 12, color: theme.inkDim, marginTop: 12, letterSpacing: 0.5 },

  presetRow: { display: "grid", gap: 8 },
  presetBtns: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  presetBtn: { padding: "12px 8px", border: "1px solid", borderRadius: 9,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    cursor: "pointer", transition: "all 0.15s" },
  presetBtnWpm: { fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 600 },
  presetBtnLabel: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },

  chunkStage: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24,
    fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 17, lineHeight: 1.7,
    maxHeight: 480, overflow: "auto" },
  chunkLine: { display: "grid", padding: "8px 12px", borderRadius: 6, transition: "all 0.2s" },
  chunkWord: { textAlign: "center", padding: "0 4px" },

  scanBar: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12,
    padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, position: "sticky", top: 0, zIndex: 5 },
  scanTarget: { display: "flex", alignItems: "center", gap: 12 },
  scanTargetLabel: { fontSize: 11, color: theme.inkDim, letterSpacing: 1, textTransform: "uppercase" },
  scanTargetWord: { fontFamily: '"JetBrains Mono", monospace', fontSize: 20, fontWeight: 600,
    color: theme.warnSoft, background: "rgba(244,211,94,0.1)", padding: "4px 12px", borderRadius: 6 },
  scanProgress: { display: "flex", alignItems: "center", gap: 6, fontSize: 13,
    color: theme.inkDim, fontFamily: '"JetBrains Mono", monospace' },

  controls: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 20, display: "grid", gap: 16 },
  sliderRow: { display: "grid", gap: 6 },
  sliderHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, color: theme.inkDim },
  sliderVal: { fontSize: 14, fontWeight: 600, color: theme.accent },
  slider: { width: "100%", accentColor: theme.accent },
  selectRow: { display: "grid", gap: 6 },
  select: { background: theme.bg, color: theme.ink, border: `1px solid ${theme.border}`,
    borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit" },
  btnRow: { display: "flex", gap: 8 },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 6,
    background: theme.accent, color: "#0E1116", border: "none",
    padding: "10px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13,
    cursor: "pointer", transition: "all 0.15s" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 6,
    background: "transparent", color: theme.ink, border: `1px solid ${theme.border}`,
    padding: "10px 16px", borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: "pointer" },

  passageReady: { display: "grid", gap: 20, maxWidth: 600 },
  passagePreview: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 },
  passageMeta: { display: "flex", gap: 8, fontSize: 11, color: theme.inkDim,
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, flexWrap: "wrap" },
  passageTitle: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.4 },
  passagePreviewText: { color: theme.inkDim, fontSize: 14, marginTop: 12, lineHeight: 1.6 },
  timerBar: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12,
    padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, position: "sticky", top: 0, zIndex: 5 },
  timerLeft: { display: "flex", alignItems: "center", gap: 8, fontSize: 13,
    color: theme.inkDim, fontFamily: '"JetBrains Mono", monospace', flexWrap: "wrap" },
  timerDivider: { color: theme.border },
  passageBody: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14,
    padding: "32px 40px", fontFamily: '"Source Serif Pro", Georgia, serif',
    fontSize: 17, lineHeight: 1.75, maxWidth: 720, margin: "0 auto" },
  passagePara: { margin: "16px 0", color: theme.ink },

  quiz: { display: "grid", gap: 16 },
  quizHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  quizPill: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
    background: theme.panel2, padding: "5px 10px", borderRadius: 99,
    border: `1px solid ${theme.border}`, color: theme.accent2, fontWeight: 600 },
  quizTime: { fontSize: 13, color: theme.inkDim, fontFamily: '"JetBrains Mono", monospace' },
  quizQ: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 },
  quizQText: { fontSize: 15, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 },
  quizOpts: { display: "grid", gap: 8 },
  quizOpt: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    border: `1px solid ${theme.border}`, borderRadius: 9, cursor: "pointer",
    color: theme.ink, fontSize: 14, textAlign: "left", transition: "all 0.15s" },
  quizOptLetter: { width: 24, height: 24, borderRadius: 6, background: theme.bg,
    display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600,
    color: theme.inkDim, fontFamily: '"JetBrains Mono", monospace' },

  results: { display: "grid", gap: 20 },
  resultsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  bigStat: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 },
  bigStatLabel: { fontSize: 12, color: theme.inkDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  bigStatValueRow: { display: "flex", alignItems: "baseline", gap: 6 },
  bigStatValue: { fontSize: 36, fontWeight: 700, letterSpacing: -1, fontFamily: '"JetBrains Mono", monospace' },
  bigStatUnit: { fontSize: 13, color: theme.inkDim },
  resultsReview: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, display: "grid", gap: 12 },
  resultsReviewTitle: { fontSize: 13, fontWeight: 600, color: theme.inkDim, textTransform: "uppercase", letterSpacing: 1 },
  resultRow: { display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderTop: `1px solid ${theme.border}` },
  resultRowText: { fontSize: 14, lineHeight: 1.5 },
  resultCorrect: { color: theme.accent2, fontSize: 13, marginTop: 4 },

  callout: { display: "grid", gridTemplateColumns: "20px 1fr", gap: 12,
    padding: "14px 16px", borderRadius: 10, border: "1px solid" },
  calloutTitle: { fontWeight: 600, fontSize: 13, marginBottom: 4 },
  calloutBody: { color: theme.inkDim, fontSize: 13, lineHeight: 1.55 },

  progressTop: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  chartCard: { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 24 },
  chartTitle: { fontSize: 13, fontWeight: 600, color: theme.inkDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 24 },
  chart: { display: "flex", alignItems: "flex-end", gap: 16, height: 240, paddingBottom: 28, position: "relative" },
  targetLine: { position: "absolute", left: 0, right: 0, height: 1,
    background: `${theme.accent2}80`, zIndex: 1 },
  targetLineLabel: { position: "absolute", right: 0, top: -18, fontSize: 10,
    color: theme.accent2, letterSpacing: 1, textTransform: "uppercase",
    fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' },
  chartCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    height: "100%", justifyContent: "flex-end", position: "relative", zIndex: 2 },
  chartVal: { fontSize: 11, color: theme.inkDim, marginBottom: 6, fontFamily: '"JetBrains Mono", monospace' },
  chartBar: { width: "100%", borderRadius: "6px 6px 0 0", minHeight: 4 },
  chartLabel: { fontSize: 11, color: theme.inkDim, position: "absolute", bottom: -20, letterSpacing: 0.5, textTransform: "uppercase" },

  emptyState: { color: theme.inkDim, textAlign: "center", padding: 40, fontSize: 14 },
};
