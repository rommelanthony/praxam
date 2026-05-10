// Throwaway: confirm current flag counts.
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  const r = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_passage"]'::jsonb)  AS needs_passage,
      (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_asset"]'::jsonb)    AS needs_asset,
      (SELECT COUNT(*)::int FROM questions WHERE flags @> '["needs_renderer"]'::jsonb) AS needs_renderer
  `;
  console.log('Current flag counts:');
  console.log(`  needs_passage:  ${r[0].needs_passage}`);
  console.log(`  needs_asset:    ${r[0].needs_asset}`);
  console.log(`  needs_renderer: ${r[0].needs_renderer}`);
  await sql.end();
}
main();
