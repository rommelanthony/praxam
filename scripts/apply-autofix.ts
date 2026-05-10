// Applies audit-autofix.sql's three UPDATE blocks (needs_passage, needs_asset,
// needs_renderer) inside a single transaction with pre-state snapshot and
// post-state verification. Aborts with rollback if counts don't match the
// expected values.
//
// Run: npx tsx scripts/apply-autofix.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL missing in .env.local');

const sql = postgres(connectionString, { prepare: false });

const EXPECTED = {
  needs_passage: 77,
  needs_asset: 92,
  needs_renderer: 70,
} as const;

async function main() {
  // ----- Pre-state snapshot -----
  console.log('═══════════════════════════════════════════════════');
  console.log('  PRE-STATE: questions grouped by flag-array length');
  console.log('═══════════════════════════════════════════════════');
  const before = await sql`
    SELECT
      COALESCE(jsonb_array_length(flags), 0) AS flag_count,
      COUNT(*)::int AS questions
    FROM questions
    GROUP BY 1
    ORDER BY 1
  `;
  for (const r of before) console.log(`  ${r.flag_count} flag(s): ${r.questions} questions`);
  const totalBefore = before.reduce((s, r) => s + Number(r.questions), 0);
  console.log(`  total: ${totalBefore} questions\n`);

  // Existing per-flag counts (in case a previous run partially applied)
  const beforeByFlag = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_passage"]'::jsonb)  AS needs_passage,
      (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_asset"]'::jsonb)    AS needs_asset,
      (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_renderer"]'::jsonb) AS needs_renderer
  `;
  console.log('Pre-state per-flag counts:');
  console.log(`  needs_passage:  ${beforeByFlag[0].needs_passage}`);
  console.log(`  needs_asset:    ${beforeByFlag[0].needs_asset}`);
  console.log(`  needs_renderer: ${beforeByFlag[0].needs_renderer}\n`);

  // ----- Extract the 3 UPDATEs from audit-autofix.sql -----
  const raw = readFileSync('audit-autofix.sql', 'utf-8');
  const statements = raw
    .split(/\n/)
    .filter((line) => !line.trim().startsWith('--') && line.trim().length > 0)
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.toUpperCase().startsWith('UPDATE'));

  if (statements.length !== 3) {
    throw new Error(`Expected 3 UPDATE statements, found ${statements.length}`);
  }
  console.log(`Found ${statements.length} UPDATE statements to execute.\n`);

  // ----- Apply inside a transaction -----
  await sql.begin(async (tx) => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  APPLYING UPDATES (in transaction)');
    console.log('═══════════════════════════════════════════════════');
    for (const stmt of statements) {
      const result = await tx.unsafe(stmt);
      // Identify which flag this UPDATE was for, by inspecting the SQL
      const flagMatch = stmt.match(/'\["(needs_\w+)"\]'::jsonb/);
      const flag = flagMatch ? flagMatch[1] : '?';
      console.log(`  ✓ UPDATE (${flag}) — ${result.count} rows affected`);
    }
    console.log();

    // ----- Verification (still inside tx so we can rollback) -----
    console.log('═══════════════════════════════════════════════════');
    console.log('  POST-STATE VERIFICATION');
    console.log('═══════════════════════════════════════════════════');
    const after = await tx`
      SELECT
        (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_passage"]'::jsonb)  AS needs_passage,
        (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_asset"]'::jsonb)    AS needs_asset,
        (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_renderer"]'::jsonb) AS needs_renderer
    `;
    const got = after[0];

    type FlagKey = keyof typeof EXPECTED;
    const mismatches: string[] = [];
    for (const flag of Object.keys(EXPECTED) as FlagKey[]) {
      const actual = Number(got[flag]);
      const expected = EXPECTED[flag];
      const symbol = actual === expected ? '✓' : '✗';
      console.log(`  ${symbol} ${flag.padEnd(16)} expected ${expected}, got ${actual}`);
      if (actual !== expected) {
        mismatches.push(`${flag}: expected ${expected}, got ${actual}`);
      }
    }

    if (mismatches.length > 0) {
      console.log('\n❌  HALTING — verification failed. Rolling back.');
      throw new Error('Verification mismatch:\n' + mismatches.join('\n'));
    }
    console.log('\n✅  All counts match expected values. Committing.');
  });

  console.log('\nDone. Transaction committed.');
  await sql.end();
}

main().catch(async (err) => {
  console.error('\n❌  Apply failed (transaction rolled back):', err.message);
  await sql.end();
  process.exit(1);
});
