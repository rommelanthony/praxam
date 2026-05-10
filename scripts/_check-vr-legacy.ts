import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const rows = await sql`
    SELECT id, passage_id, passage_title, flags,
           length(coalesce(passage, '')) AS passage_chars,
           array_length(string_to_array(coalesce(passage, ''), ' '), 1) AS passage_words
    FROM questions
    WHERE id IN ('vr-005','vr-008','vr-009','vr-010')
    ORDER BY id
  `;
  for (const r of rows) console.log(r);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
