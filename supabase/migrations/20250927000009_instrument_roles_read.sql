-- Allow every authenticated user to read instrument_roles (needed to apply
-- to auditions, view members/setlists). Writes stay admin-only.
CREATE POLICY "Authenticated can view instrument roles"
  ON public.instrument_roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
