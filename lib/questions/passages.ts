// Resolves orphan-sibling rows by fetching anchor passages from the same passage group.
// Many VR/QR/SJ rows store the passage text only on one "anchor" row per passage_id;
// sibling rows have passage = null but share the passage_id. This helper hydrates them.
import 'server-only';
import { and, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';

type Hydratable = {
  passageId: string | null;
  passage: string | null;
};

// Module-level dedup for the "multiple non-null passages for same passage_id"
// warning. Without this, dev console floods with one warning per duplicate
// passage_id per hydrate call (~54 entries on the VR bank), each ~60 lines of
// RSC stack trace. The Set survives across requests within a process so each
// duplicate passage_id warns at most once per server lifetime. Resets on dev
// server restart, which is when you'd actually want to be reminded.
const warnedDupPassageIds = new Set<string>();

export async function hydratePassages<T extends Hydratable>(rows: T[]): Promise<T[]> {
  const orphanPassageIds = Array.from(
    new Set(
      rows
        .filter((r) => r.passage == null && r.passageId != null)
        .map((r) => r.passageId as string)
    )
  );

  if (orphanPassageIds.length === 0) return rows;

  const anchors = await db
    .select({ passageId: questions.passageId, passage: questions.passage })
    .from(questions)
    .where(and(inArray(questions.passageId, orphanPassageIds), isNotNull(questions.passage)));

  const lookup = new Map<string, string>();
  for (const a of anchors) {
    if (a.passageId == null || a.passage == null) continue;
    if (lookup.has(a.passageId)) {
      if (!warnedDupPassageIds.has(a.passageId)) {
        warnedDupPassageIds.add(a.passageId);
        console.warn(
          `[hydratePassages] multiple non-null passages for passage_id=${a.passageId}; keeping first`
        );
      }
      continue;
    }
    lookup.set(a.passageId, a.passage);
  }

  return rows.map((r) =>
    r.passage == null && r.passageId != null
      ? { ...r, passage: lookup.get(r.passageId) ?? null }
      : r
  );
}
