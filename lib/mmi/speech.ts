'use client';
// Browser speech helpers: read-aloud (speechSynthesis) and live transcript
// (Web Speech API; Chrome and Edge). Both degrade gracefully when missing.

type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

export function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function readAloud(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve();
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.98;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      // Some browsers never fire onend; don't let that stall the interview.
      setTimeout(resolve, (text.split(/\s+/).length / 2.2 + 6) * 1000);
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

export function stopReading() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

/** Continuous transcript that restarts itself after Chrome's silence timeouts. */
export class LiveTranscript {
  private rec: SR | null = null;
  private want = false;
  private errors = 0;
  finalText = '';
  interim = '';
  constructor(private lang: string, private onChange: (finalText: string, interim: string) => void) {}

  start() {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return false;
    this.want = true;
    this.errors = 0;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText = (this.finalText + ' ' + r[0].transcript.trim()).trim();
        else interim += r[0].transcript;
      }
      this.interim = interim;
      this.onChange(this.finalText, this.interim);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.want = false;
      else if (e.error !== 'no-speech' && ++this.errors > 2) this.want = false;
    };
    rec.onend = () => {
      if (this.want) {
        try {
          rec.start();
        } catch {
          this.want = false;
        }
      }
    };
    this.rec = rec;
    try {
      rec.start();
      return true;
    } catch {
      return false;
    }
  }

  /** Stop and return everything heard, including any unfinished phrase. */
  stop(): Promise<string> {
    this.want = false;
    const rec = this.rec;
    this.rec = null;
    return new Promise((resolve) => {
      const done = () => resolve((this.finalText + (this.interim ? ' ' + this.interim : '')).trim());
      if (!rec) return done();
      rec.onend = done;
      try {
        rec.stop();
      } catch {
        done();
      }
      setTimeout(done, 1500);
    });
  }
}
