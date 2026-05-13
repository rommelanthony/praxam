// Speed Reading Tutor passage source. Reuses the existing VR question bank in
// public.questions (no separate passage table) by composing the shared
// HIDDEN_FLAGS filter and the hydratePassages helper. Drill modules call into
// here instead of /api/questions to avoid the documented random() perf concern.
import 'server-only';
import { cache } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions, type Question } from '@/db/schema';
import { excludeHiddenFlags } from '@/lib/questions/filters';
import { hydratePassages } from '@/lib/questions/passages';
import type {
  Passage,
  PassageDifficulty,
  PassageQuestion,
} from '@/lib/speed-reading/types';

// UCAT-realistic passage length band. Outside this we either over- or under-shoot
// the target ~250-word UCAT VR passage and the WPM math gets misleading.
const MIN_WORDS = 150;
const MAX_WORDS = 350;

// UCAT VR is 4 questions per passage by published format. Anything with more
// than this in the bank is either bank pollution (multiple source passages
// ingested under one passage_id — see green-800-vr-p013, picard-1000-vr-p004
// etc.) or non-UCAT-realistic publisher formatting. Either way it doesn't
// belong in a tool that trains people on UCAT pacing. 4 expected + 1 tolerance
// for legitimate edge cases.
const MAX_QUESTIONS_PER_PASSAGE = 5;

// One-shot info log of dropped passage_ids on first call per process. Same
// pattern as hydratePassages' warning dedup. Surfaces bank drift in the dev
// console without flooding per-render.
let pollutionLogged = false;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function normalizeDifficulty(raw: string | null): PassageDifficulty {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return 'medium';
}

// Convert a DB question row into a UI-shaped PassageQuestion. Returns null for
// rows that can't be rendered (empty stem, missing/empty choices, or a
// correct_answer that doesn't match any choice label — all signs of bad data
// that should be silently skipped rather than crash the drill).
function toQuestion(row: Question): PassageQuestion | null {
  if (!row.stem || !row.stem.trim()) return null;
  if (!Array.isArray(row.choices) || row.choices.length === 0) return null;
  const answer = row.choices.findIndex((c) => c.label === row.correctAnswer);
  if (answer < 0) return null;
  return {
    id: row.id,
    stem: row.stem,
    options: row.choices.map((c) => ({ label: c.label, text: c.text })),
    answer,
  };
}

// React's cache() dedupes within a single request, so multiple drill components
// in the same render tree don't re-fetch the bank.
export const getVRPassages = cache(
  async (opts?: { limit?: number; difficulty?: PassageDifficulty }): Promise<Passage[]> => {
    // Fetch every VR row that belongs to a passage group and isn't flagged.
    // No `passage IS NOT NULL` predicate here — sibling rows have passage=null
    // and rely on hydratePassages to fill it in from the anchor row.
    const rows = await db
      .select()
      .from(questions)
      .where(
        sql`${questions.subtest} = 'verbal_reasoning'
          AND ${questions.passageId} IS NOT NULL
          AND ${excludeHiddenFlags(questions.flags)}`
      );

    const hydrated = await hydratePassages(rows);

    // Group by passage_id. Within each group, every row contributes a question
    // (subject to toQuestion's render-test); the anchor row also supplies the
    // passage text, title, and difficulty for the group.
    type Group = { anchor: Question; questions: PassageQuestion[] };
    const byPassage = new Map<string, Group>();
    for (const r of hydrated) {
      if (!r.passageId) continue;
      if (!r.passage || !r.passage.trim()) continue;
      const existing = byPassage.get(r.passageId);
      const group: Group = existing ?? { anchor: r, questions: [] };
      const q = toQuestion(r);
      if (q) group.questions.push(q);
      byPassage.set(r.passageId, group);
    }

    // First call only: surface which passage_ids got dropped for bank-pollution.
    // Helps catch a future regression where the dropped pool grows past
    // expectations (~29 today; alarm at >50 or pool below 40).
    if (!pollutionLogged) {
      pollutionLogged = true;
      const dropped: string[] = [];
      for (const [pid, g] of byPassage) {
        if (g.questions.length > MAX_QUESTIONS_PER_PASSAGE) {
          dropped.push(`${pid} (${g.questions.length}q)`);
        }
      }
      if (dropped.length > 0) {
        console.info(
          `[getVRPassages] Filtered ${dropped.length} passages with >${MAX_QUESTIONS_PER_PASSAGE} questions (suspected bank pollution): ${dropped.join(', ')}`
        );
      }
    }

    let passages: Passage[] = [];
    for (const [passageId, { anchor, questions: qs }] of byPassage) {
      if (qs.length === 0) continue; // no renderable questions → skip
      if (qs.length > MAX_QUESTIONS_PER_PASSAGE) continue; // bank-pollution gate
      const text = anchor.passage as string; // guarded above
      const wc = wordCount(text);
      if (wc < MIN_WORDS || wc > MAX_WORDS) continue;
      const difficulty = normalizeDifficulty(anchor.difficulty);
      if (opts?.difficulty && opts.difficulty !== difficulty) continue;
      passages.push({
        id: passageId,
        title: anchor.passageTitle ?? 'Untitled passage',
        text,
        wordCount: wc,
        difficulty,
        questions: qs,
      });
    }

    if (opts?.limit && passages.length > opts.limit) {
      passages = passages.slice(0, opts.limit);
    }
    return passages;
  }
);

export async function getRandomVRPassage(opts?: {
  difficulty?: PassageDifficulty;
}): Promise<Passage> {
  const all = await getVRPassages(opts);
  if (all.length === 0) {
    throw new Error('No VR passages available — bank may be empty or all rows filtered out');
  }
  return all[Math.floor(Math.random() * all.length)];
}
