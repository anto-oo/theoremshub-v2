-- ============================================================================
-- Fix: all creation dialogs fail
-- Purpose: Repairs three backend defects that made every creation dialog
-- error on submit.
--
-- 1. has_role() raised 42702 `column reference "role" is ambiguous` on EVERY
--    call (fixed in 20250929000001): the parameter name `role` collides with
--    profiles.role. Every RLS policy built on has_role() — i.e. every INSERT
--    behind the creation dialogs — failed with it.
-- 2. Songs, setlists, events and auditions were admin-only on INSERT while
--    the UI/copy ("Solo admin e manager") and the rehearsals policies
--    already treat managers as co-managers: a manager's insert was denied
--    and the dialog errored. Widened to admin OR manager (inserts only).
--    Audition creation additionally writes audition_instruments
--    (delete + insert), so managers need write access there too.
-- 3. Proposals denied everybody: the check required the candidate role
--    (the dialog is offered to every role) and the proposals_open lookup
--    read proposal_settings, which only admins could SELECT. Any
--    authenticated user can now propose their own row while open, and any
--    authenticated user can read the settings flag the check depends on.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. has_role() 42702 fix lives in 20250929000001 (already applied remotely).
--    Nothing to do here — Postgres forbids renaming function parameters via
--    CREATE OR REPLACE, so this file must NOT restate that fix.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2a. Songs: managers can insert.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can insert songs" ON public.songs;

CREATE POLICY "Admin and manager can insert songs"
  ON public.songs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ---------------------------------------------------------------------------
-- 2b. Setlists: managers can insert.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can insert setlists" ON public.setlists;

CREATE POLICY "Admin and manager can insert setlists"
  ON public.setlists
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ---------------------------------------------------------------------------
-- 2c. Events: managers can insert.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can insert events" ON public.events;

CREATE POLICY "Admin and manager can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ---------------------------------------------------------------------------
-- 2d. Auditions: managers can insert, plus write audition_instruments
--     (creation writes the open-instrument rows right after the audition).
--     FOR ALL without an explicit WITH CHECK reuses USING as the check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert auditions" ON public.auditions;

CREATE POLICY "Admins and managers can insert auditions"
  ON public.auditions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage audition instruments" ON public.audition_instruments;

CREATE POLICY "Admins and managers can manage audition instruments"
  ON public.audition_instruments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ---------------------------------------------------------------------------
-- 3. Proposals: any authenticated user proposes their own row while open.
--    The settings flag must be readable by non-admins or the check below
--    can never be true for them (RLS applies inside WITH CHECK subqueries).
-- ---------------------------------------------------------------------------
CREATE POLICY "Authenticated users can view proposal settings"
  ON public.proposal_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert proposals when open" ON public.song_proposals;

CREATE POLICY "Anyone can insert proposals when open"
  ON public.song_proposals
  FOR INSERT
  WITH CHECK (
    auth.uid() = proposer_id
    AND EXISTS (SELECT 1 FROM public.proposal_settings WHERE id = 1 AND proposals_open = TRUE)
  );
