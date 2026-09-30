-- ============================================================================
-- Slice 7: Admin Settings, Bulletin Board, Member Badges
-- Purpose: Creates app_settings (single-row: login banner + maintenance mode),
-- bulletin_posts + bulletin_attachments (Storage bucket included), member_badges
-- (opaque QR token + short code, revoke via revoked_at), transactional
-- bulk-role function, and public badge lookup functions. All tables use RLS
-- built on has_role(). No module toggles, no push notifications.
-- ============================================================================

-- NOTE: all defaults below use only built-in functions (gen_random_uuid,
-- md5, now). In particular nothing depends on pgcrypto, because on Supabase
-- that extension lives in the `extensions` schema, which is not on the
-- migration search_path — an unqualified gen_random_bytes() call fails push.

-- ---------------------------------------------------------------------------
-- 1. app_settings table — single row (id = 1)
--    Login banner + maintenance mode. Anon-readable so the login page and
--    the 30s maintenance poll work without authentication.
-- ---------------------------------------------------------------------------
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  login_banner_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  login_banner_message TEXT NOT NULL DEFAULT '',
  login_banner_type TEXT NOT NULL DEFAULT 'info'
    CHECK (login_banner_type IN ('info', 'warning', 'success', 'destructive')),
  login_banner_expires_at TIMESTAMPTZ,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message TEXT NOT NULL DEFAULT ''
);

INSERT INTO public.app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Bulk role assignment — the ONLY bulk action in the app.
--    One transactional call; verifies the caller is admin inside the function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_bulk_assign_roles(p_user_ids UUID[], p_role app_role)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.profiles
  SET role = p_role, updated_at = now()
  WHERE id = ANY (p_user_ids);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3. bulletin_posts table — admin-only creation, optional role targeting,
--    pinned posts sort before unpinned ones.
-- ---------------------------------------------------------------------------
CREATE TABLE public.bulletin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  visible_roles TEXT[] NOT NULL DEFAULT '{admin,manager,user,candidate}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_bulletin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bulletin_posts_updated_at
  BEFORE UPDATE ON public.bulletin_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bulletin_updated_at();

CREATE INDEX idx_bulletin_posts_pinned_created ON public.bulletin_posts(pinned DESC, created_at DESC);

ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Members see posts targeted at their own role; admins see everything (to manage).
CREATE POLICY "Members can view posts targeted at their role"
  ON public.bulletin_posts
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role::text = ANY (public.bulletin_posts.visible_roles)
    )
  );

CREATE POLICY "Admin can insert bulletin posts"
  ON public.bulletin_posts
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update bulletin posts"
  ON public.bulletin_posts
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete bulletin posts"
  ON public.bulletin_posts
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Bulletin attachments: Storage bucket + link table.
--    Files live in Storage; rows link them to a post. Any authenticated user
--    can read (post-level visibility is enforced on the posts table); only
--    admins can upload or delete.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulletin-attachments', 'bulletin-attachments', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read bulletin attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bulletin-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Admin can upload bulletin attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'bulletin-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete bulletin attachments"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'bulletin-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.bulletin_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulletin_attachments_post_id ON public.bulletin_attachments(post_id);

ALTER TABLE public.bulletin_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attachments of visible posts"
  ON public.bulletin_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bulletin_posts
      WHERE bulletin_posts.id = public.bulletin_attachments.post_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role::text = ANY (public.bulletin_posts.visible_roles)
          )
        )
    )
  );

CREATE POLICY "Admin can insert bulletin attachments"
  ON public.bulletin_attachments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete bulletin attachments"
  ON public.bulletin_attachments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 5. member_badges table — independent badge units, revoke via revoked_at
--    (never hard delete). Token + short code are independent lookup paths.
--    Managers have zero access: no manager policy anywhere on this table.
-- ---------------------------------------------------------------------------
CREATE TABLE public.member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  short_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(gen_random_uuid()::text) from 1 for 6)),
  admin_note TEXT NOT NULL DEFAULT '',
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_badges_member_id ON public.member_badges(member_id);
CREATE INDEX idx_member_badges_qr_token ON public.member_badges(qr_token);
CREATE INDEX idx_member_badges_short_code ON public.member_badges(short_code);

ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;

-- Admin sees and manages everything (manager deliberately excluded).
CREATE POLICY "Admin can manage all badges"
  ON public.member_badges
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Members see only their own active badges (read-only "My Badges").
CREATE POLICY "Members can view own active badges"
  ON public.member_badges
  FOR SELECT
  USING (member_id = auth.uid() AND revoked_at IS NULL);

-- ---------------------------------------------------------------------------
-- 6. Public badge lookup functions (SECURITY DEFINER).
--    Anonymous badge routes resolve tokens/codes through these instead of
--    direct table access, so token values are never listable by anon users.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_badge_by_token(p_token TEXT)
RETURNS TABLE (
  badge_id UUID,
  member_id UUID,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.member_id, p.first_name, p.last_name, b.created_at
  FROM public.member_badges b
  JOIN public.profiles p ON p.id = b.member_id
  WHERE b.qr_token = p_token
    AND b.revoked_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lookup_badge_by_code(p_code TEXT)
RETURNS TABLE (
  badge_id UUID,
  member_id UUID,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.member_id, p.first_name, p.last_name, b.created_at
  FROM public.member_badges b
  JOIN public.profiles p ON p.id = b.member_id
  WHERE b.short_code = upper(p_code)
    AND b.revoked_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 7. Realtime: dashboard live counts subscribe to these tables.
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.setlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rehearsals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulletin_posts;

-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_bulletin_posts_created_at ON public.bulletin_posts(created_at);
CREATE INDEX idx_member_badges_created_at ON public.member_badges(created_at);
