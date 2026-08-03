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
