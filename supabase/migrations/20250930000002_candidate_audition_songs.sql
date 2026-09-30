-- Audition apply flow: candidates pick a Deezer song per instrument (except
-- 'altro'). The pick is persisted as a songs row linked via
-- audition_application_instruments.song_id, so candidates need INSERT on songs.
CREATE POLICY "Candidates can insert songs for auditions"
  ON public.songs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'candidate'));
