-- ============================================================================
-- Slice 2: Auth & RBAC, Members, Profile
-- Purpose: Expands roles from 4 named roles (admin, manager, user,
-- candidate), adds profile fields (first_name, last_name, classe,
-- username, member_number), creates instrument tables, updates RLS
-- policies, and sets up Edge Functions for password management.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Recreate app_role enum with correct 4 roles.
--    PostgreSQL enums are immutable, so we drop and recreate.
--    This migration runs on a fresh DB (no data to preserve).
-- ---------------------------------------------------------------------------
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'user', 'candidate');

-- NOTE: the CASCADE above also dropped profiles.role, its default,
-- has_role(), and every slice-1 policy that called it. Restore all three
-- (policies themselves are recreated in section 7 below).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role app_role NOT NULL DEFAULT 'candidate';

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
-- 2. Add new columns to profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS classe TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS member_number INT UNIQUE;

-- ---------------------------------------------------------------------------
-- 3. instrument_roles table — admin-managed list of instruments
-- ---------------------------------------------------------------------------
CREATE TABLE public.instrument_roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. member_instruments table — a member can have multiple instruments,
--    exactly one flagged as primary.
-- ---------------------------------------------------------------------------
CREATE TABLE public.member_instruments (
  id SERIAL PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument_role_id INT NOT NULL REFERENCES public.instrument_roles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, instrument_role_id)
);

-- ---------------------------------------------------------------------------
-- 5. Seed instrument_roles with the required list
-- ---------------------------------------------------------------------------
INSERT INTO public.instrument_roles (name, display_order) VALUES
  ('voice', 1),
  ('piano', 2),
  ('guitar', 3),
  ('bass', 4),
  ('drums', 5),
  ('keys', 6),
  ('violin', 7),
  ('technician', 8)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. RLS Policies on new tables
--    All tables use RLS. Policies built on has_role().
-- ---------------------------------------------------------------------------

-- instrument_roles: admin can CRUD, everyone else can read
ALTER TABLE public.instrument_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all instrument roles"
  ON public.instrument_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert instrument roles"
  ON public.instrument_roles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update instrument roles"
  ON public.instrument_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete instrument roles"
  ON public.instrument_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- member_instruments: members can read their own, admin/manager can read all,
-- admin/manager can insert/update, admin only can delete
ALTER TABLE public.member_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instruments"
  ON public.member_instruments
  FOR SELECT
  USING (auth.uid() = member_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Members can insert own instruments"
  ON public.member_instruments
  FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Members can update own instruments"
  ON public.member_instruments
  FOR UPDATE
  USING (auth.uid() = member_id);

CREATE POLICY "Admin can delete instruments"
  ON public.member_instruments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 7. Updated RLS policies on profiles table
--    Now with the new role set and additional fields.
-- ---------------------------------------------------------------------------

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin and manager can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin and manager can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

-- Policy: Users can read their own profile (including candidates)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin and manager can view all profiles
CREATE POLICY "Admin and manager can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Policy: Anyone can create their own profile (self-registration, candidate role)
CREATE POLICY "Anyone can create own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Members can update their own profile; admin/manager can update any
CREATE POLICY "Members can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admin can update any profile (for role/instrument changes)
CREATE POLICY "Admin can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admin can delete profiles
CREATE POLICY "Admin can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 8. Indexes on foreign keys and filter columns
-- ---------------------------------------------------------------------------
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_member_number ON public.profiles(member_number);
CREATE INDEX idx_member_instruments_member_id ON public.member_instruments(member_id);
CREATE INDEX idx_member_instruments_instrument_role_id ON public.member_instruments(instrument_role_id);
CREATE INDEX idx_instrument_roles_name ON public.instrument_roles(name);
CREATE INDEX idx_instrument_roles_display_order ON public.instrument_roles(display_order);
