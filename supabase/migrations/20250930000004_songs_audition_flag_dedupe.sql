-- Fix: audition picks created plain songs rows, polluting the library
-- (Songs page + setlist picker via songsApi.list). Add an audition flag,
-- backfill existing audition-linked rows, hide them from the library list,
-- and prevent library duplicates with a partial unique index.
-- Candidates may only insert audition-flagged rows; library inserts stay
-- admin/manager-only.

-- 1. Flag column (default FALSE so library/proposal flows are unaffected).
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_audition BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_songs_is_audition ON public.songs(is_audition);

-- 2. Backfill: rows referenced by audition picks are audition songs.
UPDATE public.songs
SET is_audition = TRUE
WHERE id IN (
  SELECT song_id FROM public.audition_application_instruments
  WHERE song_id IS NOT NULL
);

-- 3. Duplicate prevention for the library: one active row per title+artist
-- (case-insensitive). Partial so archived rows can be re-added, and scoped
-- to library rows so per-candidate audition picks never block the index.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_songs_title_artist_active
  ON public.songs (lower(title), lower(artist))
  WHERE archived_at IS NULL AND is_audition = FALSE;

-- 4. Candidates insert audition songs only, never library rows.
DROP POLICY IF EXISTS "Candidates can insert songs for auditions" ON public.songs;

CREATE POLICY "Candidates can insert audition songs"
  ON public.songs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'candidate') AND is_audition = TRUE);
