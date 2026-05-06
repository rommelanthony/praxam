-- PracXAM initial schema. Run this in the Supabase SQL editor.
-- Idempotent — safe to re-run.

create extension if not exists pgcrypto;

-- Profile: extends Supabase auth.users with our app data
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  plan text not null default 'free' check (plan in ('free','pro')),
  questions_answered_total int not null default 0,
  streak_days int not null default 0,
  last_practice_date date,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Questions: master bank
create table if not exists public.questions (
  id text primary key,
  subtest text not null check (subtest in (
    'verbal_reasoning','decision_making','quantitative_reasoning','abstract_reasoning','situational_judgement'
  )),
  topic text,
  difficulty text,
  passage text,
  passage_title text,
  passage_id text,
  stem text not null,
  choices jsonb not null,
  correct_answer text,
  explanation text,
  group_explanation text,
  image_refs jsonb default '[]'::jsonb,
  image_roles jsonb default '{}'::jsonb,
  source jsonb,
  flags jsonb default '[]'::jsonb,
  is_free boolean not null default false
);
create index if not exists questions_subtest_idx on public.questions(subtest);
create index if not exists questions_passage_idx on public.questions(passage_id);
create index if not exists questions_free_idx on public.questions(is_free) where is_free = true;

-- Practice sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subtest text not null,
  question_ids text[] not null,
  current_index int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists sessions_user_idx on public.sessions(user_id);

-- Individual answer attempts
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  question_id text not null references public.questions(id),
  user_id uuid not null references auth.users on delete cascade,
  picked_letter text,
  is_correct boolean,
  time_taken_ms int,
  created_at timestamptz not null default now()
);
create index if not exists answers_user_idx on public.answers(user_id);
create index if not exists answers_session_idx on public.answers(session_id);

-- Row-level security
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.answers enable row level security;
alter table public.questions enable row level security;

-- Drop any old policies before re-creating (idempotent)
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users read own sessions" on public.sessions;
drop policy if exists "users insert own sessions" on public.sessions;
drop policy if exists "users update own sessions" on public.sessions;
drop policy if exists "users read own answers" on public.answers;
drop policy if exists "users insert own answers" on public.answers;
drop policy if exists "anyone reads questions" on public.questions;

-- Profile policies
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

-- Session policies
create policy "users read own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "users insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "users update own sessions" on public.sessions for update using (auth.uid() = user_id);

-- Answer policies
create policy "users read own answers" on public.answers for select using (auth.uid() = user_id);
create policy "users insert own answers" on public.answers for insert with check (auth.uid() = user_id);

-- Questions are world-readable (auth required at app layer for free vs pro gating)
create policy "anyone reads questions" on public.questions for select using (true);
