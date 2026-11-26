-- 0003_mmi.sql
-- MMI (Multiple Mini Interview) practice: attempts, per-station responses,
-- self/peer/teacher marks, and a private storage bucket for recordings.
-- Station content lives in the repo (lib/mmi/data/*.json), not in the DB.
-- Idempotent — safe to re-run.

create table if not exists public.mmi_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  edition text not null check (edition in ('nz', 'au')),
  preset text not null,
  kind text not null check (kind in ('mock', 'single')),
  station_ids text[] not null,
  record_mode text not null default 'video' check (record_mode in ('video', 'audio', 'none')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists mmi_attempts_user_recent_idx
  on public.mmi_attempts (user_id, started_at desc);

create table if not exists public.mmi_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mmi_attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  station_id text not null,
  position int not null,
  media_path text,
  media_kind text check (media_kind in ('video', 'audio')),
  mime text,
  media_bytes int,
  duration_s int,
  allowed_s int not null,
  transcript text,
  word_count int not null default 0,
  notes text,
  answer_mode text not null check (answer_mode in ('speak', 'type')),
  ai_status text not null default 'pending' check (ai_status in ('pending', 'done', 'error', 'skipped')),
  ai_feedback jsonb,
  created_at timestamptz not null default now(),
  unique (attempt_id, position)
);

create index if not exists mmi_responses_user_station_idx
  on public.mmi_responses (user_id, station_id);

create table if not exists public.mmi_marks (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.mmi_responses(id) on delete cascade,
  marker_id uuid not null references public.profiles(id) on delete cascade,
  marker_type text not null check (marker_type in ('self', 'peer', 'teacher')),
  scores jsonb not null default '{}'::jsonb,
  comment text,
  updated_at timestamptz not null default now(),
  unique (response_id, marker_id, marker_type)
);

alter table public.mmi_attempts enable row level security;
alter table public.mmi_responses enable row level security;
alter table public.mmi_marks enable row level security;

-- Owners read/write their own rows. Server routes use the pooled DB
-- connection (bypasses RLS) but always filter by the authenticated user;
-- these policies protect direct client access.
drop policy if exists "mmi attempts owner" on public.mmi_attempts;
create policy "mmi attempts owner" on public.mmi_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mmi responses owner" on public.mmi_responses;
create policy "mmi responses owner" on public.mmi_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mmi marks owner" on public.mmi_marks;
create policy "mmi marks owner" on public.mmi_marks
  for all using (auth.uid() = marker_id) with check (auth.uid() = marker_id);

-- Private bucket for answer recordings. Path: {user_id}/{attempt_id}/{position}.webm
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mmi-recordings', 'mmi-recordings', false, 52428800,
        array['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'audio/ogg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mmi recordings owner insert" on storage.objects;
create policy "mmi recordings owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mmi-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mmi recordings owner select" on storage.objects;
create policy "mmi recordings owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'mmi-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

-- Upload uses upsert (retries overwrite the same path), which needs update too.
drop policy if exists "mmi recordings owner update" on storage.objects;
create policy "mmi recordings owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'mmi-recordings' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'mmi-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mmi recordings owner delete" on storage.objects;
create policy "mmi recordings owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'mmi-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

-- Retention (30 days) is handled by a follow-up scheduled job; see
-- docs/mmi/README.md. Not created here so this migration has no pg_cron dependency.
