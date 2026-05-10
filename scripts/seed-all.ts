// scripts/seed-all.ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { NewQuestion } from '../db/schema';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not found in .env.local');
console.log('Connecting to:', connectionString.replace(/:([^@]+)@/, ':***@'));

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });
const FREE_PER_SUBTEST = 10;
const QB_DIR = resolve(process.cwd(), '..', '..', 'questionbank', 'data');

const SOURCES: { dir: string; label: string; subtests: string[] }[] = [
  { dir: join(QB_DIR, 'by-subtest-enriched'),     label: 'hutton + medichut',   subtests: ['verbal_reasoning','quantitative_reasoning','abstract_reasoning','situational_judgement','decision_making'] },
  { dir: join(QB_DIR, 'picard-1250-enriched'),    label: 'picard-1250',         subtests: ['verbal_reasoning','quantitative_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'kaplan-ukcat-enriched'),   label: 'kaplan-2nd-ed',       subtests: ['verbal_reasoning','quantitative_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'picard-1000-enriched'),    label: 'picard-1000',         subtests: ['verbal_reasoning','quantitative_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'green-800-enriched'),      label: 'green-800',           subtests: ['verbal_reasoning','quantitative_reasoning','decision_making','situational_judgement'] },
  { dir: join(QB_DIR, 'kaplan3-ukcat-enriched'),  label: 'kaplan-3rd-ed',       subtests: ['verbal_reasoning','quantitative_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'bryon-700-enriched'),      label: 'bryon-700',           subtests: ['verbal_reasoning','quantitative_reasoning','decision_making'] },
  { dir: join(QB_DIR, 'bryon-750-enriched'),      label: 'bryon-750',           subtests: ['verbal_reasoning','quantitative_reasoning','decision_making'] },
  { dir: join(QB_DIR, 'tomkins-enriched'),        label: 'tomkins-2014',        subtests: ['verbal_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'hutton-glenn-enriched'),   label: 'hutton-glenn',        subtests: ['quantitative_reasoning','decision_making'] },
  { dir: join(QB_DIR, 'hutton-rosalie-enriched'), label: 'hutton-rosalie',      subtests: ['quantitative_reasoning','decision_making'] },
  { dir: join(QB_DIR, 'seale-enriched'),          label: 'seale-radford',       subtests: ['verbal_reasoning','quantitative_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'mastering-enriched'),      label: 'mastering-ukcat',     subtests: ['verbal_reasoning','situational_judgement'] },
  { dir: join(QB_DIR, 'green-2008-enriched'),     label: 'green-2008',          subtests: ['verbal_reasoning','quantitative_reasoning','decision_making'] },
  { dir: join(QB_DIR, 'green-multi-enriched'),    label: 'green-multi',         subtests: ['verbal_reasoning','quantitative_reasoning','decision_making','situational_judgement'] },
  { dir: join(QB_DIR, 'generated-enriched'),      label: 'ai-generated',        subtests: ['verbal_reasoning','quantitative_reasoning','situational_judgement','decision_making'] },
];

function mapQ(q: any, isFree: boolean): NewQuestion {
  return {
    id: q.id, subtest: q.subtest, topic: q.topic ?? null,
    difficulty: q.difficulty ?? null, passage: q.passage ?? null,
    passageTitle: q.passageTitle ?? null, passageId: q.passageId ?? null,
    stem: q.stem, choices: q.choices, correctAnswer: q.correctAnswer ?? null,
    explanation: q.explanation ?? null, groupExplanation: q.groupExplanation ?? null,
    imageRefs: q.imageRefs ?? [], imageRoles: q.imageRoles ?? {},
    source: q.source ?? null, flags: q.flags ?? [], isFree,
  };
}

function loadFile(dir: string, subtest: string): any[] {
  const p = join(dir, `${subtest}.json`);
  if (!existsSync(p)) return [];
  return (JSON.parse(readFileSync(p, 'utf-8')) as any[]).filter(q => q.correctAnswer);
}

async function seed() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     PracXAM — Full Question Bank Seed    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const freeCount: Record<string, number> = {};
  let all: NewQuestion[] = [];

  for (const src of SOURCES) {
    console.log(`📚  ${src.label}`);
    for (const subtest of src.subtests) {
      const raw = loadFile(src.dir, subtest);
      if (!raw.length) { console.log(`    ⚠  ${subtest}: not found / empty`); continue; }
      if (!(subtest in freeCount)) freeCount[subtest] = 0;
      const mapped = raw.map(q => {
        const isFree = freeCount[subtest] < FREE_PER_SUBTEST;
        if (isFree) freeCount[subtest]++;
        return mapQ(q, isFree);
      });
      all = all.concat(mapped);
      const withExpl = mapped.filter(q => (q.explanation?.length ?? 0) > 60).length;
      console.log(`    ✓  ${subtest}: ${mapped.length} (${withExpl} with explanations)`);
    }
    console.log();
  }

  const deduped = new Map<string, NewQuestion>();
  for (const q of all) deduped.set(q.id, q);
  const final = Array.from(deduped.values());

  console.log('──────────────────────────────────────────');
  const bySubtest: Record<string, number> = {};
  for (const q of final) bySubtest[q.subtest] = (bySubtest[q.subtest] ?? 0) + 1;
  for (const [s, c] of Object.entries(bySubtest))
    console.log(`  ${s}: ${c} (${freeCount[s] ?? 0} free)`);
  console.log(`  TOTAL: ${final.length}`);
  console.log('──────────────────────────────────────────\n');

  const BATCH = 100;
  for (let i = 0; i < final.length; i += BATCH) {
    const batch = final.slice(i, i + BATCH);
    await db.insert(schema.questions).values(batch).onConflictDoUpdate({
      target: schema.questions.id,
      set: {
        stem: sql`excluded.stem`, choices: sql`excluded.choices`,
        correctAnswer: sql`excluded.correct_answer`, explanation: sql`excluded.explanation`,
        passage: sql`excluded.passage`, passageTitle: sql`excluded.passage_title`,
        passageId: sql`excluded.passage_id`, isFree: sql`excluded.is_free`,
        topic: sql`excluded.topic`, source: sql`excluded.source`, flags: sql`excluded.flags`,
      },
    });
    process.stdout.write(`\r  Seeding... ${i + batch.length}/${final.length} (${Math.round((i + batch.length) / final.length * 100)}%)`);
  }
  console.log(`\n\n✅  Done! ${final.length} questions seeded.\n`);
  process.exit(0);
}

seed().catch(err => { console.error('\n❌  Seed failed:', err); process.exit(1); });
