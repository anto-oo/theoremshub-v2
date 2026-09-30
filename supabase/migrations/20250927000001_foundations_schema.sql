-- ============================================================================
-- Slice 1: Foundations — Schema skeleton, auth, roles, app shell
-- Purpose: Creates the profiles table (extends auth users), the roles enum,
-- and sets up Row Level Security with the has_role() helper.
-- All tables use RLS. The has_role(uid, role) function is the single
-- authority for permission checks throughout the application.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable UUID extension
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 2. Custom type for roles
-- ---------------------------------------------------------------------------
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'member', 'viewer');

-- ---------------------------------------------------------------------------
-- 3. Profiles table — extends every Supabase Auth user
--    Stores public profile information. RLS enforced on all operations.
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auth_id TEXT UNIQUE NOT NULL
);

-- ---------------------------------------------------------------------------
-- 4. Auto-update updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 5. has_role(uid, role) — centralized role-checking function
--    Used by every RLS policy in the application.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = uid
      AND profiles.role = role::app_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 6. RLS Policies on profiles
--    Each policy uses has_role() to determine access.
--    One pgTAP test per policy (see supabase/seed.sql and tests).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin can read all profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admin and manager can insert profiles (admin onboards users)
CREATE POLICY "Admin and manager can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Policy: Admin and manager can update profiles
CREATE POLICY "Admin and manager can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Policy: Admin can delete (soft-archive via archived_at pattern)
-- Note: profiles are not soft-deleted; hard deletion is admin-only
CREATE POLICY "Admin can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 7. Indexes on foreign keys and filter columns
-- ---------------------------------------------------------------------------
CREATE INDEX idx_profiles_auth_id ON public.profiles(auth_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
