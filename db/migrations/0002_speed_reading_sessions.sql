-- 0002_speed_reading_sessions.sql
-- Append-only log of completed Speed Reading Tutor drills.
-- One row per drill completion. Idempotent — safe to re-run.

create table if not exists public.speed_reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  drill text not null check (drill in (
    'baseline', 'pacer', 'chunking', 'scan', 'qualifier', 'triage', 'passage'
  )),
  wpm int,
  comprehension_pct int check (comprehension_pct between 0 and 100),
  passage_id text,
  meta jsonb not null default '{}'::jsonb,
  elapsed_sec numeric(6, 2),
  created_at timestamptz not null default now()
);

create index if not exists speed_reading_sessions_user_recent_idx
  on public.speed_reading_sessions (user_id, created_at desc);

alter table public.speed_reading_sessions enable row level security;

-- Append-only: no UPDATE or DELETE policies. select/insert only.
drop policy if exists "users read own speed reading sessions" on public.speed_reading_sessions;
drop policy if exists "users insert own speed reading sessions" on public.speed_reading_sessions;

create policy "users read own speed reading sessions"
  on public.speed_reading_sessions
  for select using (auth.uid() = user_id);

create policy "users insert own speed reading sessions"
  on public.speed_reading_sessions
  for insert with check (auth.uid() = user_id);
