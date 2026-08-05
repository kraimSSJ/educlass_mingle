-- EduClass Mingle — Supabase schema
-- Maps 1:1 to the systems in the specification. No extra features included.

create extension if not exists "uuid-ossp";

-- =========================================================
-- USERS (extends Supabase auth.users)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. SOLO STUDY SYSTEM
-- =========================================================
create table if not exists public.modules (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.module_pdfs (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.module_sources (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  source_url text,
  source_text text,
  added_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  question text not null,
  choices jsonb not null,
  correct_choice text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.qa_practice (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  question text not null,
  expected_answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.module_summaries (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  content text not null,
  generated_at timestamptz not null default now()
);

-- =========================================================
-- 4. POMODORO SYSTEM
-- =========================================================
create table if not exists public.pomodoro_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('study', 'break')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- =========================================================
-- 5. NOTES SYSTEM
-- =========================================================
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 6. GROUP STUDY SYSTEM
-- =========================================================
create table if not exists public.rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_shared_notes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  shared_by uuid not null references public.profiles(id),
  shared_at timestamptz not null default now()
);

create table if not exists public.room_shared_summaries (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  summary_id uuid not null references public.module_summaries(id) on delete cascade,
  shared_by uuid not null references public.profiles(id),
  shared_at timestamptz not null default now()
);

create table if not exists public.room_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  text text not null,
  type text not null default 'text' check (type in ('text', 'note', 'summary')),
  note_title text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 7. SOCIAL MEDIA SYSTEM
-- =========================================================
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('picture', 'video'))
);

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- =========================================================
-- 8. COIN SYSTEM
-- =========================================================
create table if not exists public.coin_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('studying', 'staying_in_app', 'profile_customization')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9. PROFILE CUSTOMIZATION SYSTEM
-- =========================================================
create table if not exists public.accessories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image_url text not null,
  price integer not null
);

create table if not exists public.owned_accessories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  accessory_id uuid not null references public.accessories(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, accessory_id)
);

create table if not exists public.room_layout (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  placed_accessories jsonb not null default '[]'
);
