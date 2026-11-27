// Server-side AI feedback for an MMI response. Calls the Anthropic Messages
// API or OpenAI Chat Completions directly (no SDK dependency). Needs
// ANTHROPIC_API_KEY or OPENAI_API_KEY.
import 'server-only';
import type { MmiFeedback } from '@/db/schema';
import { bandOf, countWords, type Bank, type Station } from './content';

const API_URL = 'https://api.anthropic.com/v1/messages';
// Haiku 5.5 is ~20x cheaper than Sonnet 5.5 and is plenty for rubric marking.
// Set MMI_FEEDBACK_MODEL=claude-sonnet-5-5 for richer feedback.
const DEFAULT_MODEL = 'claude-haiku-5-5';

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
{"scores":{${st.attributes.map((k) => `"${k}":n`).join(',')}},"summary":"2 sentences","strengths":["2 specific strengths"],"improvements":[{"issue":"what to fix","quote":"exact short words from the answer it relates to, or empty string","try_instead":"a concrete better line or move"}],"missed_points":["important points not covered"],"model_outline":["4-5 short bullets outlining a strong answer"]}
Give 2-3 improvements. Keep every item to one sentence. Quotes must be copied from the answer exactly.`;
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

type Provider = 'anthropic' | 'openai';

/**
 * Which AI marks the answer. MMI_FEEDBACK_PROVIDER forces one; otherwise
 * Anthropic if its key is set, else OpenAI (the same key used for transcription).
 */
export function feedbackProvider(): Provider | null {
  const forced = process.env.MMI_FEEDBACK_PROVIDER;
  if (forced === 'anthropic' || forced === 'openai') return forced;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

// Both defaults cost about the same ($0.10 / $0.50 per million tokens).
const DEFAULT_OPENAI_MODEL = 'gpt-6-luna';

async function callAnthropic(model: string, prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('not_configured');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
}

async function callOpenAI(model: string, prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('not_configured');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      reasoning_effort: 'low',
      max_completion_tokens: 2500, // includes reasoning tokens
    }),
  });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

export async function generateFeedback(bank: Bank, st: Station, r: { transcript: string; durationS: number; allowedS: number; answerMode: 'speak' | 'type' }): Promise<MmiFeedback> {
  const provider = feedbackProvider();
  if (!provider) throw new Error('not_configured');
  const model = process.env.MMI_FEEDBACK_MODEL || (provider === 'anthropic' ? DEFAULT_MODEL : DEFAULT_OPENAI_MODEL);
  const prompt = buildPrompt(bank, st, r);
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = provider === 'anthropic' ? await callAnthropic(model, prompt) : await callOpenAI(model, prompt);
    try {
      return { ...cleanFeedback(extractJson(text), st.attributes), model };
    } catch {
      // bad JSON: retry once
    }
  }
  throw new Error('bad_json');
}
