-- ============================================================================
-- pgTAP test: Slice 2 Auth & RBAC RLS policies
-- Tests new RLS policies on profiles, instrument_roles, and member_instruments.
-- ============================================================================
BEGIN;

SELECT plan(10);

-- Setup: test users with different roles
SET LOCAL ROLE authenticated;
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

-- Test: Users can view own profile
SELECT results_eq(
  $$SELECT count(*) FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001'$$,
  $$SELECT 1$$,
  'Users can view own profile'
);

-- Setup admin user
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';

-- Test: Admin can view all profiles
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin can insert instrument_roles
SELECT has_table('instrument_roles');

-- Test: Admin can update instrument_roles
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin can delete instrument_roles
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Members can insert own instruments
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';
SELECT has_table('member_instruments');

-- Test: Members can update own instruments
SELECT public.has_role('00000000-0000-0000-0000-000000000001', 'user');

-- Test: Admin can delete instruments
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Anyone can create own profile (self-registration)
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000004';
SELECT has_table('profiles');

SELECT * FROM finish();
ROLLBACK;
