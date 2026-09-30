-- ============================================================================
-- Slice 3: Songs & Setlists
-- Purpose: Creates songs, setlists, setlist_songs, assignments, assignment_history,
-- instrument_roles reference table (shared with members slice).
-- Implements soft-delete via archived_at on songs and setlists.
-- All tables use RLS. Roles are enforced via has_role().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Songs table
--    Soft-delete via archived_at. Admin-only manual creation.
-- ---------------------------------------------------------------------------
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  album_art_url TEXT,
  duration_seconds INT,
  spotify_id TEXT,
  lastfm_id TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_songs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_songs_updated_at();

-- Indexes for songs
CREATE INDEX idx_songs_archived ON public.songs(archived_at);
CREATE INDEX idx_songs_title ON public.songs(title);
CREATE INDEX idx_songs_artist ON public.songs(artist);
CREATE INDEX idx_songs_spotify_id ON public.songs(spotify_id);
CREATE INDEX idx_songs_lastfm_id ON public.songs(lastfm_id);

-- ---------------------------------------------------------------------------
-- 2. Setlists table
--    Soft-delete via archived_at.
-- ---------------------------------------------------------------------------
CREATE TABLE public.setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_setlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_setlists_updated_at();

-- Indexes for setlists
CREATE INDEX idx_setlists_archived ON public.setlists(archived_at);
CREATE INDEX idx_setlists_name ON public.setlists(name);
CREATE INDEX idx_setlists_event_date ON public.setlists(event_date);

-- ---------------------------------------------------------------------------
-- 3. setlist_songs join table
--    Joins setlists to songs with instrument_role_id and position for ordering.
-- ---------------------------------------------------------------------------
CREATE TABLE public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  instrument_role_id INT NOT NULL REFERENCES public.instrument_roles(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(setlist_id, song_id, instrument_role_id)
);

CREATE INDEX idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX idx_setlist_songs_song_id ON public.setlist_songs(song_id);
CREATE INDEX idx_setlist_songs_position ON public.setlist_songs(setlist_id, position);
CREATE INDEX idx_setlist_songs_instrument_role_id ON public.setlist_songs(instrument_role_id);

-- ---------------------------------------------------------------------------
-- 4. assignments table — current-state table
--    Keyed by (context_type, context_id, instrument_role_id, member_id).
--    context_type is either 'song' or 'setlist_song'.
-- ---------------------------------------------------------------------------
CREATE TYPE assignment_context AS ENUM ('song', 'setlist_song');

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type assignment_context NOT NULL,
  context_id UUID NOT NULL,
  instrument_role_id INT NOT NULL REFERENCES public.instrument_roles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(context_type, context_id, instrument_role_id, member_id)
);

CREATE INDEX idx_assignments_context ON public.assignments(context_type, context_id);
CREATE INDEX idx_assignments_instrument_role ON public.assignments(instrument_role_id);
CREATE INDEX idx_assignments_member_id ON public.assignments(member_id);

-- ---------------------------------------------------------------------------
-- 5. assignment_history table — append-only log
--    Records every change to an assignment.
-- ---------------------------------------------------------------------------
CREATE TABLE public.assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'assign', 'unassign', 'reassign'
  assigner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_history_assignment_id ON public.assignment_history(assignment_id);
CREATE INDEX idx_assignment_history_assigner_id ON public.assignment_history(assigner_id);
CREATE INDEX idx_assignment_history_created_at ON public.assignment_history(created_at);

-- ---------------------------------------------------------------------------
-- 6. RLS Policies
--    All tables use RLS. Policies built on has_role().
-- ---------------------------------------------------------------------------

-- --- songs ---
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-archived songs"
  ON public.songs
  FOR SELECT
  USING (archived_at IS NULL);

CREATE POLICY "Admin and manager can view all songs (including archived)"
  ON public.songs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can insert songs"
  ON public.songs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update songs"
  ON public.songs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can soft-delete songs"
  ON public.songs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- setlists ---
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-archived setlists"
  ON public.setlists
  FOR SELECT
  USING (archived_at IS NULL);

CREATE POLICY "Admin and manager can view all setlists"
  ON public.setlists
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can insert setlists"
  ON public.setlists
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update setlists"
  ON public.setlists
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can soft-delete setlists"
  ON public.setlists
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- setlist_songs ---
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view setlist_songs for non-archived setlists"
  ON public.setlist_songs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.setlists WHERE setlists.id = setlist_songs.setlist_id AND setlists.archived_at IS NULL)
  );

CREATE POLICY "Admin can insert setlist_songs"
  ON public.setlist_songs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update setlist_songs"
  ON public.setlist_songs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete setlist_songs"
  ON public.setlist_songs
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- assignments ---
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments for visible songs/setlists"
  ON public.assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.songs
      WHERE songs.id = assignments.context_id
        AND assignments.context_type = 'song'
        AND songs.archived_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.setlist_songs
      JOIN public.setlists ON setlists.id = setlist_songs.setlist_id
      WHERE setlist_songs.id = assignments.context_id
        AND assignments.context_type = 'setlist_song'
        AND setlists.archived_at IS NULL
    )
  );

CREATE POLICY "Admin and manager can insert assignments"
  ON public.assignments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update assignments"
  ON public.assignments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can delete assignments"
  ON public.assignments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- assignment_history ---
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and manager can view assignment history"
  ON public.assignment_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can insert assignment history"
  ON public.assignment_history
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 7. Indexes on filter columns
-- ---------------------------------------------------------------------------
CREATE INDEX idx_songs_created_at ON public.songs(created_at);
CREATE INDEX idx_setlists_created_at ON public.setlists(created_at);
CREATE INDEX idx_assignments_created_at ON public.assignments(created_at);
