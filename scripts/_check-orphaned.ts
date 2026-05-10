import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const rows = await sql<{ id: string; stem: string; passage: string | null; passage_title: string | null; flags: string[] }[]>`
    SELECT id, stem, passage, passage_title, flags
    FROM questions
    WHERE id IN ('bryon-700-vr-0027','bryon-750-vr-0024')
    ORDER BY id
  `;
  for (const r of rows) {
    console.log('───────────────────────────────────────────────');
    console.log('id:', r.id);
    console.log('flags:', JSON.stringify(r.flags));
    console.log('passage_title:', r.passage_title);
    console.log('stem (full):');
    console.log('  ' + r.stem);
    console.log('passage (first 400 chars):');
    console.log('  ' + (r.passage ?? '∅').slice(0, 400));
  }
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
