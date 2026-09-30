-- Per-instrument audition verdicts: managers judge each instrument separately
-- and applicants see the result per instrument.
ALTER TABLE public.audition_application_instruments
  ADD COLUMN status application_status NOT NULL DEFAULT 'pending';

-- Backfill verdicts from the legacy whole-application status.
UPDATE public.audition_application_instruments AS i
SET status = a.status
FROM public.audition_applications AS a
WHERE i.application_id = a.id AND a.status <> 'pending';

-- judge_audition_instrument: verdict on ONE instrument, atomically —
-- flips the instrument status, promotes candidate->user + copies the
-- instrument on admission, then derives the application status
-- (pending while any instrument is pending, admitted if any admitted,
-- rejected when all rejected).
CREATE OR REPLACE FUNCTION public.judge_audition_instrument(p_application_instrument_id UUID, p_decision application_status)
RETURNS VOID AS $$
DECLARE
  v_application_id UUID;
  v_applicant_id UUID;
  v_instrument_role_id INT;
  v_pending INT;
  v_admitted INT;
BEGIN
  -- Authz gate: this rpc is called directly from the client (unlike
  -- admit_applicant, which is gated by the admit-applicant edge function).
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Admin or manager only';
  END IF;
  IF p_decision <> 'admitted' AND p_decision <> 'rejected' THEN
    RAISE EXCEPTION 'Decision must be admitted or rejected';
  END IF;

  SELECT application_id, instrument_role_id
  INTO v_application_id, v_instrument_role_id
  FROM public.audition_application_instruments
  WHERE id = p_application_instrument_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application instrument not found';
  END IF;

  SELECT applicant_id INTO v_applicant_id
  FROM public.audition_applications
  WHERE id = v_application_id;

  UPDATE public.audition_application_instruments
  SET status = p_decision
  WHERE id = p_application_instrument_id;

  IF p_decision = 'admitted' THEN
    UPDATE public.profiles
    SET role = 'user'
    WHERE id = v_applicant_id AND role = 'candidate';

    INSERT INTO public.member_instruments (member_id, instrument_role_id, is_primary)
    VALUES (v_applicant_id, v_instrument_role_id, FALSE)
    ON CONFLICT (member_id, instrument_role_id) DO NOTHING;
  END IF;

  SELECT
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'admitted')
  INTO v_pending, v_admitted
  FROM public.audition_application_instruments
  WHERE application_id = v_application_id;

  UPDATE public.audition_applications
  SET status = CASE
    WHEN v_pending > 0 THEN 'pending'::application_status
    WHEN v_admitted > 0 THEN 'admitted'::application_status
    ELSE 'rejected'::application_status
  END,
  updated_at = now()
  WHERE id = v_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
