'use client';
// Camera/microphone capture for MMI answers. One stream stays open for the
// whole mock; each answer is a separate MediaRecorder clip.
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecordMode = 'video' | 'audio' | 'none';
export type StreamState = 'idle' | 'requesting' | 'ready' | 'error';

const VIDEO_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

function pickMime(mode: RecordMode): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const list = mode === 'video' ? VIDEO_TYPES : AUDIO_TYPES;
  return list.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  }) ?? '';
}

export function errorMessage(name: string | null): string {
  switch (name) {
    case 'NotAllowedError':
      return 'Permission was declined. Allow the camera and microphone for this site in your browser settings, then try again.';
    case 'NotFoundError':
      return 'No camera or microphone was found. Plug one in or choose audio only.';
    case 'NotReadableError':
      return 'Your camera or microphone is being used by another app. Close it and try again.';
    case 'unsupported':
      return 'Recording is not supported in this browser. Use Chrome or Edge on a laptop or desktop.';
    default:
      return 'The camera or microphone could not start. Try again, or continue without recording.';
  }
}

export function useMmiRecorder() {
  const [mode, setMode] = useState<RecordMode>('video');
  const [state, setState] = useState<StreamState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef(0);
  const acRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef(0);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLevel(0);
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = acRef.current ?? new Ctx();
      acRef.current = ac;
      void ac.resume?.();
      const an = ac.createAnalyser();
      an.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      let last = 0;
      const loop = (t: number) => {
        an.getByteTimeDomainData(data);
        let m = 0;
        for (let i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i] - 128));
        if (t - last > 80) {
          setLevel(Math.min(1, m / 48));
          last = t;
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      /* meter is optional */
    }
  }, []);

  const open = useCallback(
    async (next: RecordMode) => {
      stopStream();
      setMode(next);
      setError(null);
      if (next === 'none') {
        setState('ready');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setState('error');
        setError(errorMessage('unsupported'));
        return;
      }
      setState('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          next === 'video'
            ? { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } }
            : { audio: { echoCancellation: true, noiseSuppression: true } },
        );
        streamRef.current = stream;
        startMeter(stream);
        setState('ready');
      } catch (e) {
        setState('error');
        setError(errorMessage((e as DOMException)?.name ?? null));
      }
    },
    [startMeter, stopStream],
  );

  const startClip = useCallback((): boolean => {
    const stream = streamRef.current;
    if (!stream || mode === 'none') return false;
    try {
      const mimeType = pickMime(mode);
      chunksRef.current = [];
      // Keep a 3-minute answer around 15 MB so uploads stay quick.
      const rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        ...(mode === 'video' ? { videoBitsPerSecond: 600_000 } : {}),
        audioBitsPerSecond: 64_000,
      });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.start(1000);
      recRef.current = rec;
      startedAtRef.current = Date.now();
      return true;
    } catch {
      return false;
    }
  }, [mode]);

  const stopClip = useCallback((): Promise<{ blob: Blob; mime: string; seconds: number } | null> => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec || rec.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => {
        const mime = rec.mimeType || (mode === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunksRef.current, { type: mime });
        resolve(blob.size ? { blob, mime, seconds: Math.round((Date.now() - startedAtRef.current) / 1000) } : null);
      };
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
  }, [mode]);

  useEffect(() => () => {
    stopStream();
    void acRef.current?.close?.();
  }, [stopStream]);

  return { mode, state, error, level, stream: streamRef, open, close: stopStream, startClip, stopClip };
}
