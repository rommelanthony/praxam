// Server-side AI feedback for an MMI response. Calls the Anthropic Messages
// API directly (no SDK dependency). Requires ANTHROPIC_API_KEY.
import 'server-only';
import type { MmiFeedback } from '@/db/schema';
import { bandOf, countWords, type Bank, type Station } from './content';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5-5';

export function buildPrompt(bank: Bank, st: Station, r: { transcript: string; durationS: number; allowedS: number; answerMode: 'speak' | 'type' }): string {
  const n = countWords(r.transcript);
  const lo = Math.round((r.allowedS / 60) * 125);
  const hi = Math.round((r.allowedS / 60) * 160);
  const attrs = st.attributes
    .map((k) => {
      const a = bank.attributes[k];
      return `${k}: ${a.label} - ${a.description}\n   1 = ${a.levels['1']}\n   3 = ${a.levels['3']}\n   5 = ${a.levels['5']}\n   (2 and 4 fall between these)`;
    })
    .join('\n');
  const answerType =
    r.answerMode === 'speak'
      ? 'spoken, auto-transcribed (ignore transcription errors and missing punctuation; judge Communication on clarity and structure, since tone and pace cannot be heard)'
      : 'typed under time pressure (judge Communication on clarity and structure only)';
  return `You are an experienced reviewer for a medical school Multiple Mini Interview in ${bank.place}, giving practice feedback to an applicant (usually 18-19 years old). Be specific, fair, warm and direct. Judge content, not grammar.
HOW THIS INTERVIEW IS MARKED
- The applicant had 30 seconds to prepare, so they are not expected to cover everything; reward thinking on their feet.
- They are NOT scored on whether their opinion is right or wrong, only on how they discuss the issue, form a view and explain it. Never penalise a view you disagree with.
- On debatable issues, seeing arguments on more than one side is expected. Changing their mind partway through is fine and shows flexibility.
- They should use most of the response time and finish their thought before time runs out.
STATION
Domain: ${st.domain}
Scenario: ${st.scenario}
Question: ${st.question}
Points a strong answer might cover (not a checklist; credit other sound points):
${st.keyPoints.map((k) => '- ' + k).join('\n')}
ANSWER
Answer type: ${answerType}
Time allowed: ${r.allowedS} seconds. Time used: ${r.durationS} seconds. Words: ${n}.${r.answerMode === 'speak' ? ` A full spoken answer is usually about ${lo}-${hi} words.` : ''}
"""${r.transcript}"""
SCORE THESE ${st.attributes.length} ATTRIBUTES (integers 1-5; 3 = adequate, 5 = outstanding for an applicant):
${attrs}
Return ONLY JSON with exactly these keys:
{"scores":{${st.attributes.map((k) => `"${k}":n`).join(',')}},"summary":"2 sentences","strengths":["2 specific strengths"],"improvements":[{"issue":"what to fix","quote":"exact short words from the answer it relates to, or empty string","try_instead":"a concrete better line or move"}],"missed_points":["important points not covered"],"model_outline":["4-6 bullet outline of a strong answer"]}
Give 2-3 improvements. Quotes must be copied from the answer exactly.`;
}

function str(x: unknown): string {
  return typeof x === 'string' ? x : '';
}
function strArr(x: unknown, max = 8): string[] {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string' && !!v.trim()).slice(0, max) : [];
}

/** Validate and normalise model output. Unknown keys are dropped; missing scores default to 3. */
export function cleanFeedback(raw: unknown, attributes: string[]): Omit<MmiFeedback, 'model'> {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawScores = (o.scores && typeof o.scores === 'object' ? o.scores : {}) as Record<string, unknown>;
  const scores: Record<string, number> = {};
  for (const k of attributes) {
    const v = Math.round(Number(rawScores[k]));
    scores[k] = v >= 1 && v <= 5 ? v : 3;
  }
  const improvements = Array.isArray(o.improvements)
    ? o.improvements
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .slice(0, 4)
        .map((x) => ({ issue: str(x.issue), quote: str(x.quote), tryInstead: str(x.try_instead) }))
    : [];
  return {
    scores,
    band: bandOf(scores),
    summary: str(o.summary),
    strengths: strArr(o.strengths),
    improvements,
    missed: strArr(o.missed_points),
    outline: strArr(o.model_outline),
  };
}

/** Pull the first JSON object out of a model reply (tolerates code fences). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no_json');
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateFeedback(bank: Bank, st: Station, r: { transcript: string; durationS: number; allowedS: number; answerMode: 'speak' | 'type' }): Promise<MmiFeedback> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('not_configured');
  const model = process.env.MMI_FEEDBACK_MODEL || DEFAULT_MODEL;
  let lastError = 'bad_json';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: 'user', content: buildPrompt(bank, st, r) }] }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}`);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
    try {
      return { ...cleanFeedback(extractJson(text), st.attributes), model };
    } catch {
      lastError = 'bad_json'; // retry once
    }
  }
  throw new Error(lastError);
}
