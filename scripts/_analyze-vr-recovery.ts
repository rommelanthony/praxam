// One-off: classify the 77 needs_passage VR IDs by recovery strategy.
// Read-only. Outputs a JSON report; no DB writes.
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

const QB_DIR = resolve(process.cwd(), '..', '..', 'questionbank', 'data');

// Walk every dir; load only verbal_reasoning.json (and generated batch*_vr.json).
function loadAllVrSources(): any[] {
  const all: any[] = [];
  for (const entry of readdirSync(QB_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(QB_DIR, entry.name);
    const candidates: string[] = [];
    const vr = join(dir, 'verbal_reasoning.json');
    if (existsSync(vr)) candidates.push(vr);
    // generated-enriched has batch*_vr.json files plus the rolled-up verbal_reasoning.json
    if (entry.name === 'generated-enriched') {
      for (const f of readdirSync(dir)) {
        if (/_vr\.json$/.test(f)) candidates.push(join(dir, f));
      }
    }
    for (const p of candidates) {
      try {
        const arr = JSON.parse(readFileSync(p, 'utf-8')) as any[];
        for (const q of arr) all.push({ ...q, __srcFile: p });
      } catch (e) {
        console.warn('Failed to parse', p, e);
      }
    }
  }
  return all;
}

function wordCount(s: string | null | undefined): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  // ----- 1. Read the 77 needs_passage IDs from audit-report.csv -----
  const csv = readFileSync('audit-report.csv', 'utf-8').split('\n');
  const targetIds: string[] = [];
  for (const line of csv) {
    if (!line) continue;
    const parts = line.split(',');
    if (parts[2] === 'missing_passage') targetIds.push(parts[0]);
  }
  console.log(`Target IDs from CSV: ${targetIds.length}`);

  // ----- 2. Build source-JSON index -----
  const srcAll = loadAllVrSources();
  console.log(`Source VR rows loaded: ${srcAll.length}`);

  // id -> source row
  const byId = new Map<string, any>();
  for (const r of srcAll) byId.set(r.id, r);

  // passageId -> best (longest) passage text
  const bestByPid = new Map<string, { text: string; fromId: string; wc: number }>();
  for (const r of srcAll) {
    const pid: string | null = r.passageId ?? null;
    if (!pid) continue;
    const wc = wordCount(r.passage);
    if (wc < 30) continue;
    const cur = bestByPid.get(pid);
    if (!cur || wc > cur.wc) {
      bestByPid.set(pid, { text: r.passage, fromId: r.id, wc });
    }
  }
  console.log(`Distinct passageIds with >=30-word passage in source: ${bestByPid.size}`);

  // ----- 3. Pull current DB state for the 77 IDs -----
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error('DATABASE_URL missing');
  const sql = postgres(cs, { prepare: false });

  const dbRows = await sql<{
    id: string;
    passage: string | null;
    passage_id: string | null;
    passage_title: string | null;
    stem: string;
    flags: string[];
  }[]>`
    SELECT id, passage, passage_id, passage_title, stem, flags
    FROM questions
    WHERE id = ANY(${targetIds})
  `;
  console.log(`Loaded ${dbRows.length} target rows from DB.`);

  // Distinct passage_ids in this set
  const targetPids = new Set<string>();
  for (const r of dbRows) if (r.passage_id) targetPids.add(r.passage_id);

  // For DB-sibling fallback: load any question (not just the 77) sharing a passage_id, with a >=30-word passage
  const siblingDbRows = targetPids.size
    ? await sql<{ id: string; passage_id: string; passage: string }[]>`
        SELECT id, passage_id, passage
        FROM questions
        WHERE passage_id = ANY(${Array.from(targetPids)})
          AND passage IS NOT NULL
      `
    : [];
  const dbBestByPid = new Map<string, { text: string; fromId: string; wc: number }>();
  for (const r of siblingDbRows) {
    const wc = wordCount(r.passage);
    if (wc < 30) continue;
    const cur = dbBestByPid.get(r.passage_id);
    if (!cur || wc > cur.wc) dbBestByPid.set(r.passage_id, { text: r.passage, fromId: r.id, wc });
  }

  // ----- 4. Categorize -----
  type Bucket = 'json_self' | 'json_sibling' | 'db_sibling' | 'gone';
  const result: Array<{
    id: string;
    bucket: Bucket;
    passage_id: string | null;
    passage_title: string | null;
    db_passage_wc: number;
    src_self_wc: number;
    src_sibling_from: string | null;
    src_sibling_wc: number;
    db_sibling_from: string | null;
    db_sibling_wc: number;
    stem_snippet: string;
  }> = [];

  for (const r of dbRows) {
    const src = byId.get(r.id);
    const selfWc = wordCount(src?.passage);
    const pidBestSrc = r.passage_id ? bestByPid.get(r.passage_id) : undefined;
    const pidBestDb = r.passage_id ? dbBestByPid.get(r.passage_id) : undefined;

    let bucket: Bucket;
    if (selfWc >= 30) bucket = 'json_self';
    else if (pidBestSrc) bucket = 'json_sibling';
    else if (pidBestDb) bucket = 'db_sibling';
    else bucket = 'gone';

    result.push({
      id: r.id,
      bucket,
      passage_id: r.passage_id,
      passage_title: r.passage_title,
      db_passage_wc: wordCount(r.passage),
      src_self_wc: selfWc,
      src_sibling_from: pidBestSrc?.fromId ?? null,
      src_sibling_wc: pidBestSrc?.wc ?? 0,
      db_sibling_from: pidBestDb?.fromId ?? null,
      db_sibling_wc: pidBestDb?.wc ?? 0,
      stem_snippet: r.stem.slice(0, 120),
    });
  }

  // Count missing-from-DB (none expected, but sanity check)
  const missingFromDb = targetIds.filter((id) => !dbRows.find((r) => r.id === id));
  if (missingFromDb.length) console.log('IDs missing from DB:', missingFromDb);

  // ----- 5. Summary -----
  const counts: Record<Bucket, number> = { json_self: 0, json_sibling: 0, db_sibling: 0, gone: 0 };
  for (const r of result) counts[r.bucket]++;
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RECOVERABILITY BREAKDOWN');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  json_self    (own row has passage in source):    ${counts.json_self}`);
  console.log(`  json_sibling (sibling in source has passage):    ${counts.json_sibling}`);
  console.log(`  db_sibling   (DB sibling has it; not in source): ${counts.db_sibling}`);
  console.log(`  gone         (no recoverable path):              ${counts.gone}`);
  console.log(`  total                                            ${result.length}`);

  console.log('\nGone IDs:');
  for (const r of result.filter((x) => x.bucket === 'gone')) {
    console.log(`  ${r.id.padEnd(36)} pid=${(r.passage_id ?? '∅').padEnd(28)} ${r.stem_snippet}`);
  }

  console.log('\nDB-sibling IDs (recoverable only because DB already has the text):');
  for (const r of result.filter((x) => x.bucket === 'db_sibling')) {
    console.log(`  ${r.id.padEnd(36)} pid=${r.passage_id} from=${r.db_sibling_from} wc=${r.db_sibling_wc}`);
  }

  console.log('\nJSON-self IDs (own row in source has passage text):');
  for (const r of result.filter((x) => x.bucket === 'json_self')) {
    console.log(`  ${r.id.padEnd(36)} src_wc=${r.src_self_wc}`);
  }

  console.log('\nJSON-sibling sample (first 10):');
  for (const r of result.filter((x) => x.bucket === 'json_sibling').slice(0, 10)) {
    console.log(`  ${r.id.padEnd(36)} pid=${r.passage_id} from=${r.src_sibling_from} wc=${r.src_sibling_wc}`);
  }

  // Dump full result for the recovery script
  writeFileSync('vr-recovery-analysis.json', JSON.stringify({ counts, result }, null, 2));
  console.log('\nWritten: vr-recovery-analysis.json');

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
