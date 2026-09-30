-- Audition open instruments: which instrument_roles each audition is open for.
CREATE TABLE public.audition_instruments (
  audition_id UUID NOT NULL REFERENCES public.auditions(id) ON DELETE CASCADE,
  instrument_role_id INT NOT NULL REFERENCES public.instrument_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (audition_id, instrument_role_id)
);

CREATE INDEX idx_audition_instruments_audition_id ON public.audition_instruments(audition_id);

ALTER TABLE public.audition_instruments ENABLE ROW LEVEL SECURITY;

-- Admins manage, managers + candidates can read (needed to apply).
CREATE POLICY "Admins can manage audition instruments"
  ON public.audition_instruments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and candidates can view audition instruments"
  ON public.audition_instruments
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'candidate')
    OR public.has_role(auth.uid(), 'user')
  );
