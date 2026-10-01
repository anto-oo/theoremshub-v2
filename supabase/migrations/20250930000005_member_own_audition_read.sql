-- Members (role 'user') lose access to /auditions once admitted, and the
-- open-auditions policy hides archived rows. Let any applicant read the
-- audition they applied to, even after archiving/promotion.
CREATE POLICY "Applicants can view own audition"
  ON public.auditions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audition_applications
      WHERE audition_applications.audition_id = auditions.id
        AND audition_applications.applicant_id = auth.uid()
    )
  );
