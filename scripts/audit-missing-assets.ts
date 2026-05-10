// Audit questions that reference visual content but lack an asset.
//
// Outputs:
//   audit-report.csv        — one row per detected issue
//   audit-stats.json        — counts by subtest x issue_type, plus dropped_no_answer
//   audit-autofix.sql       — sibling-propagation re-links, needs_asset flag tags,
//                             plus exclusion list as commented DELETEs for review
//
// Run: npx tsx scripts/audit-missing-assets.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
config({ path: resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL missing in .env.local');

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

type IssueType =
  | 'missing_diagram'
  | 'missing_chart'
  | 'missing_table'
  | 'missing_passage'
  | 'orphaned_reference';

type Severity = 'critical' | 'high' | 'medium';

interface Finding {
  id: string;
  subtest: string;
  issue_type: IssueType;
  severity: Severity;
  stem_snippet: string;
  suggested_action: string;
}

// ----------------------------- detection rules -----------------------------

const RX = {
  // Rule 1 — diagram
  shapeRef: /\b(?:the |a |an |\d+ |two |three |four |five |six |several |multiple |identical |shaded )+(triangles?|circles?|rectangles?|squares?|hexagons?|polygons?|cubes?|cylinders?|spheres?)\b/i,
  shapeAdj: /\b(circular|triangular|rectangular)\b[^.]{0,40}\b(region|shape|area|figure|disc|disk)\b/i,
  geomMeasure: /\b(area|perimeter|volume) of the\b/i,
  diagramStructural: /\b(diagram|figure|shaded|shown (above|below|here)|in the (figure|diagram)|the (shape|shapes) (above|below|shown))\b/i,
  diagramAbstractGuard: /\b(imagine|consider a|suppose (that |a |an )?)/i,
  vennIdGuard: /venn/i,

  // Rule 2 — chart
  chart: /\b(graph|bar chart|pie chart|line chart|scatter ?plot|histogram|x[- ]axis|y[- ]axis|the (chart|plot)|according to the (chart|graph|plot)|venn diagram)\b/i,
  chartGuard: /\bgraph (theory|paper|of (the |a )?function|of [a-z]\(|of y ?=|on the (coordinate|cartesian))\b/i,

  // Rule 3 — table
  // Removed bare "column of" / "row of" — they false-positive on idioms
  // like "two-mile-high column of wind". Explicit table phrasing is enough.
  table: /\b(the table|table (above|below|shows|gives|presents|displays|contains)|in the table)\b/i,
  tableGuard: /\b(periodic table|table (manners|salt|spoon)|round the table|on the table)\b/i,
  pipeRow: /^\s*\|.*\|.*\|.*$/gm,

  // Rule 4 — passage
  passageRef: /\b(the passage|the text|according to the (author|passage|text|article)|the (article|extract|paragraph|writer))\b/i,

  // Rule 5 — orphan
  // "see the X" must be followed by a visual noun, not a literal monster/patient/etc.
  orphan: /\b(see (the (figure|image|diagram|chart|graph|table|illustration|picture|drawing)|above|below)|shown (above|below)|the (image|picture|drawing|illustration)|as (depicted|illustrated|shown)|refer to the)\b/i,
};

function hasAsset(q: any): boolean {
  const refs = Array.isArray(q.imageRefs) ? q.imageRefs : [];
  const roles = q.imageRoles && typeof q.imageRoles === 'object' ? q.imageRoles : {};
  return refs.length > 0 || Object.keys(roles).length > 0;
}

// Some questions carry chart/venn data inline as a JSON-encoded passage with
// a "__chart__": true marker (50 QR + 20 DM at last count). They don't need
// image_refs — the chart spec is the asset. Note: a renderer for this format
// is NOT yet wired into the practice UI, but that's a separate concern.
function hasStructuredPassage(q: any): boolean {
  const p: string = q.passage ?? '';
  return p.length > 0 && p.trimStart().startsWith('{') && p.includes('"__chart__"');
}

function pipeTableRowCount(passage: string | null): number {
  if (!passage) return 0;
  const matches = passage.match(RX.pipeRow);
  return matches ? matches.length : 0;
}

function wordCount(s: string | null): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function snippet(s: string, n = 140): string {
  const oneLine = (s ?? '').replace(/\s+/g, ' ').trim();
  return oneLine.length > n ? oneLine.slice(0, n) + '…' : oneLine;
}

function detect(q: any): Finding[] {
  const found: Finding[] = [];
  const stem: string = q.stem ?? '';
  const passage: string = q.passage ?? '';
  const combined = stem + '\n' + passage;
  const asset = hasAsset(q) || hasStructuredPassage(q);
  const subtest: string = q.subtest;
  const isVennId = RX.vennIdGuard.test(q.id);

  // Rule 1 — missing_diagram
  // Skip Venn-ID questions (they're handled by Rule 2's venn-diagram match).
  // ID-override: anything with /qr-chart/ in the ID is a chart question even
  // if the stem matches diagram patterns (e.g. "Industrial figure" = number, not diagram).
  const isChartId = /qr-chart/i.test(q.id);
  const diagramMatch =
    RX.shapeRef.test(stem) ||
    RX.shapeAdj.test(stem) ||
    RX.geomMeasure.test(stem) ||
    RX.diagramStructural.test(stem);
  if (
    !asset &&
    !isVennId &&
    !isChartId &&
    diagramMatch &&
    !RX.diagramAbstractGuard.test(stem) &&
    ['quantitative_reasoning', 'abstract_reasoning', 'decision_making'].includes(subtest)
  ) {
    found.push({
      id: q.id,
      subtest,
      issue_type: 'missing_diagram',
      severity: 'critical',
      stem_snippet: snippet(stem),
      suggested_action: 'regenerate diagram or exclude',
    });
  }

  // Rule 2 — missing_chart
  // Trigger if (a) chart language matches and isn't guarded, OR (b) ID contains
  // qr-chart (these are chart-typed by ID even when the stem omits chart vocab).
  const chartByLang = RX.chart.test(combined) && !RX.chartGuard.test(combined);
  const chartByIdFallback = isChartId && !asset;
  if (
    !asset &&
    (chartByLang || chartByIdFallback) &&
    ['quantitative_reasoning', 'decision_making'].includes(subtest)
  ) {
    found.push({
      id: q.id,
      subtest,
      issue_type: 'missing_chart',
      severity: 'critical',
      stem_snippet: snippet(stem),
      suggested_action: 'regenerate chart, render via Recharts, or exclude',
    });
  }

  // Rule 3 — missing_table
  if (
    !asset &&
    RX.table.test(combined) &&
    !RX.tableGuard.test(combined) &&
    pipeTableRowCount(passage) < 2
  ) {
    found.push({
      id: q.id,
      subtest,
      issue_type: 'missing_table',
      severity: subtest === 'situational_judgement' ? 'medium' : 'critical',
      stem_snippet: snippet(stem),
      suggested_action: 'add pipe-table to passage, regenerate, or exclude',
    });
  }

  // Rule 4 — missing_passage
  if (
    subtest === 'verbal_reasoning' &&
    wordCount(passage) < 30 &&
    RX.passageRef.test(stem)
  ) {
    found.push({
      id: q.id,
      subtest,
      issue_type: 'missing_passage',
      severity: 'high',
      stem_snippet: snippet(stem),
      suggested_action: 'recover passage from source or exclude',
    });
  }

  // Rule 5 — orphaned_reference (only if not already flagged)
  if (!asset && found.length === 0 && RX.orphan.test(stem)) {
    found.push({
      id: q.id,
      subtest,
      issue_type: 'orphaned_reference',
      severity: 'high',
      stem_snippet: snippet(stem),
      suggested_action: 'review manually — reference unclear',
    });
  }

  return found;
}

// ----------------------------- main -----------------------------

async function main() {
  console.log('Connecting to:', connectionString!.replace(/:([^@]+)@/, ':***@'));
  const all = await db.select().from(schema.questions);
  console.log(`Loaded ${all.length} questions.\n`);

  const findings: Finding[] = [];
  for (const q of all) findings.push(...detect(q));

  const stats: Record<string, Record<string, number>> = {};
  for (const f of findings) {
    stats[f.subtest] ??= {};
    stats[f.subtest][f.issue_type] = (stats[f.subtest][f.issue_type] ?? 0) + 1;
  }
  const totalBySubtest: Record<string, number> = {};
  for (const q of all) totalBySubtest[q.subtest] = (totalBySubtest[q.subtest] ?? 0) + 1;

  // ----- CSV -----
  const csvRows = ['id,subtest,issue_type,severity,stem_snippet,suggested_action'];
  const esc = (s: string) => '"' + (s ?? '').replace(/"/g, '""') + '"';
  for (const f of findings) {
    csvRows.push(
      [f.id, f.subtest, f.issue_type, f.severity, esc(f.stem_snippet), esc(f.suggested_action)].join(',')
    );
  }
  writeFileSync('audit-report.csv', csvRows.join('\n'), 'utf-8');

  // ----- Stats JSON -----
  // Note: dropped_no_answer is empty here because seed-all.ts already filters
  // those out before insertion; surfacing for transparency.
  writeFileSync(
    'audit-stats.json',
    JSON.stringify(
      {
        totalQuestions: all.length,
        totalBySubtest,
        issuesBySubtest: stats,
        totalIssues: findings.length,
        note: 'No exclusion mechanism exists in source JSON, schema, or API. Closest filter is seed-all.ts:56 dropping null-correctAnswer rows before insert; those are not present in the DB and thus not auditable here.',
      },
      null,
      2
    ),
    'utf-8'
  );

  // ----- Autofix SQL -----
  const autofixLines: string[] = [
    '-- audit-autofix.sql',
    '-- generated by scripts/audit-missing-assets.ts',
    '-- Review every block before running. Run sections one at a time.',
    '',
  ];

  // 1. Sibling propagation: hutton bundles 4 questions per chart image (q01-04).
  //    Medichut uses one image per question. For each empty-asset question,
  //    look at siblings that DO have image_refs and copy them.
  function bucketKey(id: string): string | null {
    let m = id.match(/^(hutton-\d+-(?:qr|ar|dm)-test\d+)-q(\d+)$/);
    if (m) {
      const n = parseInt(m[2]);
      const start = Math.floor((n - 1) / 4) * 4 + 1;
      return `${m[1]}-bucket-${start}-${start + 3}`;
    }
    m = id.match(/^(medichut-\d+-(?:qr|sj|vr|dm)-(?:mock|full))-q(\d+)$/);
    if (m) return `${m[1]}-q${m[2]}`;
    return null;
  }

  const sourceImg: Record<string, { refs: string[]; roles: Record<string, string> }> = {};
  for (const q of all) {
    const k = bucketKey(q.id);
    if (!k || !hasAsset(q)) continue;
    if (!sourceImg[k]) {
      sourceImg[k] = {
        refs: (q.imageRefs as string[]) ?? [],
        roles: (q.imageRoles as Record<string, string>) ?? {},
      };
    }
  }

  let relinkCount = 0;
  const relinkedIds = new Set<string>();
  autofixLines.push('-- ========== Sibling-propagation re-link (hutton/medichut) ==========');
  for (const q of all) {
    const k = bucketKey(q.id);
    if (!k || hasAsset(q)) continue;
    const src = sourceImg[k];
    if (!src) continue;
    const refsJson = JSON.stringify(src.refs).replace(/'/g, "''");
    const rolesJson = JSON.stringify(src.roles).replace(/'/g, "''");
    autofixLines.push(
      `UPDATE questions SET image_refs = '${refsJson}'::jsonb, image_roles = '${rolesJson}'::jsonb WHERE id = '${q.id}';`
    );
    relinkCount++;
    relinkedIds.add(q.id);
  }
  autofixLines.push(`-- ${relinkCount} re-link UPDATEs above.`, '');

  // 2. Tag issues with the right flag for each issue type:
  //    - missing_diagram/chart/table  -> "needs_asset"
  //    - missing_passage              -> "needs_passage"
  //    - orphaned_reference           -> "needs_review"
  // Structured-passage questions (__chart__ JSON) are excluded from issue
  // detection above (treated as having an asset); the ChartPassage renderer
  // handles them at runtime, so no tagging needed.
  const flagFor: Record<IssueType, string> = {
    missing_diagram: 'needs_asset',
    missing_chart: 'needs_asset',
    missing_table: 'needs_asset',
    missing_passage: 'needs_passage',
    orphaned_reference: 'needs_review',
  };
  const idsByFlag: Record<string, Set<string>> = {};
  for (const f of findings) {
    if (relinkedIds.has(f.id)) continue;
    const flag = flagFor[f.issue_type];
    idsByFlag[flag] ??= new Set<string>();
    idsByFlag[flag].add(f.id);
  }
  autofixLines.push('-- ========== Tag issues with per-type flags ==========');
  for (const [flag, ids] of Object.entries(idsByFlag)) {
    autofixLines.push(
      `UPDATE questions SET flags = COALESCE(flags, '[]'::jsonb) || '["${flag}"]'::jsonb WHERE id IN (${Array.from(ids)
        .map((id) => `'${id}'`)
        .join(', ')}) AND NOT (COALESCE(flags, '[]'::jsonb) @> '["${flag}"]'::jsonb);`
    );
    autofixLines.push(`-- ${ids.size} questions tagged ${flag}.`, '');
  }

  // 3. Exclusion candidates (commented for review)
  autofixLines.push('-- ========== Exclusion candidates (REVIEW MANUALLY before uncommenting) ==========');
  const criticalIds = [
    ...new Set(findings.filter((f) => f.severity === 'critical' && !relinkedIds.has(f.id)).map((f) => f.id)),
  ];
  if (criticalIds.length > 0) {
    autofixLines.push(
      `-- DELETE FROM questions WHERE id IN (${criticalIds.map((id) => `'${id}'`).join(', ')});`
    );
    autofixLines.push(`-- ${criticalIds.length} critical-severity candidates above.`);
  }

  writeFileSync('audit-autofix.sql', autofixLines.join('\n'), 'utf-8');

  // ----- Console summary -----
  console.log('═══════════════════════════════════════════════════');
  console.log('  AUDIT COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`Total questions:            ${all.length}`);
  console.log(`Total issues detected:      ${findings.length}\n`);
  console.log('Counts by subtest × issue_type:');
  const subtests = Object.keys(totalBySubtest).sort();
  const types: IssueType[] = ['missing_diagram', 'missing_chart', 'missing_table', 'missing_passage', 'orphaned_reference'];
  console.log(
    'subtest'.padEnd(26) +
      types.map((t) => t.replace('missing_', 'm_').replace('orphaned_', 'o_').padStart(11)).join('') +
      '   total'
  );
  for (const s of subtests) {
    const row = stats[s] ?? {};
    const cells = types.map((t) => String(row[t] ?? 0).padStart(11)).join('');
    const subtotal = Object.values(row).reduce((a, b) => a + b, 0);
    console.log(s.padEnd(26) + cells + String(subtotal).padStart(8));
  }
  console.log();
  console.log(`Re-linkable via siblings:     ${relinkCount}`);
  for (const [flag, ids] of Object.entries(idsByFlag)) {
    console.log(`Will tag ${flag.padEnd(16)} ${ids.size}`);
  }
  console.log(`Critical exclusion candidates: ${criticalIds.length}\n`);

  console.log('Top 20 offenders (most-severe first):');
  console.log('─'.repeat(120));
  const order = { critical: 0, high: 1, medium: 2 } as const;
  const sorted = [...findings].sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of sorted.slice(0, 20)) {
    console.log(`[${f.severity.padEnd(8)}] ${f.id.padEnd(34)} ${f.issue_type.padEnd(20)} ${f.stem_snippet.slice(0, 70)}`);
  }
  console.log('\nFiles written: audit-report.csv, audit-stats.json, audit-autofix.sql');
  process.exit(0);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
