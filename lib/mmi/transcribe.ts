// Server-side transcription of a recorded MMI answer, so AI feedback works in
// every browser (live browser transcripts only exist in Chrome/Edge).
// Uses OpenAI's speech-to-text API. Requires OPENAI_API_KEY.
import 'server-only';
import type { Edition, Station } from './content';

const API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_MODEL = 'gpt-transcribe';
const MAX_BYTES = 25 * 1024 * 1024; // API upload limit

// Terms students are likely to say that generic speech models often mangle.
const KEYWORDS: Record<Edition, string[]> = {
  nz: ['Hauora', 'hauora Māori', 'Māori', 'Pasifika', 'whānau', 'iwi', 'hapū', 'Te Tiriti o Waitangi', 'tino rangatiratanga', 'rongoā', 'tikanga', 'manaakitanga', 'kaumātua', 'marae', 'Te Whatu Ora', 'Health New Zealand', 'Pharmac', 'ACC', 'GP'],
  au: ['Aboriginal', 'Torres Strait Islander', 'Closing the Gap', 'Medicare', 'bulk billing', 'PBS', 'NDIS', 'Aboriginal Community Controlled Health Organisation', 'ACCHO', 'GP', 'AHPRA', 'Country'],
};

export function transcriptionConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function transcriptionModel(): string {
  return process.env.MMI_TRANSCRIBE_MODEL || DEFAULT_MODEL;
}

export async function transcribe(media: Blob, mime: string, edition: Edition, station: Station): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('not_configured');
  if (media.size > MAX_BYTES) throw new Error('too_large');

  const model = transcriptionModel();
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
  const form = new FormData();
  form.append('model', model);
  form.append('file', new File([media], `answer.${ext}`, { type: mime.split(';')[0] }));
  form.append('prompt', `A medical school applicant answering a Multiple Mini Interview question, titled "${station.title}". ${station.question}`.slice(0, 600));
  // keywords[] / languages[] are gpt-transcribe fields; older models use `language`.
  if (model === 'gpt-transcribe') {
    for (const k of KEYWORDS[edition]) form.append('keywords[]', k);
    form.append('languages[]', 'en');
  } else {
    form.append('language', 'en');
  }

  const res = await fetch(API_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? '').trim();
}
