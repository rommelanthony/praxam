// scripts/seed.ts
// Run with: npm run db:seed
import { config } from 'dotenv';
import { resolve } from 'path';

// Explicitly load .env.local (dotenv/config only loads .env by default)
config({ path: resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { NewQuestion } from '../db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not found in .env.local');

console.log('Connecting to:', connectionString.replace(/:([^@]+)@/, ':***@'));

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

const FREE_PER_SUBTEST = 10;

const questions: NewQuestion[] = [
  // ── VERBAL REASONING ──────────────────────────────────
  {
    id: 'vr-001', subtest: 'verbal_reasoning',
    passageId: 'vr-p1', passageTitle: 'Polar Bears & Brown Bears',
    passage: `Recent research has demonstrated that all of today's polar bears are descended from prehistoric brown bears that lived in Ireland. Female brown bears interbred with a prehistoric species of polar bear during the last Ice Age, which ultimately wiped out the earlier, non-hybrid polar bears. Scientists proved this using mitochondrial DNA — an offspring's mitochondrial DNA is identical to its mother's. Bones and teeth from female brown bears that lived in Ireland 100 to 380 centuries ago match the mitochondrial DNA found in polar bears today.\n\nPolar bears eat a diet composed exclusively of meat and fish, and excel at swimming in cold, icy seas. Brown bears live in the forest and eat a diet that includes carnivorous options, along with plants and berries.\n\nIreland is far too warm for polar bears today, though its climate would have cooled considerably during the Ice Age, bringing prehistoric polar bears into contact with ancient brown bears.`,
    stem: 'Which of these statements about brown bears cannot be true?',
    choices: [
      { label: 'A', text: 'They are known to eat plants and berries.' },
      { label: 'B', text: 'They eat only meat and fish.' },
      { label: 'C', text: 'They favour a habitat with trees.' },
      { label: 'D', text: 'They prefer a habitat that is not watery or icy.' },
    ],
    correctAnswer: 'B',
    explanation: 'The passage states brown bears eat plants and berries as well as meat — so they cannot eat ONLY meat and fish.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '1' },
  },
  {
    id: 'vr-002', subtest: 'verbal_reasoning',
    passageId: 'vr-p1', passageTitle: 'Polar Bears & Brown Bears',
    passage: null,
    stem: 'The ancestry of polar bears has been traced to prehistoric brown bears in Ireland because the two types of bears have:',
    choices: [
      { label: 'A', text: 'Identical mitochondria.' },
      { label: 'B', text: 'The same mitochondrial DNA.' },
      { label: 'C', text: 'Mothers with similar traits.' },
      { label: 'D', text: 'An unbroken chain of paternal genes.' },
    ],
    correctAnswer: 'B',
    explanation: 'The passage explicitly states mitochondrial DNA was used to prove the link — not mitochondria themselves, nor paternal genes.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '2' },
  },
  {
    id: 'vr-003', subtest: 'verbal_reasoning',
    passageId: 'vr-p1', passageTitle: 'Polar Bears & Brown Bears',
    passage: null,
    stem: 'In the last Ice Age, it must be true that:',
    choices: [
      { label: 'A', text: "Iceland's climate cooled." },
      { label: 'B', text: "Ireland's climate warmed up." },
      { label: 'C', text: "Iceland's climate warmed up." },
      { label: 'D', text: "Ireland's climate cooled." },
    ],
    correctAnswer: 'D',
    explanation: "The passage states Ireland's climate cooled during the Ice Age, bringing polar bears into contact with brown bears there.",
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '3' },
  },
  {
    id: 'vr-004', subtest: 'verbal_reasoning',
    passageId: 'vr-p1', passageTitle: 'Polar Bears & Brown Bears',
    passage: null,
    stem: 'The author would be most likely to agree with which of the following assertions?',
    choices: [
      { label: 'A', text: 'Some bears survived the Ice Age.' },
      { label: 'B', text: 'Mating between species is a common occurrence.' },
      { label: 'C', text: 'No bears survived the Ice Age.' },
      { label: 'D', text: 'There are no examples of successful mating between species.' },
    ],
    correctAnswer: 'A',
    explanation: "Today's polar bears exist, meaning some bears survived the Ice Age. Interbreeding is described as creating a hybrid — not as a common event.",
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '4' },
  },
  {
    id: 'vr-005', subtest: 'verbal_reasoning',
    passageId: 'vr-p2', passageTitle: 'Sarah Bernhardt',
    passage: `Sarah Bernhardt was a French stage and early film actress. She was educated at the French Conservatoire — the Government-sponsored school of acting — from the age of 13, and made her debut at the Comédie-Française in 1862. She enjoyed a decades-long career across Europe and the Americas. The novelist Alexandre Dumas fils (author of The Three Musketeers, son of Alexandre Dumas who wrote Kean) described Bernhardt as a notorious liar. Her birth certificate was lost in a fire and she fabricated new records. She was a pioneer in film, playing Hamlet in Le Duel d'Hamlet in 1900 and starring in eight motion pictures. Today she is best remembered as 'The Divine Sarah'.`,
    stem: "All of these statements regarding Sarah Bernhardt's career are true EXCEPT:",
    choices: [
      { label: 'A', text: 'She never appeared in films.' },
      { label: 'B', text: 'She played the role of Hamlet.' },
      { label: 'C', text: 'Her career spanned two centuries.' },
      { label: 'D', text: 'Her career spanned multiple continents.' },
    ],
    correctAnswer: 'A',
    explanation: 'The passage explicitly states she starred in eight motion pictures — so A is false.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '5' },
  },
  {
    id: 'vr-006', subtest: 'verbal_reasoning',
    passageId: 'vr-p2', passageTitle: 'Sarah Bernhardt',
    passage: null,
    stem: 'An unusual fact about the novelist who wrote The Three Musketeers is that:',
    choices: [
      { label: 'A', text: 'His father was also a novelist.' },
      { label: 'B', text: 'He and his father were not actually French.' },
      { label: 'C', text: 'He and his father had the same name.' },
      { label: 'D', text: "His father was France's best-known actor." },
    ],
    correctAnswer: 'C',
    explanation: 'Alexandre Dumas fils shared his name with his father Alexandre Dumas — both named Alexandre Dumas.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '6' },
  },
  {
    id: 'vr-007', subtest: 'verbal_reasoning',
    passageId: 'vr-p2', passageTitle: 'Sarah Bernhardt',
    passage: null,
    stem: "The author suggests that Sarah Bernhardt's personal history:",
    choices: [
      { label: 'A', text: 'Was entirely fabricated.' },
      { label: 'B', text: 'Was based in unfounded rumours that she was a vampire.' },
      { label: 'C', text: 'Is more or less unknowable.' },
      { label: 'D', text: 'Is irrelevant to her reputation.' },
    ],
    correctAnswer: 'C',
    explanation: 'Her birth certificate was lost and she fabricated records — her past is described as largely inscrutable.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '7' },
  },
  {
    id: 'vr-008', subtest: 'verbal_reasoning',
    passageId: 'vr-p2', passageTitle: 'Sarah Bernhardt',
    passage: null,
    stem: 'According to the passage, in the 19th century the French government:',
    choices: [
      { label: 'A', text: 'Fully funded the French national theatre.' },
      { label: 'B', text: 'Invested heavily in early films.' },
      { label: 'C', text: 'Supported the work of Art Nouveau painters.' },
      { label: 'D', text: 'Subsidised a theatre training scheme.' },
    ],
    correctAnswer: 'D',
    explanation: 'The Conservatoire is described as the "Government-sponsored school of acting" — a subsidised training scheme.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '8' },
  },
  {
    id: 'vr-009', subtest: 'verbal_reasoning',
    passageId: 'vr-p3', passageTitle: 'Town and Country Planning Act',
    passage: `The Town and Country Planning Act, passed in 1947, established the national system of town planning still in use across the UK today. The system is plan-led: all development must begin with a development plan, public consultation and planning permission. Over time the Act has become a vehicle for climate control, carbon emission reduction and housing access. It makes provisions for listed buildings — those with architectural or historical interest. Owners can be required to keep them in good repair and must receive listed building consent before making alterations. Fifty-nine years after its institution, the Act was revised and the Development Plan was replaced by the Local Development Framework. Today, planning applications must also include a Design and Access statement.`,
    stem: 'It must be true that the Town and Country Planning Act:',
    choices: [
      { label: 'A', text: 'Has not changed fundamentally since it became law.' },
      { label: 'B', text: 'Was revised in 2006.' },
      { label: 'C', text: 'No longer requires a Local Development Framework.' },
      { label: 'D', text: 'Applies only in England and Wales.' },
    ],
    correctAnswer: 'B',
    explanation: 'Passed in 1947, revised 59 years later = 2006. This is a valid calculation from the passage.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '9' },
  },
  {
    id: 'vr-010', subtest: 'verbal_reasoning',
    passageId: 'vr-p3', passageTitle: 'Town and Country Planning Act',
    passage: null,
    stem: 'According to the passage, which of these assertions must be false?',
    choices: [
      { label: 'A', text: 'Listed buildings can be refurbished.' },
      { label: 'B', text: 'Listed buildings have some architectural or historical relevance.' },
      { label: 'C', text: 'Listed buildings can never be repaired.' },
      { label: 'D', text: 'Listed buildings cannot be altered without consent.' },
    ],
    correctAnswer: 'C',
    explanation: 'The passage says owners can be required to keep listed buildings "in good repair" — so they can clearly be repaired. C must be false.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: '10' },
  },

  // ── QUANTITATIVE REASONING ─────────────────────────────
  {
    id: 'qr-001', subtest: 'quantitative_reasoning',
    passageId: 'qr-p1', passageTitle: 'Lincoln Crime Rates 2005–2006',
    passage: `Lincoln crime data 2005–2006 (per 1,000 population):\n• Robbery: 73 total, 0.84 locally, 1.85 nationally\n• Theft of motor vehicle: 283 total, 3.27 locally, 4.04 nationally\n• Theft from motor vehicle: 789 total, 9.12 locally, 9.56 nationally\n• Sexual offences: 186 total, 2.15 locally, 1.17 nationally\n• Violence against a person: 2,885 total, 33.33 locally, 19.97 nationally\n• Burglary: 552 total, 6.38 locally, 5.67 nationally\n• TOTAL: 4,768\nLocal population: 86,547 | National: 60,200,000`,
    stem: 'What percentage of crimes committed locally were thefts of motor vehicles?',
    choices: [
      { label: 'A', text: '6%' },
      { label: 'B', text: '9%' },
      { label: 'C', text: '14%' },
      { label: 'D', text: '17%' },
      { label: 'E', text: '25%' },
    ],
    correctAnswer: 'A',
    explanation: '283 ÷ 4,768 = 0.0593 ≈ 6%.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'QR-1' },
  },
  {
    id: 'qr-002', subtest: 'quantitative_reasoning',
    passageId: 'qr-p1', passageTitle: 'Lincoln Crime Rates 2005–2006',
    passage: null,
    stem: 'What was the rate of crimes per person in Lincoln in 2005–2006?',
    choices: [
      { label: 'A', text: '1:22' },
      { label: 'B', text: '1:21' },
      { label: 'C', text: '1:20' },
      { label: 'D', text: '1:19' },
      { label: 'E', text: '1:18' },
    ],
    correctAnswer: 'E',
    explanation: '86,547 ÷ 4,768 ≈ 18.15, so approximately 1 crime per 18 people.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'QR-2' },
  },
  {
    id: 'qr-003', subtest: 'quantitative_reasoning',
    passageId: 'qr-p1', passageTitle: 'Lincoln Crime Rates 2005–2006',
    passage: null,
    stem: 'Approximately how many crimes of violence against a person were committed nationally in 2005–2006?',
    choices: [
      { label: 'A', text: '120,000' },
      { label: 'B', text: '160,000' },
      { label: 'C', text: '1.2 million' },
      { label: 'D', text: '1.4 million' },
      { label: 'E', text: '1.6 million' },
    ],
    correctAnswer: 'C',
    explanation: '19.97 per 1,000 × 60,200,000 ÷ 1,000 ≈ 1,202,194 ≈ 1.2 million.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'QR-3' },
  },
  {
    id: 'qr-004', subtest: 'quantitative_reasoning',
    passageId: 'qr-p1', passageTitle: 'Lincoln Crime Rates 2005–2006',
    passage: null,
    stem: 'How many burglaries were recorded in Lincoln in 2006–2007, if the total increased by 10% from 2005–2006?',
    choices: [
      { label: 'A', text: '582' },
      { label: 'B', text: '607' },
      { label: 'C', text: '624' },
      { label: 'D', text: '648' },
      { label: 'E', text: '652' },
    ],
    correctAnswer: 'B',
    explanation: '552 × 1.10 = 607.2 ≈ 607.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'QR-4' },
  },
  {
    id: 'qr-005', subtest: 'quantitative_reasoning',
    passageId: 'qr-p2', passageTitle: "Omar's Raffle",
    passage: `Omar's raffle prizes:\n• Mountain Bike: £185\n• Tennis Racket: £45\n• MP3 Player: £75\n• Picnic Hamper: £32\n• Hair Dryer: £19\nRaffle tickets: £1.50 each. Sales target: 300 tickets. Electrical prizes: MP3 Player & Hair Dryer.`,
    stem: 'How much did Omar spend on the prizes?',
    choices: [
      { label: 'A', text: '£85' },
      { label: 'B', text: '£115' },
      { label: 'C', text: '£140' },
      { label: 'D', text: '£356' },
      { label: 'E', text: '£435' },
    ],
    correctAnswer: 'D',
    explanation: '£185 + £45 + £75 + £32 + £19 = £356.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'QR-9' },
  },
  {
    id: 'qr-006', subtest: 'quantitative_reasoning',
    passageId: 'qr-p2', passageTitle: "Omar's Raffle",
    passage: null,
    stem: 'If Omar meets the sales target exactly, how much profit will he make?',
    choices: [
      { label: 'A', text: '£77' },
      { label: 'B', text: '£94' },
      { label: 'C', text: '£114' },
      { label: 'D', text: '£122' },
      { label: 'E', text: '£144' },
    ],
    correctAnswer: 'B',
    explanation: '300 × £1.50 = £450 revenue. £450 − £356 = £94 profit.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'QR-10' },
  },

  // ── SITUATIONAL JUDGEMENT ──────────────────────────────
  {
    id: 'sj-001', subtest: 'situational_judgement',
    passageId: 'sj-p1', passageTitle: 'Samia & Hayley',
    passage: `Samia and Hayley are final-year medical students. That morning, Samia receives a call from Hayley saying she is unwell with diarrhoea and cannot come in. On her way home, Samia is surprised to see Hayley working behind the counter at the local bakery.`,
    stem: 'Report Hayley to the medical school for lying about her illness.',
    choices: [
      { label: 'A', text: 'A very appropriate thing to do' },
      { label: 'B', text: 'Appropriate, but not ideal' },
      { label: 'C', text: 'Inappropriate, but not awful' },
      { label: 'D', text: 'A very inappropriate thing to do' },
    ],
    correctAnswer: 'D',
    explanation: 'Escalating immediately to the medical school without first speaking to Hayley is disproportionate.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'SJ-1' },
  },
  {
    id: 'sj-002', subtest: 'situational_judgement',
    passageId: 'sj-p1', passageTitle: 'Samia & Hayley',
    passage: null,
    stem: 'Ask Hayley why she said she could not come to hospital if she was well enough to work in the bakery.',
    choices: [
      { label: 'A', text: 'A very appropriate thing to do' },
      { label: 'B', text: 'Appropriate, but not ideal' },
      { label: 'C', text: 'Inappropriate, but not awful' },
      { label: 'D', text: 'A very inappropriate thing to do' },
    ],
    correctAnswer: 'B',
    explanation: 'Directly confronting Hayley is reasonable but ideally Samia might first consider whether there is an innocent explanation.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'SJ-4' },
  },
  {
    id: 'sj-003', subtest: 'situational_judgement',
    passageId: 'sj-p1', passageTitle: 'Samia & Hayley',
    passage: null,
    stem: 'Ask Hayley the next day how she is feeling and whether she managed to get out and about at all the previous day.',
    choices: [
      { label: 'A', text: 'A very appropriate thing to do' },
      { label: 'B', text: 'Appropriate, but not ideal' },
      { label: 'C', text: 'Inappropriate, but not awful' },
      { label: 'D', text: 'A very inappropriate thing to do' },
    ],
    correctAnswer: 'A',
    explanation: 'This gives Hayley a chance to explain herself honestly without direct confrontation — tactful and professional.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'SJ-5' },
  },
  {
    id: 'sj-004', subtest: 'situational_judgement',
    passageId: 'sj-p2', passageTitle: 'Tameka & Shaun',
    passage: `Tameka is a junior doctor. Medical student Shaun has joined her as she asks Mrs Oswald to sign a consent form for surgery. Mrs Oswald says she is terrified of needles and asks if she can be hypnotised instead. Shaun sneers and says that if Mrs Oswald is so superstitious, maybe they can hypnotise her bowel and avoid surgery altogether.`,
    stem: 'Apologise to Mrs Oswald for the rude remark from her student.',
    choices: [
      { label: 'A', text: 'A very appropriate thing to do' },
      { label: 'B', text: 'Appropriate, but not ideal' },
      { label: 'C', text: 'Inappropriate, but not awful' },
      { label: 'D', text: 'A very inappropriate thing to do' },
    ],
    correctAnswer: 'A',
    explanation: "Apologising to the patient immediately is appropriate — Tameka is responsible for the student's conduct.",
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'SJ-6' },
  },
  {
    id: 'sj-005', subtest: 'situational_judgement',
    passageId: 'sj-p2', passageTitle: 'Tameka & Shaun',
    passage: null,
    stem: 'Tell Shaun his comment is unhelpful, and ask him to apologise.',
    choices: [
      { label: 'A', text: 'A very appropriate thing to do' },
      { label: 'B', text: 'Appropriate, but not ideal' },
      { label: 'C', text: 'Inappropriate, but not awful' },
      { label: 'D', text: 'A very inappropriate thing to do' },
    ],
    correctAnswer: 'A',
    explanation: 'Addressing Shaun directly and asking him to apologise corrects the behaviour and restores patient dignity.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'SJ-7' },
  },

  // ── DECISION ANALYSIS ─────────────────────────────────
  {
    id: 'da-001', subtest: 'decision_making',
    passageId: 'da-p1', passageTitle: 'Egyptology Code',
    passage: `Code table — Operators: A=old, B=increase, C=pharaoh, D=under, E=command, F=past, G=negative, H=place, J=god, K=kill, L=big, M=opposite. Numbers: 1=Egypt, 2=woman, 3=triangle, 4=build, 5=sand, 6=sun, 7=temple, 8=river, 9=leave, 10=sleep, 11=snake, 12=guard, 13=perfume, 14=jar, 15=find, 16=wash, 17=camel, 18=brain, 19=wheat.`,
    stem: 'Best interpretation of coded message: 2(12, 7), K(B11)',
    choices: [
      { label: 'A', text: 'The temple guard is a woman who kills big snakes.' },
      { label: 'B', text: 'The temple guard is a woman and a snake killer.' },
      { label: 'C', text: 'The woman guarding the temple killed snakes.' },
      { label: 'D', text: 'The woman guarding the temple kills snakes.' },
      { label: 'E', text: 'The temple guardian killed the big female snake.' },
    ],
    correctAnswer: 'D',
    explanation: '2(12,7) = woman who guards the temple. K(B11) = kills many snakes, present tense. D is most precise.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'DA-1' },
  },
  {
    id: 'da-002', subtest: 'decision_making',
    passageId: 'da-p1', passageTitle: 'Egyptology Code',
    passage: null,
    stem: 'Best interpretation of coded message: 1, BC, 10(D, 3H)',
    choices: [
      { label: 'A', text: 'In Egypt, the pharaohs sleep under a pyramid.' },
      { label: 'B', text: 'Egyptian pharaohs are buried under pyramids.' },
      { label: 'C', text: 'Egyptians buried pharaohs under a pyramid.' },
      { label: 'D', text: 'The big Egyptian pharaoh sleeps under the Great Pyramid.' },
      { label: 'E', text: 'Many Egyptians put the pharaoh to rest under the pyramid.' },
    ],
    correctAnswer: 'A',
    explanation: '1=Egypt, BC=many pharaohs, 10=sleep, D=under, 3H=triangle place (pyramid). A captures all elements.',
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'DA-2' },
  },
  {
    id: 'da-003', subtest: 'decision_making',
    passageId: 'da-p1', passageTitle: 'Egyptology Code',
    passage: null,
    stem: "Best way to encode: \"Don't sleep while guarding the pharaoh's camel.\"",
    choices: [
      { label: 'A', text: 'G10, 12(C17)' },
      { label: 'B', text: 'G10, 12, L17' },
      { label: 'C', text: 'E(G10), 12(L17)' },
      { label: 'D', text: 'E12, G10, C17' },
      { label: 'E', text: 'E(G10), 12(C17)' },
    ],
    correctAnswer: 'E',
    explanation: "E=command, G10=not sleep, 12(C17)=guard the pharaoh's camel. E(G10) = command not to sleep.",
    source: { book: 'kaplan-ukcat-2014', bookTitle: 'Score Higher on the UKCAT', originalNumber: 'DA-4' },
  },
];

async function seed() {
  console.log(`\nSeeding ${questions.length} questions into Supabase...`);

  const countBySubtest: Record<string, number> = {};
  const toInsert = questions.map((q) => {
    countBySubtest[q.subtest] = (countBySubtest[q.subtest] || 0) + 1;
    return {
      ...q,
      isFree: countBySubtest[q.subtest] <= FREE_PER_SUBTEST,
    };
  });

  await db
    .insert(schema.questions)
    .values(toInsert)
    .onConflictDoUpdate({
      target: schema.questions.id,
      set: {
        stem: sql`excluded.stem`,
        choices: sql`excluded.choices`,
        correctAnswer: sql`excluded.correct_answer`,
        explanation: sql`excluded.explanation`,
        passage: sql`excluded.passage`,
        isFree: sql`excluded.is_free`,
      },
    });

  console.log(`✅ Seeded ${toInsert.length} questions successfully.`);
  console.log('   Subtests:', Object.entries(countBySubtest).map(([k, v]) => `${k}: ${v}`).join(', '));
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
