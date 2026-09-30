-- ============================================================================
-- Slice 5: Proposals & Auditions
-- Purpose: Creates song_proposals, proposal_comments, proposal_settings,
-- auditions, audition_applications, audition_application_instruments.
-- Implements transactional SQL functions for approve_proposal and
-- admit_applicant. All tables use RLS with has_role().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. song_proposals table
--    Proposer can submit a song proposal. Status lifecycle: pending -> approved/rejected.
-- ---------------------------------------------------------------------------
CREATE TABLE public.song_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  spotify_id TEXT,
  lastfm_id TEXT,
  album_art_url TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  associated_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.song_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_proposals_updated_at();

CREATE INDEX idx_proposals_status ON public.song_proposals(status);
CREATE INDEX idx_proposals_proposer_id ON public.song_proposals(proposer_id);
CREATE INDEX idx_proposals_archived ON public.song_proposals(archived_at);

-- ---------------------------------------------------------------------------
-- 2. proposal_comments table
--    Comments on proposals, with comment count shown per proposal.
-- ---------------------------------------------------------------------------
CREATE TABLE public.proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.song_proposals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_comments_proposal_id ON public.proposal_comments(proposal_id);
CREATE INDEX idx_proposal_comments_author_id ON public.proposal_comments(author_id);

-- ---------------------------------------------------------------------------
-- 3. proposal_settings table — single-row global settings
--    Controls whether proposals are open, the submission window, and
--    max proposals per user.
-- ---------------------------------------------------------------------------
CREATE TABLE public.proposal_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- single-row table enforced by CHECK
  proposals_open BOOLEAN NOT NULL DEFAULT TRUE,
  submission_window_start TIMESTAMPTZ,
  submission_window_end TIMESTAMPTZ,
  max_proposals_per_user INTEGER DEFAULT 5
);

INSERT INTO public.proposal_settings (id, proposals_open, max_proposals_per_user)
VALUES (1, TRUE, 5);

CREATE INDEX idx_proposal_settings_id ON public.proposal_settings(id);

-- ---------------------------------------------------------------------------
-- 4. auditions table
--    Only admin can create/edit/delete. Managers can review applications.
-- ---------------------------------------------------------------------------
CREATE TABLE public.auditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location TEXT,
  application_deadline TIMESTAMPTZ NOT NULL,
  max_applicants INT,
  max_instruments_per_applicant INT DEFAULT 3,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_auditions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auditions_updated_at
  BEFORE UPDATE ON public.auditions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auditions_updated_at();

CREATE INDEX idx_auditions_archived ON public.auditions(archived_at);
CREATE INDEX idx_auditions_date ON public.auditions(date);
CREATE INDEX idx_auditions_deadline ON public.auditions(application_deadline);

-- ---------------------------------------------------------------------------
-- 5. audition_applications table
--    applicant_id is a candidate-role user. Status: pending/admitted/rejected.
--    Server-side enforces: no new applications after application_deadline.
-- ---------------------------------------------------------------------------
CREATE TYPE application_status AS ENUM ('pending', 'admitted', 'rejected');

CREATE TABLE public.audition_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audition_id UUID NOT NULL REFERENCES public.auditions(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audition_id, applicant_id)
);

CREATE OR REPLACE FUNCTION public.handle_audition_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audition_applications_updated_at
  BEFORE UPDATE ON public.audition_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audition_applications_updated_at();

-- Proper deadline check using a BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.check_audition_deadline()
RETURNS TRIGGER AS $$
DECLARE
  deadline TIMESTAMPTZ;
BEGIN
  SELECT application_deadline INTO deadline FROM public.auditions WHERE id = NEW.audition_id;
  IF deadline IS NOT NULL AND NOW() > deadline THEN
    RAISE EXCEPTION 'Application deadline has passed for this audition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audition_applications_deadline_check
  BEFORE INSERT ON public.audition_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_audition_deadline();

CREATE INDEX idx_audition_applications_audition_id ON public.audition_applications(audition_id);
CREATE INDEX idx_audition_applications_applicant_id ON public.audition_applications(applicant_id);
CREATE INDEX idx_audition_applications_status ON public.audition_applications(status);

-- ---------------------------------------------------------------------------
-- 6. audition_application_instruments table
--    Each application can list multiple instruments. Each (except Technician)
--    must have an associated song chosen via Last.fm.
-- ---------------------------------------------------------------------------
CREATE TABLE public.audition_application_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.audition_applications(id) ON DELETE CASCADE,
  instrument_role_id INT NOT NULL REFERENCES public.instrument_roles(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, instrument_role_id)
);

CREATE INDEX idx_audition_app_instruments_application_id ON public.audition_application_instruments(application_id);
CREATE INDEX idx_audition_app_instruments_instrument_role_id ON public.audition_application_instruments(instrument_role_id);
CREATE INDEX idx_audition_app_instruments_song_id ON public.audition_application_instruments(song_id);

-- ---------------------------------------------------------------------------
-- 7. RLS Policies
-- ---------------------------------------------------------------------------

-- --- song_proposals ---
ALTER TABLE public.song_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can view all proposals"
  ON public.song_proposals
  FOR SELECT
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own proposals"
  ON public.song_proposals
  FOR SELECT
  USING (auth.uid() = proposer_id);

CREATE POLICY "Anyone can insert proposals when open"
  ON public.song_proposals
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'candidate')
    AND EXISTS (SELECT 1 FROM public.proposal_settings WHERE id = 1 AND proposals_open = TRUE)
  );

CREATE POLICY "Admins can update proposal status"
  ON public.song_proposals
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can soft-delete proposals"
  ON public.song_proposals
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- proposal_comments ---
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible proposals"
  ON public.proposal_comments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.song_proposals WHERE song_proposals.id = proposal_comments.proposal_id AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR song_proposals.proposer_id = auth.uid()))
  );

CREATE POLICY "Anyone can insert comments on visible proposals"
  ON public.proposal_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.song_proposals WHERE song_proposals.id = proposal_comments.proposal_id AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR song_proposals.proposer_id = auth.uid()))
  );

-- --- proposal_settings ---
ALTER TABLE public.proposal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and update proposal settings"
  ON public.proposal_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- --- auditions ---
ALTER TABLE public.auditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all auditions"
  ON public.auditions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view auditions"
  ON public.auditions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can insert auditions"
  ON public.auditions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update auditions"
  ON public.auditions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can soft-delete auditions"
  ON public.auditions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- audition_applications ---
ALTER TABLE public.audition_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own applications"
  ON public.audition_applications
  FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Managers and admins can view all applications"
  ON public.audition_applications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidates can insert own applications"
  ON public.audition_applications
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'candidate')
    AND EXISTS (SELECT 1 FROM public.auditions WHERE auditions.id = audition_applications.audition_id AND auditions.application_deadline > NOW())
  );

CREATE POLICY "Managers and admins can update applications"
  ON public.audition_applications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete applications"
  ON public.audition_applications
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- audition_application_instruments ---
ALTER TABLE public.audition_application_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own application instruments"
  ON public.audition_application_instruments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.audition_applications WHERE audition_applications.id = audition_application_instruments.application_id AND audition_applications.applicant_id = auth.uid())
  );

CREATE POLICY "Managers and admins can view all application instruments"
  ON public.audition_application_instruments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidates can insert own application instruments"
  ON public.audition_application_instruments
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.audition_applications WHERE audition_applications.id = audition_application_instruments.application_id AND audition_applications.applicant_id = auth.uid())
  );

CREATE POLICY "Managers can update application instruments"
  ON public.audition_application_instruments
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.audition_applications WHERE audition_applications.id = audition_application_instruments.application_id AND public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins can delete application instruments"
  ON public.audition_application_instruments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_proposals_created_at ON public.song_proposals(created_at);
CREATE INDEX idx_proposal_comments_created_at ON public.proposal_comments(created_at);
CREATE INDEX idx_auditions_created_at ON public.auditions(created_at);
CREATE INDEX idx_audition_applications_created_at ON public.audition_applications(created_at);
CREATE INDEX idx_audition_app_instruments_created_at ON public.audition_application_instruments(created_at);

-- ---------------------------------------------------------------------------
-- 9. Transactional SQL Functions
--    These must run atomically - never split into separate client-side calls.
-- ---------------------------------------------------------------------------

-- approve_proposal: Marks proposal approved AND creates the corresponding song.
-- Must run in ONE transaction. Partial failure leaves no orphaned data.
CREATE OR REPLACE FUNCTION public.approve_proposal(p_proposal_id UUID, p_associated_event_id UUID)
RETURNS UUID AS $$
DECLARE
  v_proposer_id UUID;
  v_title TEXT;
  v_artist TEXT;
  v_spotify_id TEXT;
  v_lastfm_id TEXT;
  v_album_art_url TEXT;
  v_song_id UUID;
BEGIN
  -- Get proposal data
  SELECT proposer_id, title, artist, spotify_id, lastfm_id, album_art_url
  INTO v_proposer_id, v_title, v_artist, v_spotify_id, v_lastfm_id, v_album_art_url
  FROM public.song_proposals
  WHERE id = p_proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  -- Create the song record
  INSERT INTO public.songs (title, artist, spotify_id, lastfm_id, album_art_url)
  VALUES (v_title, v_artist, v_spotify_id, v_lastfm_id, v_album_art_url)
  RETURNING songs.id INTO v_song_id;

  -- Update proposal status and associate with event
  UPDATE public.song_proposals
  SET status = 'approved', associated_event_id = p_associated_event_id, updated_at = now()
  WHERE id = p_proposal_id;

  RETURN v_song_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admit_applicant: Upgrades applicant role from candidate to user AND
-- inserts their audition instruments into member_instruments.
-- Must run in ONE transaction. Partial failure leaves no orphaned data.
CREATE OR REPLACE FUNCTION public.admit_applicant(p_application_id UUID)
RETURNS VOID AS $$
DECLARE
  v_applicant_id UUID;
  v_audition_id UUID;
  v_instrument RECORD;
BEGIN
  -- Get application data
  SELECT applicant_id, audition_id
  INTO v_applicant_id, v_audition_id
  FROM public.audition_applications
  WHERE id = p_application_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending application not found';
  END IF;

  -- Upgrade applicant role from candidate to user
  UPDATE public.profiles
  SET role = 'user'
  WHERE id = v_applicant_id AND role = 'candidate';

  -- Insert audition instruments into member_instruments
  FOR v_instrument IN
    SELECT instrument_role_id FROM public.audition_application_instruments
    WHERE application_id = p_application_id
  LOOP
    -- Check if member_instruments entry already exists for this instrument
    INSERT INTO public.member_instruments (member_id, instrument_role_id, is_primary)
    VALUES (v_applicant_id, v_instrument.instrument_role_id, FALSE)
    ON CONFLICT (member_id, instrument_role_id) DO NOTHING;
  END LOOP;

  -- Update application status
  UPDATE public.audition_applications
  SET status = 'admitted', updated_at = now()
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
