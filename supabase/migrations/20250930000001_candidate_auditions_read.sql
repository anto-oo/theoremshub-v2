-- Candidates were given frontend access to /auditions but had no SELECT policy
-- on the table, so the list came back empty. Allow candidates (and users) to
-- read open (non-archived) auditions. Writes stay admin-only.
CREATE POLICY "Candidates can view open auditions"
  ON public.auditions
  FOR SELECT
  USING (
    archived_at IS NULL
    AND (
      public.has_role(auth.uid(), 'candidate')
      OR public.has_role(auth.uid(), 'user')
    )
  );
