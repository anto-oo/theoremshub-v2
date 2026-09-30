-- Proposals auto-metadata: store album + duration like songs do,
-- so approve_proposal() carries them into songs.
ALTER TABLE public.song_proposals
  ADD COLUMN IF NOT EXISTS album TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INT;

CREATE OR REPLACE FUNCTION public.approve_proposal(p_proposal_id UUID, p_associated_event_id UUID)
RETURNS UUID AS $$
DECLARE
  v_proposer_id UUID;
  v_title TEXT;
  v_artist TEXT;
  v_spotify_id TEXT;
  v_lastfm_id TEXT;
  v_album_art_url TEXT;
  v_album TEXT;
  v_duration_seconds INT;
  v_song_id UUID;
BEGIN
  SELECT proposer_id, title, artist, spotify_id, lastfm_id, album_art_url, album, duration_seconds
  INTO v_proposer_id, v_title, v_artist, v_spotify_id, v_lastfm_id, v_album_art_url, v_album, v_duration_seconds
  FROM public.song_proposals
  WHERE id = p_proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  INSERT INTO public.songs (title, artist, spotify_id, lastfm_id, album_art_url, album, duration_seconds)
  VALUES (v_title, v_artist, v_spotify_id, v_lastfm_id, v_album_art_url, v_album, v_duration_seconds)
  RETURNING songs.id INTO v_song_id;

  UPDATE public.song_proposals
  SET status = 'approved', associated_event_id = p_associated_event_id, updated_at = now()
  WHERE id = p_proposal_id;

  RETURN v_song_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
