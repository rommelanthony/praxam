# Speed Reading Tutor — Implementation Spec (v2)

> Drop this into `docs/speed-reading-spec.md` in the repo. Hand it to Claude Code along with `docs/SpeedReadingTutor.jsx` and `docs/handoff-2026-05-12-late-evening.md` and say: **"Read these three files, then draft a plan for PR 1 before writing any code."**

This is a revision of v1 with section 11's open questions resolved and v1's bad routing default corrected. v1 said `/speed-reading`; that bypassed the auth-layout chrome at `/app/*`. The right home is `/app/training/speed-reading` (see §11 for why).

---

## 1. What we're building

A standalone UCAT Verbal Reasoning training module under `/app/training/speed-reading`. It's a sibling to the existing practice picker, not a replacement.

The module has these sub-screens:

| Screen | Purpose |
|---|---|
| **Baseline** | Forced first-run diagnostic. Measures WPM + comprehension on a real VR passage. |
| **Overview** | User dashboard. Shows baseline, latest session, training targets, drill catalog. |
| **Strategy** | Reference page teaching the two-mode (full-read vs. scan) framework + language traps. |
| **Pacer** | RSVP word-flasher locked to target WPM. Trains pacing and kills regression. |
| **Chunking** | Word-group highlighter. Trains wider visual span. |
| **Scan** | Keyword-locate drill. Trains the UCAT scan-and-locate technique. |
| **Qualifier Hunt** | Timed highlight drill for extreme/soft/negation qualifiers. |
| **Triage Trainer** | 5-second skip-or-attempt decisions on T/F/CT-style items. |
| **Passage Drill** | Full timed passage + comprehension quiz. The "verify it sticks" screen. |
| **Progress** | History chart + best/avg WPM, comprehension, gain vs baseline. |

The working prototype is at `docs/SpeedReadingTutor.jsx` — single file, inline styles, no persistence. **Use it as the source of truth for behaviour, not for code style.** Convert to the project's actual patterns (Tailwind tokens `navy/teal/violet/ink/surface/line`, Drizzle, etc.) as you port.

---

## 2. Read these first

Before writing any code:

1. **`docs/handoff-2026-05-12-late-evening.md`** — current state of the question bank, the renderer-fix commit `9083684`, and the load-bearing footguns (especially the 8-flag filter inline at `app/api/questions/route.ts` lines 20–29, and the `passage_id` dereferencing logic at lines 35–67).
2. **`docs/SpeedReadingTutor.jsx`** — the prototype. Behaviour and exact constants (TIER, LANGUAGE_TRAPS, STRATEGIES, TRIAGE_QUESTIONS) are correct; structure is throwaway.
3. **`app/api/questions/route.ts`** — DO NOT modify. Lift its filter constant and passage-dereferencing logic into shared modules instead.

---

## 3. File structure

```
app/app/training/speed-reading/
  page.tsx                      # Server component, auth-gated, renders SpeedReadingApp
  SpeedReadingApp.tsx           # Client component, top-level state + tab router
  components/
    Header.tsx
    BaselineMode.tsx
    Home.tsx                    # Overview
    StrategyMode.tsx
    PacerMode.tsx
    ChunkingMode.tsx
    ScanMode.tsx
    QualifierMode.tsx
    TriageMode.tsx
    PassageMode.tsx
    ProgressMode.tsx
    SpeedScale.tsx
    shared/
      Section.tsx
      Slider.tsx
      Callout.tsx
      BigStat.tsx
      DrillCard.tsx
      PassageSelector.tsx

lib/questions/
  filters.ts                    # NEW — extracted HIDDEN_FLAGS constant (used by both route.ts and speed-reading)
  passages.ts                   # NEW — extracted passage-dereferencing helper (used by both)

lib/speed-reading/
  constants.ts                  # UCAT, TIER(), LANGUAGE_TRAPS, STRATEGIES, TRIAGE_QUESTIONS
  passages.ts                   # getVRPassages() — composes lib/questions/passages.ts + filters.ts
  sessions.ts                   # logSession, getBaseline, getHistory
  types.ts

components/
  Toast.tsx                     # NEW — generic toast primitive (separate from XpToast)

db/migrations/
  0002_speed_reading_sessions.sql
```

The triage question bank (`TRIAGE_QUESTIONS`) is 10 hardcoded items in `lib/speed-reading/constants.ts` for v1. Move to DB later when content team owns it.

---

## 4. Data layer

### 4.1 Shared question helpers — extract first

**Before** building anything speed-reading-specific, extract two pieces of logic currently inlined in `app/api/questions/route.ts`. Both of these have been carried as "lib/practice.ts hygiene fix" in the handoff doc for three sessions. Doing them now closes that item AND gives the new module the right foundation.

**`lib/questions/filters.ts`:**

```ts
// Hidden flag types — questions carrying any of these are not served.
// Mirrors the inline `?|` array filter at app/api/questions/route.ts:20–29.
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
```

Then update `app/api/questions/route.ts` to import this constant instead of inlining the array. Verify behaviour is byte-identical with `curl /api/questions?limit=200` before and after — same row IDs in same order.

**`lib/questions/passages.ts`:**

```ts
// Resolves orphan-sibling rows by fetching anchor passages.
// Mirrors the two-query merge at app/api/questions/route.ts:35–67 (commit 9083684).
export async function hydratePassages<T extends {
  id: string;
  passageId: string | null;
  passage: string | null;
}>(rows: T[]): Promise<T[]>;
```

Update `app/api/questions/route.ts` to call this helper. Same verification — output unchanged.

This is the actual close-out of handoff item #1. Document in the PR description that this happened.

### 4.2 Passages — reuse existing VR bank, do NOT create new tables

`lib/speed-reading/passages.ts` exports:

```ts
export type Passage = {
  id: string;                   // passage_id from DB
  title: string;                // passage_title
  text: string;                 // passage (resolved via anchor row if needed)
  wordCount: number;            // computed from text
  difficulty: 'easy' | 'medium' | 'hard';  // derived from `difficulty` column
  questions: PassageQuestion[];
};

export type PassageQuestion = {
  id: string;
  stem: string;
  options: { text: string; label: string }[];  // matches existing `choices` jsonb shape
  answer: number;               // index into options
};

export async function getVRPassages(opts?: {
  limit?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<Passage[]>;

export async function getRandomVRPassage(): Promise<Passage>;
```

**Implementation rules:**

- Import `HIDDEN_FLAGS` from `lib/questions/filters.ts`; apply the same `?|` filter.
- Call `hydratePassages()` from `lib/questions/passages.ts` to resolve orphan siblings.
- DB filter: `subtest = 'verbal_reasoning' AND passage IS NOT NULL`. Then in app code, compute word count and filter to `wordCount BETWEEN 150 AND 350` (UCAT-realistic length).
- Group rows by `passage_id` to assemble `{passage, questions[]}` objects. Exclude any anchor row from the questions list if its `stem` is empty/null.
- Word count: `text.trim().split(/\s+/).length`. Cache in memory per request.

### 4.3 User state — new table

`db/migrations/0002_speed_reading_sessions.sql`:

```sql
CREATE TABLE speed_reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  drill text NOT NULL,
    -- 'baseline' | 'pacer' | 'chunking' | 'scan' | 'qualifier' | 'triage' | 'passage'
  wpm int,                      -- nullable; not all drills produce WPM
  comprehension_pct int,        -- nullable; 0-100
  passage_id text,              -- nullable; the passage used (soft-link to questions.passage_id, no FK because passages aren't a table)
  meta jsonb DEFAULT '{}'::jsonb,
    -- drill-specific stats:
    --   pacer: { targetWpm, chunkSize }
    --   qualifier: { hits, misses, falsePositives, timeLimit }
    --   triage: { goodSkips, badSkips, goodAttempts, badAttempts, attemptAccuracy }
    --   scan: { keywordCount, avgFindSec }
  elapsed_sec numeric(6,2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX speed_reading_sessions_user_recent_idx
  ON speed_reading_sessions (user_id, created_at DESC);

ALTER TABLE speed_reading_sessions ENABLE ROW LEVEL SECURITY;

-- Mirror the answers-table policy pattern
CREATE POLICY speed_reading_sessions_select_own ON speed_reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY speed_reading_sessions_insert_own ON speed_reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Append-only: no UPDATE or DELETE policies
```

Add the Drizzle table definition to `db/schema.ts` matching the project's existing naming pattern. Column names snake_case in DB, camelCase in TS per the handoff doc.

`lib/speed-reading/sessions.ts` exports:

```ts
export type SessionDrill =
  | 'baseline' | 'pacer' | 'chunking' | 'scan'
  | 'qualifier' | 'triage' | 'passage';

export async function logSession(input: {
  userId: string;
  drill: SessionDrill;
  wpm?: number;
  comprehensionPct?: number;
  passageId?: string;
  meta?: Record<string, unknown>;
  elapsedSec?: number;
}): Promise<void>;

export async function getBaseline(userId: string): Promise<Session | null>;
  // The earliest row with drill='baseline'. Null = not yet taken.

export async function getHistory(userId: string, opts?: {
  limit?: number;
  drill?: SessionDrill;
}): Promise<Session[]>;
```

After each successful `logSession()`, fire the new `Toast` primitive (see §5.4) with message `"Session saved"`. NOT `fireXpToast` — see §11.

---

## 5. Resolved decisions

### 5.1 Route: `/app/training/speed-reading`

Not `/speed-reading` (v1's default — wrong, bypasses auth layout). Not `/app/speed-reading` (works structurally but paints us into a corner for future tutors). Use `/app/training/speed-reading`.

Add a `Training` link to the main nav in `app/app/layout.tsx`. The `/app/training` route itself should redirect to `/app/training/speed-reading` for now — when DM/QR/AR/SJ tutors arrive, that page becomes a hub.

### 5.2 Paywall: free baseline + Pacer, Pro for everything else

Hook into `profiles.plan`. The gate logic:

```ts
// In SpeedReadingApp.tsx
const FREE_DRILLS: SessionDrill[] = ['baseline', 'pacer'];
const isLocked = (drill: SessionDrill, plan: 'free' | 'pro') =>
  plan !== 'pro' && !FREE_DRILLS.includes(drill);
```

For locked drills, show the drill card with a lock icon and a "Pro" badge instead of the normal CTA. Clicking opens a paywall modal (reuse whatever existing upgrade-CTA pattern is in the repo, or stub one as `<PaywallModal />` and let the user wire it up later — flag in PR if no existing one is found).

Free users still see the Strategy reference page in full (it's content, not a drill). And progress for whatever they have completed.

### 5.3 Tailwind token mapping

Prototype palette → repo tokens:

| Prototype hex | Token to use |
|---|---|
| `#7C5CFF` (accent) | `violet` |
| `#22D3A8` (accent2) | `teal` |
| `#F4A261` (warn) | (see note) |
| `#F4D35E` (warnSoft) | (see note) |
| `#E76F51` (danger) | (see note) |
| `#E8ECF3` (ink) | `ink` |
| `#9AA3B2` (inkDim) | `ink-dim` |
| `#0E1116` (bg) | `navy` |
| `#161A22` (panel) | `surface` |
| `#1D222D` (panel2) | `surface` (one level lighter — use Tailwind's color/opacity utility) |
| `#262C39` (border) | `line` |

**Note on warn/warnSoft/danger**: the repo token set is `navy / teal / violet / ink / surface / line`. There's no amber/red token. Two options:

- **(a)** Add `amber` and `red` tokens to `tailwind.config.ts`. Recommended — these are needed for Qualifier Hunt's three-category legend (extreme=red, soft=teal, negation=amber) and the comprehension-floor warning callouts.
- **(b)** Collapse all three to one alert color and use weight variations. Loses signal.

Go with (a). Flag in PR 1 description what tokens were added.

### 5.4 Toast: new generic `components/Toast.tsx`

Do NOT reuse `fireXpToast`. Reusing it for non-XP events ("session saved") is a maintenance trap — debugging "why is the XP system firing during a speed reading drill?" is the kind of thing that wastes an hour two months from now.

Create `components/Toast.tsx` modelled on `XpToast` but generic. Export `fireToast({ message, tone })` where `tone` is `'success' | 'info' | 'warn'`. Use it for:
- "Baseline saved" (after baseline completion)
- "Session saved" (after every drill completion)
- "Comprehension dropped below 80% — slow down slightly" (when Passage Drill comp falls below floor)

Reserve `XpToast` for actual XP events. Leave it untouched.

---

## 6. Constants to port verbatim from prototype

Move into `lib/speed-reading/constants.ts`:

- `UCAT` — the timing/passage-count constants (22 min, 11 passages, 44 questions, etc.)
- `TIER(wpm)` — returns `{ name, color, note }`. The 5 tiers: Below baseline (<250), Baseline (<300), Minimum viable (<400), Training target (<500), Stretch (≥500).
- `LANGUAGE_TRAPS` — the three categories (extreme, soft, negation) with their word lists. Used by Qualifier Hunt and the Strategy page reference panel.
- `STRATEGIES` — the two-mode definitions (fullRead, scan) with `questionTypes`, `pace`, `rationale`. Used by the Strategy router.
- `TRIAGE_QUESTIONS` — 10 hardcoded items with `id`, `stem`, `context`, `answer`, `difficulty`, `expectedSec`, optional `trap`. Used by Triage Trainer.

All values are in the prototype — port the numbers and word lists exactly.

---

## 7. Behaviour rules (not always obvious from the prototype)

1. **Baseline is forced on first visit.** All non-baseline tabs are locked until `getBaseline(userId)` returns a row. After baseline completes, route to Overview.
2. **Pacer "recommended" WPM** = `min(500, max(300, baseline.wpm + 50))`. Chunking same logic but `min 350` floor.
3. **Comprehension floor is 80%.** If a Passage Drill result has `comprehensionPct < 80`, the result callout tells the user to slow down. Also fires a toast (§5.4).
4. **Passage selection should not repeat within a session.** Track shown IDs client-side; reset only on hard reload.
5. **Render-test every passage before serving.** Per the handoff doc lesson learned 6+ times: don't trust the bank. In dev, add a debug route `/app/training/speed-reading/_debug` that pulls 100 passages and flags any with missing fields, broken char encoding, or wordCount outliers. Gate it behind `NODE_ENV !== 'production'`.
6. **Free users hit the paywall on locked drills**, see §5.2. Baseline and Pacer are unlocked.
7. **Triage Trainer expectedSec scoring**: a "good skip" is `decision === 'skip' && expectedSec > 20`. A "good attempt" is `decision === 'attempt' && expectedSec <= 20`. Triage quality % = (good skips + good attempts) / total decisions.

---

## 8. Acceptance criteria

- `/app/training/speed-reading` renders behind the existing auth wall, inheriting nav chrome from `app/app/layout.tsx`.
- First visit (no baseline row) forces Baseline; subsequent visits go to Overview.
- All 7 drills work end-to-end: start, complete, log session via `logSession()`.
- Free users can complete Baseline and Pacer; other drills show paywall modal.
- `speed_reading_sessions` rows written and survive reload. Verify with a SELECT in Supabase after a test run.
- Mobile renders correctly down to 375px width (iPhone SE viewport).
- No regressions to `/app/practice/*` or `/api/questions`. Verify with the existing test suite plus `curl /api/questions?limit=200` byte-for-byte before/after the HIDDEN_FLAGS extraction.
- Lighthouse mobile performance ≥ 85 on the new pages.
- New module does NOT call `/api/questions` — it has its own data layer via `lib/speed-reading/passages.ts`. This dodges the known `random()` perf concern.
- Existing `XpToast` behaviour is unchanged. New `Toast` primitive co-exists.

---

## 9. PR breakdown

**PR 1 — Foundation + shared extraction (1–2 days):**

- Extract `HIDDEN_FLAGS` from `app/api/questions/route.ts` to `lib/questions/filters.ts`. Update the route to import it.
- Extract passage-dereferencing logic to `lib/questions/passages.ts` (`hydratePassages` helper). Update the route to use it.
- Verify `/api/questions` output is byte-identical before/after with `curl ?limit=200` diff.
- Add `/app/training/speed-reading` route + page shell.
- Add `Training` nav link.
- Add `tailwind.config.ts` amber and red tokens.
- Create `lib/speed-reading/{constants,types,passages,sessions}.ts`.
- Run migration `0002_speed_reading_sessions.sql`.
- Update `db/schema.ts` with the new table.
- Create `components/Toast.tsx`.
- Shared components: Section, Slider, Callout, BigStat, DrillCard, PassageSelector.
- Wire up paywall gate logic based on `profiles.plan`.
- BaselineMode + Home (Overview).

**PR 2 — Mechanics drills:**
- PacerMode (unlocked for free users)
- ChunkingMode
- ScanMode

**PR 3 — Strategy drills:**
- StrategyMode (the reference page with language traps)
- QualifierMode
- TriageMode

**PR 4 — Verification + analytics:**
- PassageMode
- ProgressMode
- SpeedScale shared component (used in Baseline result and Passage result)
- Comprehension-floor toast trigger
- Add `TODO(analytics)` comments at natural firing points
- Lighthouse pass on all routes
- Mobile pass at 375px

---

## 10. Out of scope (explicitly do NOT build in this round)

- Mock-test integration ("warm up before VR" button on mock screen)
- Weekly training plan generator
- Question-type tagging of the passage bank (`type: 'tfct' | 'inference' | ...`)
- Analytics events (add `TODO(analytics)` comments at natural firing points)
- The triage question bank moving to DB (10 hardcoded items is fine for v1)
- Source-doc recovery for the 548 `needs_passage` rows (separate workstream)
- The `/app/training` hub page (just a redirect for now; when DM/QR/etc. tutors arrive, this becomes the hub)
- The future tutors themselves (DM, QR, SJ, AR)

---

## 11. Why these decisions

This section documents the reasoning so future-you (or the next PR reviewer) doesn't have to relitigate.

**Route `/app/training/speed-reading`** (vs. `/app/speed-reading` or `/app/practice/speed-reading`):

- `/app/*` is the auth-gated nav prefix; bare `/speed-reading` skips that, so it's out.
- `/app/practice/speed-reading` conflates two distinct activities. Practice = "do real exam-style questions and get scored." Training = "build the underlying skills via drills, reference content, and diagnostics."
- The handoff doc and product copy already use the word "training" everywhere ("training targets," "training plan," "Speed Reading Tutor").
- `/app/speed-reading` works structurally but paints us into a corner. The plausible roadmap includes a DM skills tutor, QR mental-math drills, AR pattern library, SJ framework guide — all of which want a consistent home. `/app/training/<subtest>` is obvious; ad-hoc top-level routes are not.
- Cost to namespace this correctly now: zero. Cost to migrate later: a day of redirects plus broken bookmarks.

**Paywall: free baseline + Pacer, Pro for the rest:**

- Baseline is a conversion hook. It costs nothing to give away and shows the user concretely how slow they are, in real numbers. That's persuasive.
- Pacer alone is useful but limited — it trains tempo, not the strategy/scanning/qualifier work that's the real value.
- Locking the strategy content, Qualifier Hunt, Triage, and Passage Drill behind Pro is reasonable: those are the differentiated value props.
- Free users completing Baseline + a few Pacer sessions are the warmest possible upgrade leads.

**Toast: new generic `Toast`, not `fireXpToast`:**

- Reusing `fireXpToast` for non-XP events means anyone debugging the XP system has to disambiguate which fires came from XP gain vs. session-saved confirmations.
- 20 lines of code to avoid that.
- `XpToast` keeps its single responsibility. Generic toast handles everything else.

**PR breakdown: spec's 4 PRs:**

- One-per-drill is too granular; foundation needs to land first regardless.
- One big PR for ~2000 lines of new code is unreviewable.
- 4 PRs grouped by skill-cluster maps to the Overview's four cluster headings, which is also how QA can naturally test it.

---

## 12. Footguns inherited from PracXam

From the handoff doc, all still apply to this module:

- DB columns are snake_case. Drizzle camelCases in TS.
- `flags` is jsonb; use `?`, `?|`, `?&`, `@>`. Not LIKE.
- `choices` is jsonb-array-of-objects, not a Postgres array. Use `jsonb_array_length()`.
- Orphan-detection predicate (if needed for passage assembly): use empty-string check `(passage IS NULL OR length(trim(coalesce(passage,''))) = 0)`.
- The `anchored` CTE must require `passage IS NOT NULL AND length(trim(passage)) > 0`.
- Trust render-tests over flag counts. Always sample before assuming a query returns clean data.
- Supabase SQL editor auto-commits per Run. No cross-execution rollback.
- Multi-statement scripts in Supabase SQL editor sometimes silently run only the first statement. Verify with row-count delta after each UPDATE.

---

## 13. Verification checklist before merging PR 1

- [ ] `curl https://localhost:3000/api/questions?limit=200` returns byte-identical output before/after HIDDEN_FLAGS extraction.
- [ ] `curl https://localhost:3000/api/questions?subtest=verbal_reasoning&limit=200` shows passages correctly hydrated (sibling rows have `passage` populated from anchor) — confirms `hydratePassages` works.
- [ ] Logged-in free user can reach `/app/training/speed-reading` and complete Baseline.
- [ ] Logged-in free user sees Pacer unlocked but other drills show paywall.
- [ ] Logged-in Pro user (`test-pro` per handoff doc) sees everything unlocked.
- [ ] `speed_reading_sessions` table exists in Supabase with RLS enabled and the two SELECT/INSERT policies.
- [ ] A test session insert as a different user fails (RLS working).
- [ ] `XpToast` still fires correctly on the existing achievements flow (no regression).
- [ ] New `Toast` fires on baseline completion.
- [ ] No console errors on mobile viewport at 375px.
