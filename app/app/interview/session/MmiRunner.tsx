'use client';
// The MMI sitting: rules → camera/mic check → stations (read aloud → prep →
// recorded answer → break) → save → results. Mirrors the asynchronous MMI:
// fixed timings, recording starts automatically, no re-records in a mock.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useMmiRecorder, type RecordMode } from '@/lib/mmi/useMmiRecorder';
import { LiveTranscript, readAloud, speechRecognitionSupported, stopReading } from '@/lib/mmi/speech';
import type { Edition, Preset, Station } from '@/lib/mmi/content';

type Phase = 'intro' | 'check' | 'read' | 'prep' | 'resp' | 'trans' | 'finishing';
type Props = {
  userId: string;
  edition: Edition;
  lang: string;
  kind: 'mock' | 'single';
  preset: Preset;
  stations: Station[];
  attributeLabels: Record<string, string>;
  /** Server can transcribe recordings, so feedback doesn't need browser speech recognition. */
  serverTranscribe: boolean;
};

const fmt = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export default function MmiRunner({ userId, edition, lang, kind, preset, stations, attributeLabels, serverTranscribe }: Props) {
  const router = useRouter();
  const rec = useMmiRecorder();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(0);
  const [answerMode, setAnswerMode] = useState<'speak' | 'type'>('speak');
  const [readOn, setReadOn] = useState(true);
  const [notes, setNotes] = useState('');
  const [typed, setTyped] = useState('');
  const [live, setLive] = useState({ text: '', interim: '' });
  const [showTranscript, setShowTranscript] = useState(false);
  const [recording, setRecording] = useState(false);
  const [saved, setSaved] = useState({ done: 0, failed: 0 });
  const [startError, setStartError] = useState<string | null>(null);
  const [srSupported, setSrSupported] = useState(false);

  const attemptRef = useRef<string | null>(null);
  const tokenRef = useRef(0);
  const phaseRef = useRef<Phase>('intro');
  const endAtRef = useRef(0);
  const respStartRef = useRef(0);
  const ltRef = useRef<LiveTranscript | null>(null);
  const endingRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const notesRef = useRef('');
  const typedRef = useRef('');
  const selfViewRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const station = stations[index];
  notesRef.current = notes;
  typedRef.current = typed;

  useEffect(() => setSrSupported(speechRecognitionSupported()), []);

  const go = useCallback((p: Phase, seconds = 0) => {
    phaseRef.current = p;
    setPhase(p);
    const e = seconds ? Date.now() + seconds * 1000 : 0;
    endAtRef.current = e;
    setEndAt(e);
    setNow(Date.now());
  }, []);

  // Attach the live stream to whichever <video> is on screen.
  useEffect(() => {
    const s = rec.stream.current;
    for (const v of [previewRef.current, selfViewRef.current]) {
      if (v && s && rec.mode === 'video' && v.srcObject !== s) {
        v.srcObject = s;
        void v.play().catch(() => {});
      }
    }
  }, [phase, rec.state, rec.mode, rec.stream]);

  // ---------- upload + save (runs in the background, in order) ----------
  const saveAnswer = useCallback(
    (position: number, payload: { clip: { blob: Blob; mime: string; seconds: number } | null; transcript: string; durationS: number; notes: string; mode: 'speak' | 'type' }) => {
      const attemptId = attemptRef.current!;
      queueRef.current = queueRef.current.then(async () => {
        const supabase = createClient();
        let mediaPath: string | null = null;
        if (payload.clip) {
          const ext = payload.clip.mime.includes('mp4') ? 'mp4' : 'webm';
          const path = `${userId}/${attemptId}/${position}.${ext}`;
          for (let tries = 0; tries < 3 && !mediaPath; tries++) {
            const { error } = await supabase.storage.from('mmi-recordings').upload(path, payload.clip.blob, { contentType: payload.clip.mime.split(';')[0], upsert: true });
            if (!error) mediaPath = path;
            else await new Promise((r) => setTimeout(r, 1000 * (tries + 1)));
          }
        }
        try {
          const res = await fetch('/api/mmi/responses', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              attemptId,
              position,
              mediaPath,
              mediaKind: mediaPath ? rec.mode : null,
              mime: payload.clip?.mime ?? null,
              mediaBytes: payload.clip?.blob.size ?? null,
              durationS: payload.durationS,
              transcript: payload.transcript,
              notes: payload.notes,
              answerMode: payload.mode,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as { id?: string };
          if (!res.ok || !data.id) throw new Error('save_failed');
          // Feedback is generated server-side; don't block the next station on it.
          void fetch('/api/mmi/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responseId: data.id }), keepalive: true }).catch(() => {});
          setSaved((s) => ({ ...s, done: s.done + 1, failed: s.failed + (payload.clip && !mediaPath ? 1 : 0) }));
        } catch {
          setSaved((s) => ({ ...s, failed: s.failed + 1 }));
        }
      });
    },
    [rec.mode, userId],
  );

  // ---------- station flow ----------
  const startResp = useCallback(
    (token: number) => {
      if (token !== tokenRef.current) return;
      respStartRef.current = Date.now();
      endingRef.current = false;
      setRecording(rec.startClip());
      setLive({ text: '', interim: '' });
      if (answerMode === 'speak' && srSupported) {
        const lt = new LiveTranscript(lang, (text, interim) => setLive({ text, interim }));
        ltRef.current = lt;
        lt.start();
      }
      go('resp', preset.responseS);
    },
    [answerMode, go, lang, preset.responseS, rec, srSupported],
  );

  const startPrep = useCallback(
    (token: number) => {
      if (token !== tokenRef.current) return;
      go('prep', preset.prepS);
    },
    [go, preset.prepS],
  );

  const startStation = useCallback(
    (i: number) => {
      const token = ++tokenRef.current;
      setIndex(i);
      setNotes('');
      setTyped('');
      setLive({ text: '', interim: '' });
      const st = stations[i];
      if (readOn) {
        go('read');
        void readAloud(`${st.scenario} ${st.question}`, lang).then(() => {
          if (phaseRef.current === 'read') startPrep(token);
        });
      } else startPrep(token);
    },
    [go, lang, readOn, startPrep, stations],
  );

  const finishAll = useCallback(async () => {
    go('finishing');
    await queueRef.current;
    const id = attemptRef.current;
    if (id) await fetch(`/api/mmi/attempts/${id}`, { method: 'PATCH' }).catch(() => {});
    rec.close();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.replace(id ? `/app/interview/results/${id}` : `/app/interview?edition=${edition}`);
  }, [edition, go, rec, router]);

  const endResp = useCallback(async () => {
    if (phaseRef.current !== 'resp' || endingRef.current) return;
    endingRef.current = true;
    const position = index;
    const durationS = Math.min(preset.responseS, Math.round((Date.now() - respStartRef.current) / 1000));
    const clip = await rec.stopClip();
    setRecording(false);
    let transcript = typedRef.current.trim();
    if (answerMode === 'speak') transcript = ltRef.current ? await ltRef.current.stop() : '';
    ltRef.current = null;
    saveAnswer(position, { clip, transcript, durationS, notes: notesRef.current, mode: answerMode });
    if (position >= stations.length - 1) void finishAll();
    else go('trans', preset.transitionS);
  }, [answerMode, finishAll, go, index, preset.responseS, preset.transitionS, rec, saveAnswer, stations.length]);

  const next = useCallback(() => startStation(index + 1), [index, startStation]);

  // Single clock: advances the phase when its time runs out.
  const handlers = useRef({ prep: () => {}, resp: () => {}, trans: () => {} });
  handlers.current = { prep: () => startResp(tokenRef.current), resp: () => void endResp(), trans: next };
  useEffect(() => {
    if (phase !== 'prep' && phase !== 'resp' && phase !== 'trans') return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (endAtRef.current && t >= endAtRef.current) {
        endAtRef.current = 0;
        handlers.current[phase as 'prep' | 'resp' | 'trans']();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  // Leaving mid-interview: stop speech and recording.
  useEffect(() => () => {
    stopReading();
    void ltRef.current?.stop();
  }, []);

  const begin = async () => {
    setStartError(null);
    const res = await fetch('/api/mmi/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ edition, preset: preset.key, kind, stationIds: stations.map((s) => s.id), recordMode: rec.mode }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !data.id) {
      setStartError('The interview could not be started. Check your connection and try again.');
      return;
    }
    attemptRef.current = data.id;
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* fullscreen is optional */
    }
    startStation(0);
  };

  const leave = async () => {
    stopReading();
    const wasAnswering = phaseRef.current === 'resp';
    tokenRef.current++;
    if (wasAnswering) {
      await endResp();
      if (index >= stations.length - 1) return; // endResp already finished the attempt
    }
    if (attemptRef.current && (wasAnswering || index > 0)) return finishAll();
    rec.close();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.push(`/app/interview?edition=${edition}`);
  };

  // ---------- screens ----------
  if (phase === 'intro') {
    return (
      <Shell>
        <div className="max-w-[760px] mx-auto">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-teal-deep mb-2">{kind === 'mock' ? preset.label : 'Single station practice'}</p>
          <h1 className="text-[clamp(1.7rem,3vw,2.2rem)] font-bold text-navy mb-4">Before you begin</h1>
          <ul className="space-y-2 text-ink-soft text-[16px] mb-6 list-disc pl-5">
            <li>{stations.length} station{stations.length === 1 ? '' : 's'}. Each scenario is read aloud, then you get {preset.prepS} seconds to prepare and {fmt(preset.responseS)} to answer.</li>
            <li>Recording starts automatically when your answer time begins. {kind === 'mock' ? 'There are no re-records, just like the real thing.' : 'You can try a single station again afterwards.'}</li>
            <li>Sit somewhere quiet and private, on a laptop or desktop, with your face well lit and centred.</li>
            <li>Have paper and a pen for notes during preparation{edition === 'nz' ? ', and your ID nearby as you would on the day' : ''}.</li>
            <li>Speak to the camera, start straight away, and finish your thought before the timer ends. You are marked on how you reason, not on which view you take.</li>
          </ul>
          <fieldset className="mb-5">
            <legend className="font-semibold text-navy mb-2">How will you answer?</legend>
            <div className="flex flex-wrap gap-3">
              <Choice checked={answerMode === 'speak'} onChange={() => setAnswerMode('speak')} title="Speak (recommended)" body={srSupported || serverTranscribe ? 'Your answer is recorded and transcribed for feedback.' : 'Your answer is recorded. Live transcripts need Chrome or Edge, so AI feedback may be limited.'} />
              <Choice checked={answerMode === 'type'} onChange={() => setAnswerMode('type')} title="Type" body="Type your answer while being recorded. Useful if you cannot speak aloud right now." />
            </div>
          </fieldset>
          <label className="flex items-center gap-3 mb-8 text-ink-soft">
            <input type="checkbox" checked={readOn} onChange={(e) => setReadOn(e.target.checked)} className="w-5 h-5 accent-teal" />
            Read each scenario aloud before preparation time
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-teal btn-large" onClick={() => { setPhase('check'); void rec.open('video'); }}>Continue to camera check</button>
            <Link className="btn btn-ghost btn-large" href={`/app/interview?edition=${edition}`}>Back</Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'check') {
    const ready = rec.state === 'ready';
    const noFeedbackPath = rec.mode === 'none' && answerMode === 'speak' && !srSupported;
    const noTranscript = answerMode === 'speak' && !srSupported && !serverTranscribe;
    return (
      <Shell>
        <div className="max-w-[900px] mx-auto">
          <h1 className="text-[clamp(1.7rem,3vw,2.2rem)] font-bold text-navy mb-2">Camera and microphone check</h1>
          <p className="text-ink-soft mb-6">Your recordings are private to you. They are stored securely and deleted after 30 days.</p>
          <div className="inline-flex rounded-pill border border-line bg-surface p-1 mb-6" role="radiogroup" aria-label="Recording">
            {(['video', 'audio', 'none'] as RecordMode[]).map((m) => (
              <button key={m} role="radio" aria-checked={rec.mode === m} onClick={() => void rec.open(m)} className={`px-4 py-2 rounded-pill text-[14px] font-semibold min-h-[40px] ${rec.mode === m ? 'bg-navy text-white' : 'text-ink-soft'}`}>
                {m === 'video' ? 'Video and audio' : m === 'audio' ? 'Audio only' : 'No recording'}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6 items-start">
            <div className="rounded-lg overflow-hidden bg-navy aspect-[4/3] grid place-items-center text-white/70">
              {rec.mode === 'video' && ready ? (
                <video ref={previewRef} muted playsInline autoPlay className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              ) : (
                <span className="px-6 text-center">{rec.state === 'requesting' ? 'Waiting for permission…' : rec.mode === 'audio' ? 'Audio only' : rec.mode === 'none' ? 'Not recording' : 'Camera off'}</span>
              )}
            </div>
            <div>
              {rec.mode !== 'none' && (
                <>
                  <div className="text-[14px] font-semibold text-navy mb-1">Microphone level: say a few words</div>
                  <div className="h-3 rounded-pill bg-surface-cool border border-line overflow-hidden mb-4">
                    <div className="h-full bg-teal transition-[width] duration-75" style={{ width: `${Math.round(rec.level * 100)}%` }} />
                  </div>
                </>
              )}
              {rec.error && <p className="rounded-md p-3 mb-4 text-[14px]" style={{ background: 'var(--violet-soft)', color: 'var(--violet)' }}>{rec.error}</p>}
              {noTranscript && rec.mode !== 'none' && (
                <p className="rounded-md p-3 mb-4 text-[14px] bg-surface-cool text-ink-soft">Live transcripts are not available in this browser, so AI feedback needs Chrome or Edge. You can still watch your recordings and mark yourself.</p>
              )}
              {noFeedbackPath && <p className="rounded-md p-3 mb-4 text-[14px] bg-surface-cool text-ink-soft">Without recording or a transcript there will be nothing to review. Choose a recording option or answer by typing.</p>}
              {startError && <p className="rounded-md p-3 mb-4 text-[14px]" style={{ background: 'var(--violet-soft)', color: 'var(--violet)' }}>{startError}</p>}
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-teal btn-large" disabled={!ready || noFeedbackPath} onClick={() => void begin()} style={!ready || noFeedbackPath ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                  Start {kind === 'mock' ? 'interview' : 'station'}
                </button>
                {rec.state === 'error' && <button className="btn btn-ghost btn-large" onClick={() => void rec.open(rec.mode)}>Try again</button>}
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'finishing') {
    return (
      <Shell>
        <div className="max-w-[520px] mx-auto text-center py-20">
          <div className="w-12 h-12 mx-auto mb-6 rounded-full border-4 border-teal-soft border-t-teal animate-spin" />
          <h1 className="text-[1.6rem] font-bold text-navy mb-2">Saving your answers</h1>
          <p className="text-ink-soft">{saved.done} of {stations.length} saved. Please keep this tab open.</p>
        </div>
      </Shell>
    );
  }

  // read / prep / resp / trans
  const total = phase === 'prep' ? preset.prepS : phase === 'resp' ? preset.responseS : phase === 'trans' ? preset.transitionS : 1;
  const left = endAt ? Math.max(0, (endAt - now) / 1000) : total;
  const frac = phase === 'read' ? 1 : left / total;
  const label = phase === 'read' ? 'Reading scenario' : phase === 'prep' ? 'Preparation' : phase === 'resp' ? (recording ? 'Recording your answer' : 'Answer time') : 'Next station';
  const words = (live.text + ' ' + live.interim).trim().split(/\s+/).filter(Boolean).length;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-[14px] text-ink-muted">Station {index + 1} of {stations.length}</span>
        <button className="btn btn-ghost" onClick={() => void leave()}>Leave interview</button>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] rounded-xl overflow-hidden border border-line bg-surface shadow-md">
        <div className="p-[clamp(20px,3vw,40px)] flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-pill text-[13px] font-semibold bg-navy text-white">{station.domain}</span>
          </div>
          <h1 className="text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-navy">{station.title}</h1>
          <p className="text-[17px] leading-relaxed text-ink">{station.scenario}</p>
          <p className="text-[17px] font-semibold text-navy border-l-4 border-teal pl-4">{station.question}</p>
          <label className="block">
            <span className="text-[13px] text-ink-muted">Notes (on the day, use paper)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-line p-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-teal" />
          </label>
          {phase === 'resp' && answerMode === 'type' && (
            <label className="block">
              <span className="text-[13px] text-ink-muted">Your answer</span>
              <textarea autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} rows={8} className="mt-1 w-full rounded-md border-2 border-teal p-3 text-[16px] focus:outline-none" />
            </label>
          )}
          {phase === 'resp' && answerMode === 'speak' && !srSupported && serverTranscribe && rec.mode !== 'none' && (
            <p className="text-[14px] text-ink-muted">Your answer will be transcribed after the station for feedback.</p>
          )}
          {phase === 'resp' && answerMode === 'speak' && srSupported && (
            <div className="text-[14px] text-ink-muted">
              Transcribing · {words} words{' '}
              <button className="underline" onClick={() => setShowTranscript((v) => !v)}>{showTranscript ? 'hide' : 'show'}</button>
              {showTranscript && <p className="mt-2 text-ink-soft">{live.text} <span className="text-ink-muted">{live.interim}</span></p>}
            </div>
          )}
        </div>
        <div className="bg-navy text-white p-[clamp(20px,3vw,36px)] flex flex-col items-center justify-center gap-5 min-h-[360px]">
          {rec.mode === 'video' && rec.state === 'ready' && (
            <video ref={selfViewRef} muted playsInline autoPlay className="w-[200px] aspect-[4/3] object-cover rounded-md border-2 border-white/30" style={{ transform: 'scaleX(-1)' }} />
          )}
          <Ring frac={frac} active={phase === 'resp'} text={phase === 'read' ? '—' : fmt(left)} label={label} />
          <div className="flex items-center gap-2 text-[14px] font-semibold" aria-live="polite">
            <span className={`w-3 h-3 rounded-full ${recording ? 'bg-red animate-pulse' : 'bg-white/30'}`} />
            {recording ? 'Recording' : phase === 'resp' ? 'Answering' : rec.mode === 'none' ? 'Not recording' : 'Recording starts with your answer'}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {phase === 'read' && <button className="btn" style={{ background: 'rgba(255,255,255,.12)', color: 'white' }} onClick={() => { stopReading(); startPrep(tokenRef.current); }}>Skip reading</button>}
            {phase === 'prep' && <button className="btn" style={{ background: 'rgba(255,255,255,.12)', color: 'white' }} onClick={() => startResp(tokenRef.current)}>Start answering now</button>}
            {phase === 'resp' && <button className="btn" style={{ background: 'rgba(255,255,255,.12)', color: 'white' }} onClick={() => void endResp()}>Finish answer</button>}
            {phase === 'trans' && <button className="btn" style={{ background: 'rgba(255,255,255,.12)', color: 'white' }} onClick={next}>Go to next station</button>}
          </div>
          {phase === 'prep' && <p className="text-[13px] text-white/70 text-center max-w-[30ch]">Your answer time starts automatically. {answerMode === 'type' ? 'Start typing' : 'Start speaking'} straight away.</p>}
          {saved.failed > 0 && <p className="text-[13px] text-amber-soft text-center">{saved.failed} recording{saved.failed === 1 ? '' : 's'} could not be uploaded. Your other answers are still being saved.</p>}
        </div>
      </div>
      <p className="sr-only">{Object.values(attributeLabels).length} attributes are assessed across the interview.</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[60] overflow-auto bg-paper"><div className="container-px py-8">{children}</div></div>;
}

function Choice({ checked, onChange, title, body }: { checked: boolean; onChange: () => void; title: string; body: string }) {
  return (
    <label className={`flex-1 min-w-[240px] cursor-pointer rounded-md border-2 p-4 ${checked ? 'border-teal bg-teal-soft' : 'border-line bg-surface'}`}>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      <span className="block font-semibold text-navy">{title}</span>
      <span className="block text-[14px] text-ink-soft mt-1">{body}</span>
    </label>
  );
}

function Ring({ frac, active, text, label }: { frac: number; active: boolean; text: string; label: string }) {
  const C = 326.7;
  return (
    <div className="relative w-[220px] max-w-[60vw] aspect-square">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="10" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={active ? 'hsl(355, 65%, 55%)' : '#1B9D9D'} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, Math.min(1, frac)))} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[clamp(2.4rem,6vw,3.4rem)] font-extrabold font-mono leading-none">{text}</div>
          <div className="text-[13px] text-white/80 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}
