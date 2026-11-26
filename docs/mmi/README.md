# MMI practice module

Realistic asynchronous MMI practice (Auckland/Kira-style): read-aloud scenario → 30 s prep → recorded answer → 10 s break, no re-records in a full mock. Recordings are private to the user; AI feedback is generated server-side per station; users can self-mark against the 1/3/5 rubric.

## Routes
- `/app/interview`: editions (NZ / AU), presets, station browser, recent attempts
- `/app/interview/session?edition=nz&preset=auckland`: full mock (`?station=<id>` for a single station)
- `/app/interview/results/[attemptId]`: playback, AI feedback, self-marking
- API: `/api/mmi/attempts`, `/api/mmi/attempts/[id]`, `/api/mmi/responses`, `/api/mmi/feedback`, `/api/mmi/marks`

## Content
- `lib/mmi/data/nz.json` (134 stations), `lib/mmi/data/au.json` (64 stations)
- All stations are `status: "staging"`: shown in dev and preview, hidden in production until reviewed (flip to `"live"`), or force with `MMI_INCLUDE_STAGING=1`.
- Full mocks pick one core station per domain; domain anchors guarantee all 8 attributes are covered.

## Setup
1. Run `db/migrations/0003_mmi.sql` in the Supabase SQL editor. It creates `mmi_attempts`, `mmi_responses` and `mmi_marks` with owner RLS, plus the private `mmi-recordings` bucket (50 MB, webm/mp4/ogg) and owner-only storage policies.
2. Env vars (Vercel):
   - `ANTHROPIC_API_KEY`: required for AI feedback (without it responses show "feedback could not be generated" and self-marking still works)
   - `MMI_FEEDBACK_MODEL`: optional, defaults to `claude-sonnet-5-5`
   - `MMI_INCLUDE_STAGING`: optional, `1` to show staging stations in production

## Known limits / follow-ups
- Transcripts come from the browser's live speech recognition (Chrome/Edge). Other browsers still record; AI feedback needs a transcript or a typed answer. Server-side transcription is a follow-up.
- 30-day recording deletion: needs a scheduled job (the UI already says 30 days).
- Teacher review (classes, review queue, `marker_type = 'teacher'`) is in the schema but has no UI yet.
- No paywall gating yet.
- AI feedback is practice guidance only; UoA states its reviewers are people.
