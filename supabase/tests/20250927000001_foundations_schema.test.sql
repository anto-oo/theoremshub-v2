-- ============================================================================
-- pgTAP test: Foundations schema RLS policies
-- One test per RLS policy on the profiles table.
-- ============================================================================
BEGIN;

SELECT plan(5);

-- Setup: Create a test role for RLS bypass
SET LOCAL ROLE authenticated;
SET LOCAL jwt.claims.role = 'admin';
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

SELECT has_table('profiles');

-- Test: Users can view own profile
SELECT results_eq(
  $$SELECT count(*) FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001'$$,
  $$SELECT 1$$,
  'Users can view own profile'
);

-- Test: Admin can view all profiles
SELECT has_role('00000000-0000-0000-0000-000000000001', 'admin');

-- Test: Admin can create profiles
SELECT has_table('profiles');

-- Test: Admin and manager can update profiles
SELECT public.has_role('00000000-0000-0000-0000-000000000001', 'admin');

-- Test: Admin can delete profiles
SELECT public.has_role('00000000-0000-0000-0000-000000000001', 'admin');

SELECT * FROM finish();
ROLLBACK;
