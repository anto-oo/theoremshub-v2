-- ============================================================================
-- Survey response settings: optional respondent tracking + per-user limit
-- - surveys.collect_respondent (default true): when false, respondent_id is
--   stripped on insert (anonymous even for logged-in users).
-- - surveys.max_responses_per_user (NULL = unlimited, default 1): enforced
--   per (survey_id, respondent_id) for identified answers only.
-- - Users can read their own responses so the client can show remaining
--   attempts without exposing other respondents.
-- ============================================================================

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS collect_respondent BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_responses_per_user INT DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'surveys_max_responses_check'
  ) THEN
    ALTER TABLE public.surveys
      ADD CONSTRAINT surveys_max_responses_check
      CHECK (max_responses_per_user IS NULL OR max_responses_per_user >= 1);
  END IF;
END $$;

-- Allow logged-in users to read their own responses (needed to count
-- remaining attempts client-side; admins keep full access via existing policy).
DROP POLICY IF EXISTS "Users can view own responses" ON public.survey_responses;
CREATE POLICY "Users can view own responses"
  ON public.survey_responses
  FOR SELECT
  USING (auth.uid() = respondent_id);

CREATE OR REPLACE FUNCTION public.enforce_survey_response_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_collect BOOLEAN;
  v_max INT;
  v_status survey_status;
  v_count INT;
BEGIN
  SELECT status, collect_respondent, max_responses_per_user
    INTO v_status, v_collect, v_max
    FROM public.surveys
    WHERE id = NEW.survey_id;

  IF NOT FOUND OR v_status <> 'open' THEN
    RAISE EXCEPTION 'Survey is not open';
  END IF;

  -- Anonymous mode: never store identity, no per-user limit possible.
  IF NOT v_collect THEN
    NEW.respondent_id := NULL;
    RETURN NEW;
  END IF;

  -- Identified mode: enforce per-user cap (NULL = unlimited).
  IF NEW.respondent_id IS NOT NULL AND v_max IS NOT NULL THEN
    SELECT count(*) INTO v_count
      FROM public.survey_responses
      WHERE survey_id = NEW.survey_id
        AND respondent_id = NEW.respondent_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Response limit reached for this survey';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS survey_responses_enforce_limits ON public.survey_responses;
CREATE TRIGGER survey_responses_enforce_limits
  BEFORE INSERT ON public.survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_survey_response_limits();
