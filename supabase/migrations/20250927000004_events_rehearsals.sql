-- ============================================================================
-- Slice 4: Events & Rehearsals
-- Purpose: Creates events, event_setlists, rehearsals, rehearsal_participants,
-- and rehearsal_attendance tables. Implements soft-delete via archived_at
-- on events. All tables use RLS with has_role().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Events table
--    Soft-delete via archived_at.
-- ---------------------------------------------------------------------------
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  description TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_events_updated_at();

CREATE INDEX idx_events_archived ON public.events(archived_at);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_events_name ON public.events(name);

-- ---------------------------------------------------------------------------
-- 2. event_setlists join table
--    An event can contain multiple setlists.
-- ---------------------------------------------------------------------------
CREATE TABLE public.event_setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, setlist_id)
);

CREATE INDEX idx_event_setlists_event_id ON public.event_setlists(event_id);
CREATE INDEX idx_event_setlists_setlist_id ON public.event_setlists(setlist_id);

-- ---------------------------------------------------------------------------
-- 3. Rehearsals table
--    title, start_time, end_time, location, notes, optional linked setlist_id.
-- ---------------------------------------------------------------------------
CREATE TABLE public.rehearsals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  setlist_id UUID REFERENCES public.setlists(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_rehearsals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rehearsals_updated_at
  BEFORE UPDATE ON public.rehearsals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rehearsals_updated_at();

CREATE INDEX idx_rehearsals_archived ON public.rehearsals(archived_at);
CREATE INDEX idx_rehearsals_start_time ON public.rehearsals(start_time);
CREATE INDEX idx_rehearsals_setlist_id ON public.rehearsals(setlist_id);

-- ---------------------------------------------------------------------------
-- 4. rehearsal_participants table — participants and leaders in the same
--    rehearsal with a role/flag column rather than two separate tables.
-- ---------------------------------------------------------------------------
CREATE TYPE participant_role AS ENUM ('participant', 'leader');

CREATE TABLE public.rehearsal_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES public.rehearsals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role participant_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rehearsal_id, member_id, role)
);

CREATE INDEX idx_rehearsal_participants_rehearsal_id ON public.rehearsal_participants(rehearsal_id);
CREATE INDEX idx_rehearsal_participants_member_id ON public.rehearsal_participants(member_id);
CREATE INDEX idx_rehearsal_participants_role ON public.rehearsal_participants(role);

-- ---------------------------------------------------------------------------
-- 5. rehearsal_attendance table — attendance status per member per rehearsal.
--    Status: available / unavailable / maybe.
-- ---------------------------------------------------------------------------
CREATE TYPE attendance_status AS ENUM ('available', 'unavailable', 'maybe');

CREATE TABLE public.rehearsal_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id UUID NOT NULL REFERENCES public.rehearsals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'maybe',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rehearsal_id, member_id)
);

CREATE OR REPLACE FUNCTION public.handle_rehearsal_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rehearsal_attendance_updated_at
  BEFORE UPDATE ON public.rehearsal_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rehearsal_attendance_updated_at();

CREATE INDEX idx_rehearsal_attendance_rehearsal_id ON public.rehearsal_attendance(rehearsal_id);
CREATE INDEX idx_rehearsal_attendance_member_id ON public.rehearsal_attendance(member_id);
CREATE INDEX idx_rehearsal_attendance_status ON public.rehearsal_attendance(status);

-- ---------------------------------------------------------------------------
-- 6. RLS Policies
--    All tables use RLS. Policies built on has_role().
-- ---------------------------------------------------------------------------

-- --- events ---
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-archived events"
  ON public.events
  FOR SELECT
  USING (archived_at IS NULL);

CREATE POLICY "Admin and manager can view all events"
  ON public.events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update events"
  ON public.events
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can soft-delete events"
  ON public.events
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- event_setlists ---
ALTER TABLE public.event_setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event_setlists for non-archived events"
  ON public.event_setlists
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = event_setlists.event_id AND events.archived_at IS NULL)
  );

CREATE POLICY "Admin can insert event_setlists"
  ON public.event_setlists
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update event_setlists"
  ON public.event_setlists
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete event_setlists"
  ON public.event_setlists
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- rehearsals ---
ALTER TABLE public.rehearsals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-archived rehearsals"
  ON public.rehearsals
  FOR SELECT
  USING (archived_at IS NULL);

CREATE POLICY "Admin and manager can view all rehearsals"
  ON public.rehearsals
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can insert rehearsals"
  ON public.rehearsals
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update rehearsals"
  ON public.rehearsals
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can soft-delete rehearsals"
  ON public.rehearsals
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- rehearsal_participants ---
ALTER TABLE public.rehearsal_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants for non-archived rehearsals"
  ON public.rehearsal_participants
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.rehearsals WHERE rehearsals.id = rehearsal_participants.rehearsal_id AND rehearsals.archived_at IS NULL)
  );

CREATE POLICY "Admin and manager can insert participants"
  ON public.rehearsal_participants
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update participants"
  ON public.rehearsal_participants
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can delete participants"
  ON public.rehearsal_participants
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- --- rehearsal_attendance ---
ALTER TABLE public.rehearsal_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendance for non-archived rehearsals"
  ON public.rehearsal_attendance
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.rehearsals WHERE rehearsals.id = rehearsal_attendance.rehearsal_id AND rehearsals.archived_at IS NULL)
  );

CREATE POLICY "Members can insert/update own attendance"
  ON public.rehearsal_attendance
  FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Members can update own attendance"
  ON public.rehearsal_attendance
  FOR UPDATE
  USING (auth.uid() = member_id);

CREATE POLICY "Admin and manager can insert/update any attendance"
  ON public.rehearsal_attendance
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin and manager can update any attendance"
  ON public.rehearsal_attendance
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin can delete attendance"
  ON public.rehearsal_attendance
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 7. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_events_created_at ON public.events(created_at);
CREATE INDEX idx_rehearsals_created_at ON public.rehearsals(created_at);
CREATE INDEX idx_rehearsal_participants_created_at ON public.rehearsal_participants(created_at);
CREATE INDEX idx_rehearsal_attendance_created_at ON public.rehearsal_attendance(created_at);
