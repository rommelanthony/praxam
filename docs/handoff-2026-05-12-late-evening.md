# PracXAM session handoff — 2026-05-12 (late evening, post-bank-sweep)

## Read this first

Bank-wide pattern sweep completed for all four non-DM subtests (VR, QR, SJ, AR). **366 rows flagged `needs_passage` and 8 rows flagged `needs_review` this session.** No code changes; this was a DB-only cleanup session.

**The big finding:** two of the four heuristics from the prior handoff (corrupt-glyph regex, dup-stem) generate large numbers of false positives outside DM. They were tuned for DM-specific damage shapes and don't generalize. The orphan-siblings heuristic remains rock-solid; short-stem is a useful signal but needs eyes-on per cohort. Details below.

## Project context

- **Project:** PracXAM.com — UCAT prep platform
- **Repo:** https://github.com/rommelanthony/praxam (main, deployed)
- **Local path:** `C:\Users\romme\Downloads\UCAT\UCAT\praxam\web`
- **Source data path:** `C:\Users\romme\Downloads\UCAT\UCAT\questionbank`
- **Supabase:** project `yoxrzrjpselwkpbfrzoq` (ap-southeast-2)
- **Stack:** Next.js 15, Supabase (Postgres 15+), Drizzle ORM, Vercel (syd1), Tailwind

## What shipped this session

Three idempotent UPDATEs against `questions`. Each uses the same corrected predicate pattern from the prior handoff (anchor-exclusion + empty-string + non-empty-anchor + 8-flag-exclusion).

**1. VR — 37 rows `needs_passage`.** Orphan siblings across 17 passage groups. Groups: hutton-2010-vr-test2, kaplan3-vr-p002/p005, picard-1000-vr-p003, multiple seale-radford-vr-p*, bryon-700-vr-p015, bryon-750-vr-p017, kaplan-vr-p004, tomkins-2014-vr-p004.

**2. QR — 175 rows `needs_passage`.** Orphan siblings across 47 passage groups. Mostly hutton-2010-qr-test1/test2 (all 10 question groups in each test, no scenario anchors), medichut-2023-qr-full-scenario-01..09 (4 rows each, missing scenarios), kaplan3-qr-p007/p009/p010 (DA-style code questions misclassified as QR), green-2008-qr-p005.

**2b. QR — 8 rows `needs_review`.** Too-many-choices cohort. Mixed: 4 green-800-qr rows with PDF-extraction-mojibake stems ("diff erence", "rifl e") and bogus extra choices; 4 picard-1000-qr rows with 6-10 choices where some choices contain "Rose-\nbud" and "£47.50 boe75" extraction artifacts. Conservative flag (some may be legitimate 10-option questions); render-test before unflagging.

**3. SJ — 154 rows `needs_passage`.** Orphan siblings across 33 passage groups. Includes anomalous `picard-1000-sj-p017` (56 rows in one group — every stem points to a missing passage), the entire `mastering-ukcat-sj-*` cohort (~60 rows where stems are literally `"Question 1"` — extraction artifact; recoverable only via re-ingest), `tomkins-2014-sj` rows (stems concatenated with answer-rating labels like "Inappropriate, but not awful" — column-boundary extraction error).

**Verification confirmed:** total flagged needs_passage moved 182 → 548 (Δ +366 = 37+175+154). total needs_review moved 9 → 17 (Δ +8). No drift.

## Current question-bank state

| Subtest | Total | Flagged | needs_passage | needs_review | Render-verified clean? |
|---|---|---|---|---|---|
| Decision Making | 369 | 242 | 180 | 6 | ✓ yes (prior session) |
| Verbal Reasoning | 1,029 | 43 | 39 | 3 | ✗ heuristic-flagged only |
| Quantitative Reasoning | 1,054 | 284 | 175 | 8 | ✗ heuristic-flagged only |
| Situational Judgement | 984 | 156 | 154 | 0 | ✗ heuristic-flagged only |
| Abstract Reasoning | 130 | 0 | 0 | 0 | ✓ structurally complete (image-state verified) |
| **Total** | **3,566** | **725** | **548** | **17** | — |

Serveable count: ~2,841 (3,566 − 725). The morning's "3,395 clean" estimate was significantly off; the real count after end-to-end sweep is ~17% lower.

Global per-flag counts: needs_passage 548, needs_asset 125, requires_image 32, needs_review 17, yes_no_format 8, needs_image 2, most_least_format 2, passage_mismatch 1. (Some rows multi-flagged; total flagged rows = 725.)

## Heuristic-generalizability findings (NEW — important)

The handoff plan assumed all four heuristics would behave similarly across subtests. They don't.

**Orphan-siblings (pattern A) — RELIABLE across all subtests with corrected predicate.** Cleanly identifies real orphan damage. False-positive rate near zero. This is the workhorse heuristic. Used in 5 successful UPDATEs across two sessions now (gen-dm last session; VR/QR/SJ this session). Keep using it.

**Short-stem (pattern B) — REQUIRES PER-COHORT EYES-ON.** Outside DM, "stem < 40 chars" catches:
- Legitimate terse QR questions ("What is X?") — 22 of 71 in QR, leave alone
- Orphan-cohort subset (overlap) — already flagged by pattern A
- Truncated/extraction-corrupt stems (gen-vr cohort: "HPV 16 and HPV") — real damage but mixed in with the above
- Junk-label stems (mastering-ukcat-sj-* "Question 1") — caught by pattern A as orphans

In VR + QR + SJ, the non-overlap real-damage signal from this pattern is small enough that it's not worth flagging in bulk without eyes-on per row.

**Too-many-choices (pattern C) — RELIABLE but low-yield outside DM.** 8 rows in QR, 0 elsewhere. Easy to inspect and flag manually.

**Corrupt-glyph (pattern D) — UNUSABLE outside DM.** The regex `\\|/` fires on any stem containing a forward slash. In QR (fractions, dates, ratios) it produced 83 hits, mostly false positives. In VR (apostrophes, slashes in dates) it produced 72 hits, mostly false positives. In SJ it produced 1 hit (false positive). Do not use this regex as written outside DM.

If a future session wants to find PDF-extraction garbage stems bank-wide, this regex needs to be rewritten to actually target garbage (e.g. presence of `\n` inside words, presence of single ASCII chars adjacent to long word fragments, presence of letter+digit+letter sequences that look like OCR errors). The DA codebook glyphs `¥★●■▲◆` are the only DM-applicable parts of the current regex.

**Duplicate-stem heuristic (added this session) — UNRELIABLE outside DM.** The "stem appears 2+ times with same choices" heuristic produced 190 hits in VR. ~168 of those were `bryon-700` / `bryon-750` cross-version legitimate stem reuse (publisher recycled stems across test versions with different passage content — not damage). ~8 were real green-2008-vr duplicates with passage-text duplicated across multiple passage_ids. The signal-to-noise ratio is too low to drive a bulk flag. If pursuing dup-stem damage in future, require `n_distinct_passages = 1` AND `occurrences >= 3` AND verify visually.

## Deferred work / open threads

**1. `lib/practice.ts` hygiene fix — STILL NOT DONE.** Dead code path with old 2-flag filter, no passage dereferencing. Update to match `route.ts`. Better: extract shared `HIDDEN_FLAGS` constant and `resolvePassages(rows)` helper. This is the cleanest remaining task in Claude Code and should land next session if no urgent fires.

**2. Source-doc recovery decision still open.** Three vendor groups flagged `needs_passage` with no anchor and no clear repair path:
- 105 hutton/green DA scenarios (from prior session)
- 70 gen-dm-NNNN + 5 gen-dm-arg-NNNN (from prior session)
- ~60 mastering-ukcat-sj-* (THIS session — stems are "Question 1" placeholders, even fixing passages won't help)
- ~10 tomkins-2014-sj (THIS session — stems concatenated with answer-rating labels)
- Probably more inside the 154 SJ orphans not individually inspected

Decision per cohort: (a) re-ingest from source PDFs, (b) reclassify topic, or (c) delete. Requires eyes-on with source files at `C:\Users\romme\Downloads\UCAT\UCAT\questionbank`.

**3. 8 QR `needs_review` rows: post-flag audit.** 2-4 of the 8 (picard-1000-qr-0010, 0140) may be legitimate 10-option questions worth unflagging after rendering. The others (green-800 mojibake, picard-1000-qr-0103 "Rose-\nbud", picard-1000-qr-0153 "boe75") are real damage.

**4. green-2008-vr cross-passage-id duplicate cohort (~8 rows, NOT FLAGGED).** Same passage text exists 4 times with 4 different passage_ids; same stem on each. Real damage but `needs_passage` is wrong (they have passages); `needs_review` is broad and noisy. Best fix is probably deletion of duplicates after picking one canonical version. Left unflagged for now — users will see the same question ~4x across sessions. Annoying but not broken-shaped.

**5. The 22 VR + 49 QR short-stem-with-passage rows.** Some are legitimate terse questions, some are real truncation. Need eyes-on each. Left unflagged.

**6. AR question bank is thin (130 questions).** Confirmed structurally complete: all 130 rows have `image_refs` and `image_roles` populated; 0 are flagged `requires_image`. Bank is healthy; only issue is size. License or commission, don't AI-generate. (Carried forward from prior handoff; nothing changed.)

**7. Plan-gating enforcement.** `/api/questions` still ignores `plan` and `is_free`. Pre-Stripe launch concern. Unchanged from prior handoff.

**8. UX: `?finished=1&correct=X&total=Y` URL params discarded by picker.** Quick win. Unchanged.

**9. Yes-no DM renderer.** 8 `yes_no_format` rows hidden. Small win to unflag. Unchanged.

**10. `needs_image` (2) vs `requires_image` (32).** Inconsistent vocab. Single UPDATE to unify. Low priority. Unchanged.

## Schema corrections (NEW)

**`requires_image` is a flag value, not a column.** Prior handoff said "requires_image flag is the real signal for image-needing questions" — this is correct; the signal lives inside the `flags` jsonb array, not as a boolean column on `questions`. The full column list in `questions` is: `choices, correct_answer, difficulty, explanation, flags, group_explanation, id, image_refs, image_roles, is_free, passage, passage_id, passage_title, source, stem, subtest, topic`. No `requires_image` boolean column exists.

## Footguns added this session (NEW)

1. **Heuristics don't generalize across subtests.** What works on DM data shapes can produce 90%+ false-positive rates elsewhere. Always sample before bulk-flagging when running a new heuristic against a new subtest.

2. **The Supabase SQL editor sometimes silently runs only the first/highlighted statement.** A multi-statement script can appear to succeed but leave later statements unexecuted. During the QR sweep, an `UPDATE` after another `UPDATE` in the same execution silently didn't fire (verified by re-running). Always verify expected row-count delta after each UPDATE, ideally one statement at a time.

3. **The dup-stem heuristic is dangerous on T/F-format subtests.** When choices are uniform (literally `[True, False, Can't Tell]`), "same stem + same choices = duplicate" matches every legitimately reused T/F template. The heuristic only fires usefully if choices contain question-specific content.

4. **"Short stem" needs context.** A 25-character stem is fine for a QR question paired with a data table ("What is the mean?"). It's broken for a VR T/F item where the stem IS the claim under evaluation. Always check `passage IS NOT NULL` companion shape before treating short stems as damage.

5. **Same `picard-1000-sj-p017` passage_id has 56 rows referencing it.** Any future passage-group queries should expect outliers; the typical assumption of "groups have 2-5 rows" doesn't always hold.

## Standing footguns (carried forward)

- Supabase SQL editor auto-commits per "Run". No cross-execution `BEGIN`/`ROLLBACK`. Always dry-run with SELECT first.
- Supabase aborts the whole batch on first error.
- `flags` is jsonb; use `?`, `?|`, `?&`, `@>`. Not LIKE.
- `choices` is jsonb-array-of-objects, not a Postgres array.
- Orphan-detection predicate MUST use: `(passage IS NULL OR length(trim(coalesce(passage,''))) = 0)` (empty-string handling), `passage_id NOT IN (SELECT passage_id FROM anchored)` (anchor exclusion is load-bearing), AND the `anchored` CTE must require `passage IS NOT NULL AND length(trim(passage)) > 0` (non-empty anchor).
- PowerShell treats `[...]` as a glob. Use `Get-Content -LiteralPath`.
- Trust render-tests over flag counts. (Now repeated 6+ times across sessions. Apply this to the bulk-flagged work this session too — render-test before declaring VR/QR/SJ "clean".)
- The `random()` ordering in `/api/questions` will become slow at scale. Replace with `TABLESAMPLE` later, not urgent.

## Tooling notes

- Browser-Claude session this time. Supabase MCP exists in directory but its SQL execution tools (`execute_sql`, `list_tables`, etc.) wouldn't load via `tool_search` even after reconnecting and toggling. Fell back to paste-SQL-results-back. Works fine, slightly slower than direct MCP. Worth investigating connector enablement settings next time.
- Claude in Code remains the right venue for `lib/practice.ts` hygiene fix.

## Recommended next session

In order:

1. **Verify state.** Re-run the per-subtest and per-flag count queries. Confirm tonight's totals (548 needs_passage, 17 needs_review, 725 total flagged) held.
2. **`lib/practice.ts` hygiene fix in Claude Code.** Extract `HIDDEN_FLAGS` constant + `resolvePassages(rows)` helper into a shared module. Update both `route.ts` and `lib/practice.ts` to use them. Prevents drift if `pickNextQuestion` gets wired up later.
3. **Render-test sample sessions per subtest** to validate the bulk-flagging from tonight. Pull `?limit=100` from `/api/questions` for each subtest, scan for any visible damage that survived the sweep. Expect this to surface a few rows that need additional flagging.
4. **Source-doc recovery decision.** Sit with the source PDFs at `C:\Users\romme\Downloads\UCAT\UCAT\questionbank` and decide per cohort: re-ingest, reclassify, or delete. The ~180 needs_passage rows from the prior session plus ~60 mastering-ukcat-sj from tonight are the targets.
5. **Backup table cleanup.** `_questions_backup_cid_cleanup` (145 rows) still exists. If it's been a couple of sessions and nothing's needed restoring from it, drop it.
6. **Lower-priority items** from the standing list (plan gating, results banner, yes-no renderer, flag vocab unify).

If billing/Stripe work becomes urgent, plan-gating in `/api/questions` becomes blocking — currently free users see the entire bank.
