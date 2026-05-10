// Recover passage text for VR questions flagged `needs_passage`.
//
// Cause: source JSONs carry the `passage` field only on the first question of
// each `passageId` group; siblings have `passage: null`. seed-all.ts maps rows
// 1-to-1, so siblings landed in Postgres with null passages.
//
// Strategy per target id (resolved in order):
//   1) json_sibling — a sibling in the source JSONs has a >=30-word passage
//      sharing the same passageId. Copy that text.
//   2) db_sibling   — no source JSON path, but a DB row sharing the passageId
//      has a >=30-word passage (covers legacy vr-008/vr-010 from seed.ts).
//   3) gone         — nothing to copy. Skip; row keeps `needs_passage`.
//
// Defensive: dry-run by default. Pass `--apply` to write. Inside one
// transaction with pre-snapshot + post-verification + rollback on mismatch.
//
// Run: npx tsx scripts/recover-vr-passages.ts            (dry-run)
//      npx tsx scripts/recover-vr-passages.ts --apply    (commit)
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');
const QB_DIR = resolve(process.cwd(), '..', '..', 'questionbank', 'data');

// Manually excluded: donor passage exists but is too low-quality to use.
// seale-radford-vr-0120's only donor (seale-radford-vr-0118, 47w) is an
// answer-key fragment that was captured as a passage during the original
// extraction, not the source article. Leaving it filtered is better than
// showing the fragment to users. Keep `needs_passage` flag.
const EXCLUDED_IDS = new Set<string>(['seale-radford-vr-0120']);

function wordCount(s: string | null | undefined): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function snippet(s: string, n = 100): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n) + '…' : one;
}

// Walk every subdir; load verbal_reasoning.json plus generated-enriched batch*_vr.json.
function loadAllVrSources(): any[] {
  const all: any[] = [];
  for (const entry of readdirSync(QB_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(QB_DIR, entry.name);
    const candidates: string[] = [];
    const vr = join(dir, 'verbal_reasoning.json');
    if (existsSync(vr)) candidates.push(vr);
    if (entry.name === 'generated-enriched') {
      for (const f of readdirSync(dir)) {
        if (/_vr\.json$/.test(f)) candidates.push(join(dir, f));
      }
    }
    for (const p of candidates) {
      try {
        const arr = JSON.parse(readFileSync(p, 'utf-8')) as any[];
        for (const q of arr) all.push(q);
      } catch (e) {
        console.warn('Failed to parse', p, e);
      }
    }
  }
  return all;
}

async function main() {
  // ----- 1. Target IDs from audit-report.csv -----
  const csv = readFileSync('audit-report.csv', 'utf-8').split('\n');
  const targetIds: string[] = [];
  for (const line of csv) {
    if (!line) continue;
    const parts = line.split(',');
    if (parts[2] === 'missing_passage') targetIds.push(parts[0]);
  }
  console.log(`Target IDs (needs_passage in CSV): ${targetIds.length}`);

  // ----- 2. Build passageId -> best (longest) passage from source JSONs -----
  const src = loadAllVrSources();
  const bestSrc = new Map<string, { text: string; fromId: string; wc: number; title: string | null }>();
  for (const r of src) {
    const pid: string | null = r.passageId ?? null;
    if (!pid) continue;
    const wc = wordCount(r.passage);
    if (wc < 30) continue;
    const cur = bestSrc.get(pid);
    if (!cur || wc > cur.wc) {
      bestSrc.set(pid, { text: r.passage, fromId: r.id, wc, title: r.passageTitle ?? null });
    }
  }
  console.log(`Source rows: ${src.length} | passageIds with >=30w passage in source: ${bestSrc.size}`);

  // ----- 3. DB connection + target rows -----
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error('DATABASE_URL missing');
  const sql = postgres(cs, { prepare: false });

  const dbRows = await sql<{
    id: string;
    passage: string | null;
    passage_id: string | null;
    passage_title: string | null;
    stem: string;
  }[]>`
    SELECT id, passage, passage_id, passage_title, stem
    FROM questions
    WHERE id = ANY(${targetIds})
  `;
  if (dbRows.length !== targetIds.length) {
    console.warn(`WARN: ${dbRows.length} of ${targetIds.length} target ids found in DB.`);
  }

  // ----- 4. DB-sibling fallback for pids not covered by source -----
  const pidsInTargets = Array.from(new Set(dbRows.map((r) => r.passage_id).filter(Boolean) as string[]));
  const siblingRows = pidsInTargets.length
    ? await sql<{ id: string; passage_id: string; passage: string; passage_title: string | null }[]>`
        SELECT id, passage_id, passage, passage_title
        FROM questions
        WHERE passage_id = ANY(${pidsInTargets})
          AND passage IS NOT NULL
      `
    : [];
  const bestDb = new Map<string, { text: string; fromId: string; wc: number; title: string | null }>();
  for (const r of siblingRows) {
    const wc = wordCount(r.passage);
    if (wc < 30) continue;
    const cur = bestDb.get(r.passage_id);
    if (!cur || wc > cur.wc) {
      bestDb.set(r.passage_id, { text: r.passage, fromId: r.id, wc, title: r.passage_title });
    }
  }

  // ----- 5. Build recovery actions -----
  type Action = {
    id: string;
    passage_id: string | null;
    bucket: 'json_sibling' | 'db_sibling' | 'gone' | 'excluded';
    new_passage: string | null;
    new_title: string | null;
    donor: string | null;
    donor_wc: number;
    current_wc: number;
    stem_snippet: string;
  };
  const actions: Action[] = [];
  for (const r of dbRows) {
    const current_wc = wordCount(r.passage);
    const pidBestSrc = r.passage_id ? bestSrc.get(r.passage_id) : undefined;
    const pidBestDb = r.passage_id ? bestDb.get(r.passage_id) : undefined;

    if (EXCLUDED_IDS.has(r.id)) {
      actions.push({
        id: r.id,
        passage_id: r.passage_id,
        bucket: 'excluded',
        new_passage: null,
        new_title: null,
        donor: null,
        donor_wc: 0,
        current_wc,
        stem_snippet: snippet(r.stem, 80),
      });
    } else if (pidBestSrc) {
      actions.push({
        id: r.id,
        passage_id: r.passage_id,
        bucket: 'json_sibling',
        new_passage: pidBestSrc.text,
        new_title: r.passage_title ?? pidBestSrc.title,
        donor: pidBestSrc.fromId,
        donor_wc: pidBestSrc.wc,
        current_wc,
        stem_snippet: snippet(r.stem, 80),
      });
    } else if (pidBestDb) {
      actions.push({
        id: r.id,
        passage_id: r.passage_id,
        bucket: 'db_sibling',
        new_passage: pidBestDb.text,
        new_title: r.passage_title ?? pidBestDb.title,
        donor: pidBestDb.fromId,
        donor_wc: pidBestDb.wc,
        current_wc,
        stem_snippet: snippet(r.stem, 80),
      });
    } else {
      actions.push({
        id: r.id,
        passage_id: r.passage_id,
        bucket: 'gone',
        new_passage: null,
        new_title: null,
        donor: null,
        donor_wc: 0,
        current_wc,
        stem_snippet: snippet(r.stem, 80),
      });
    }
  }

  const recoverable = actions.filter((a) => a.bucket === 'json_sibling' || a.bucket === 'db_sibling');
  const unrecoverable = actions.filter((a) => a.bucket === 'gone' || a.bucket === 'excluded');
  const countByBucket = actions.reduce<Record<string, number>>(
    (m, a) => ((m[a.bucket] = (m[a.bucket] ?? 0) + 1), m),
    {}
  );

  // ----- 6. Dry-run print -----
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RECOVERY PLAN' + (APPLY ? ' — APPLY MODE' : ' — DRY RUN (no writes)'));
  console.log('═══════════════════════════════════════════════════');
  console.log(`  json_sibling: ${countByBucket.json_sibling ?? 0}`);
  console.log(`  db_sibling:   ${countByBucket.db_sibling ?? 0}`);
  console.log(`  gone:         ${countByBucket.gone ?? 0}`);
  console.log(`  excluded:     ${countByBucket.excluded ?? 0}  (manually skipped — see EXCLUDED_IDS)`);
  console.log(`  total:        ${actions.length}\n`);

  console.log('Per-row plan (sorted by donor passage word count):');
  console.log('─'.repeat(130));
  console.log(
    'target'.padEnd(34) +
      'pid'.padEnd(28) +
      'bucket'.padEnd(14) +
      'donor'.padEnd(22) +
      'cur→new'.padEnd(12) +
      'snippet'
  );
  console.log('─'.repeat(130));
  for (const a of [...recoverable].sort((x, y) => x.id.localeCompare(y.id))) {
    const snip = a.new_passage ? snippet(a.new_passage, 60) : '';
    console.log(
      a.id.padEnd(34) +
        (a.passage_id ?? '').padEnd(28) +
        a.bucket.padEnd(14) +
        (a.donor ?? '').padEnd(22) +
        `${a.current_wc}→${a.donor_wc}`.padEnd(12) +
        snip
    );
  }
  if (unrecoverable.length) {
    console.log('\nUnrecoverable (will keep needs_passage flag):');
    for (const a of unrecoverable) {
      const tag = a.bucket === 'excluded' ? '[excluded]' : '[gone]    ';
      console.log(`  ${tag} ${a.id.padEnd(34)} pid=${a.passage_id ?? '∅'}  stem: ${a.stem_snippet}`);
    }
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to commit.');
    await sql.end();
    return;
  }

  // ----- 7. Apply inside a single transaction -----
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  APPLYING (transactional)');
  console.log('═══════════════════════════════════════════════════');

  await sql.begin(async (tx) => {
    // Pre-snapshot
    const [pre] = await tx<{ needs_passage: number }[]>`
      SELECT COUNT(*)::int AS needs_passage
      FROM questions
      WHERE flags @> '["needs_passage"]'::jsonb
    `;
    console.log(`Pre-state: ${pre.needs_passage} questions tagged needs_passage`);

    // Apply passage UPDATEs, only on rows that still have empty/missing passages
    let updated = 0;
    const recoveredIds: string[] = [];
    for (const a of recoverable) {
      const result = await tx`
        UPDATE questions
        SET passage = ${a.new_passage},
            passage_title = COALESCE(passage_title, ${a.new_title})
        WHERE id = ${a.id}
          AND (passage IS NULL OR length(trim(passage)) = 0)
      `;
      if (result.count !== 1) {
        throw new Error(
          `Expected exactly 1 row updated for id=${a.id}, got ${result.count}. ` +
            `Possible cause: passage is non-empty already (concurrent edit?).`
        );
      }
      updated++;
      recoveredIds.push(a.id);
    }
    console.log(`  ✓ Passage UPDATEs: ${updated}`);

    // Clear needs_passage flag for recovered ids
    const flagResult = await tx`
      UPDATE questions
      SET flags = flags - 'needs_passage'
      WHERE id = ANY(${recoveredIds})
        AND flags @> '["needs_passage"]'::jsonb
    `;
    console.log(`  ✓ Flag-clear UPDATEs: ${flagResult.count}`);

    if (flagResult.count !== recoveredIds.length) {
      throw new Error(
        `Expected flag-clear count ${recoveredIds.length}, got ${flagResult.count}.`
      );
    }

    // Post-verification (inside tx so we can rollback)
    const [post] = await tx<{ needs_passage: number }[]>`
      SELECT COUNT(*)::int AS needs_passage
      FROM questions
      WHERE flags @> '["needs_passage"]'::jsonb
    `;
    const expected = pre.needs_passage - recoveredIds.length;
    console.log(`Post-state: ${post.needs_passage} (expected ${expected})`);
    if (post.needs_passage !== expected) {
      throw new Error(
        `Verification failed: expected ${expected} needs_passage after clearing ${recoveredIds.length}, got ${post.needs_passage}.`
      );
    }
    console.log('  ✓ Verification passed. Committing.');
  });

  console.log('\nDone. Transaction committed.');
  console.log('Re-run scripts/audit-missing-assets.ts to confirm the new state.');
  await sql.end();
}

main().catch((err) => {
  console.error('\n❌ Failed (transaction rolled back if applicable):', err.message);
  process.exit(1);
});
