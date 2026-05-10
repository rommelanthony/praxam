// Removes the needs_renderer flag from all 70 chart/Venn questions now that
// the ChartPassage renderer is in place. Pre/post verification inside a
// transaction; aborts with rollback if counts don't match expected.
//
// Run: npx tsx scripts/unflag-renderer.ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL missing in .env.local');

const sql = postgres(connectionString, { prepare: false });

const EXPECTED_BEFORE = 70;
const EXPECTED_AFTER = 0;

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  PRE-STATE');
  console.log('═══════════════════════════════════════════════════');
  const before = await sql`
    SELECT COUNT(*)::int AS n
    FROM questions
    WHERE flags @> '["needs_renderer"]'::jsonb
  `;
  console.log(`  needs_renderer: ${before[0].n}\n`);

  if (before[0].n !== EXPECTED_BEFORE) {
    throw new Error(`Expected ${EXPECTED_BEFORE} flagged rows, found ${before[0].n}. Aborting.`);
  }

  await sql.begin(async (tx) => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  APPLYING UNFLAG (in transaction)');
    console.log('═══════════════════════════════════════════════════');
    const result = await tx`
      UPDATE questions
      SET flags = flags - 'needs_renderer'
      WHERE flags @> '["needs_renderer"]'::jsonb
    `;
    console.log(`  ✓ UPDATE — ${result.count} rows affected\n`);

    const after = await tx`
      SELECT COUNT(*)::int AS n
      FROM questions
      WHERE flags @> '["needs_renderer"]'::jsonb
    `;
    console.log('═══════════════════════════════════════════════════');
    console.log('  POST-STATE VERIFICATION');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  needs_renderer expected ${EXPECTED_AFTER}, got ${after[0].n}`);

    if (after[0].n !== EXPECTED_AFTER) {
      console.log('\n❌  HALTING — verification failed. Rolling back.');
      throw new Error(`Verification mismatch: needs_renderer count ${after[0].n}, expected ${EXPECTED_AFTER}`);
    }

    if (result.count !== EXPECTED_BEFORE) {
      console.log('\n❌  HALTING — UPDATE affected unexpected row count. Rolling back.');
      throw new Error(`Update affected ${result.count} rows, expected ${EXPECTED_BEFORE}`);
    }

    console.log('\n✅  Counts match. Committing.');
  });

  console.log('\nDone. Transaction committed.');
  await sql.end();
}

main().catch(async (err) => {
  console.error('\n❌  Apply failed (transaction rolled back):', err.message);
  await sql.end();
  process.exit(1);
});
