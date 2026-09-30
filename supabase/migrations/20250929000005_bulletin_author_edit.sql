-- Bulletin: show author + true "modified" state.
-- Regular members cannot read other profiles (RLS), so the author display
-- name is denormalized onto the post at creation time.
ALTER TABLE public.bulletin_posts
  ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '';

-- Backfill from the author's profile (first name preferred, username fallback).
UPDATE public.bulletin_posts p
SET author_name = COALESCE(NULLIF(BTRIM(prof.first_name), ''), prof.username, '')
FROM public.profiles prof
WHERE prof.id = p.author_id
  AND p.author_name = '';

-- Only bump updated_at on content edits (title/body/visible_roles),
-- so pin toggles don't masquerade as modifications.
CREATE OR REPLACE FUNCTION public.handle_bulletin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title
    OR OLD.body IS DISTINCT FROM NEW.body
    OR OLD.visible_roles IS DISTINCT FROM NEW.visible_roles THEN
    NEW.updated_at = now();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
