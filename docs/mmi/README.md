# MMI practice module

Cost notes: video is recorded at 15 fps / 300 kbps (~7–8 MB per 3-minute answer); AI feedback uses Haiku 5.5 by default; server transcription runs only when needed.

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
   - `MMI_FEEDBACK_MODEL`: optional, defaults to `claude-haiku-5-5` (cheapest); set `claude-sonnet-5-5` for richer feedback
   - `OPENAI_API_KEY`: server-side transcription of recordings, so AI feedback works in every browser (Safari, Firefox). Without it, only Chrome/Edge live transcripts or typed answers get AI feedback.
   - `MMI_TRANSCRIBE_MODEL`: optional, defaults to `gpt-transcribe`
   - `MMI_TRANSCRIBE`: `auto` (default: only when the browser transcript is missing or incomplete), `always`, or `off`
   - `CRON_SECRET`: required for the daily recording clean-up (Vercel sends it to the cron route)
   - `MMI_RETENTION_DAYS`: optional, defaults to 30
   - `SUPABASE_SERVICE_ROLE_KEY`: already set; used by the clean-up to delete files
   - `MMI_INCLUDE_STAGING`: optional, `1` to show staging stations in production

## Known limits / follow-ups
- Transcripts: with `OPENAI_API_KEY` set, spoken answers are transcribed on the server from the recording (all browsers; te reo Māori / Australian health terms passed as keywords). The live browser transcript (Chrome/Edge) is the fallback. Recordings over 25 MB are not transcribed (a 3-minute video is ~15 MB).
- Feedback route runs transcription then feedback within 60 s; if it times out, the transcript is already saved and the results page retries the feedback.
- Recording deletion: `vercel.json` runs `/api/cron/mmi-retention` daily (~4am NZ). It removes files older than 30 days and clears `media_path`; transcripts, feedback and marks stay. Crons only run on production deployments.
- Teacher review (classes, review queue, `marker_type = 'teacher'`) is in the schema but has no UI yet.
- No paywall gating yet.
- AI feedback is practice guidance only; UoA states its reviewers are people.
