// Hidden flag types — questions carrying any of these are not served.
// Used by both the public question API (app/api/questions/route.ts) and the
// server-side picker (lib/practice.ts) to keep the gating identical.
import { sql, type AnyColumn, type SQL } from 'drizzle-orm';

export const HIDDEN_FLAGS = [
  'needs_asset',
  'needs_passage',
  'requires_image',
  'needs_image',
  'needs_review',
  'yes_no_format',
  'most_least_format',
  'passage_mismatch',
] as const;

export type HiddenFlag = (typeof HIDDEN_FLAGS)[number];

// Drizzle SQL fragment that excludes rows whose `flags` jsonb array overlaps
// with HIDDEN_FLAGS (i.e. the row is flagged broken). Use in .where() like any
// other predicate: `.where(and(eq(...), excludeHiddenFlags(questions.flags)))`.
//
// Implementation note: Drizzle's parameter binding through postgres-js
// serializes a JS array as a row/record type, not as a Postgres array — so
// `?| ${jsArray}::text[]` fails at runtime with "cannot cast type record to
// text[]". The fix is to expand HIDDEN_FLAGS via sql.join so each flag binds
// as a separate scalar parameter (array[$1, $2, ...]); Postgres infers text[]
// from the scalar literals and ?| accepts it cleanly. Centralizing here so
// the brittle incantation lives in exactly one place.
export function excludeHiddenFlags(flagsColumn: AnyColumn): SQL {
  return sql`NOT (
    COALESCE(${flagsColumn}, '[]'::jsonb) ?| array[${sql.join(
      HIDDEN_FLAGS.map((f) => sql`${f}`),
      sql`, `,
    )}]
  )`;
}
