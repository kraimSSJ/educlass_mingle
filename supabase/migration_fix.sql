-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jbjmlgjuwuvnueuepwtd/sql/new

-- Add title and module_id to notes (missing from original schema)
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Untitled Note',
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

-- Add image_url and content to posts (instead of relying on post_media join)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS username text;

-- Add username + image_url to stories for easy display
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add username to comments
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS username text;

-- Persist room chat history so messages survive leaving/rejoining rooms
CREATE TABLE IF NOT EXISTS public.room_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  text text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'note', 'summary')),
  note_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'pdf'));
