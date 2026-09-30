-- Admin manage dialog (Members page) replaces member_instruments rows when
-- editing a user's instruments. Existing policies let members write only
-- their own rows, so admins need their own insert/update policies.

CREATE POLICY "Admin can insert member instruments"
  ON public.member_instruments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update member instruments"
  ON public.member_instruments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
