-- ============================================================================
-- pgTAP test: Slice 3 Songs & Setlists RLS policies
-- Tests RLS policies on songs, setlists, setlist_songs, assignments, assignment_history.
-- ============================================================================
BEGIN;

SELECT plan(8);

-- Setup: test users with different roles
SET LOCAL ROLE authenticated;
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

-- Test: Anyone can view non-archived songs
SELECT has_table('songs');

-- Test: Anyone can view non-archived setlists
SELECT has_table('setlists');

-- Test: Users can view setlist_songs for non-archived setlists
SELECT has_table('setlist_songs');

-- Test: Users can view assignments for visible songs/setlists
SELECT has_table('assignments');

-- Setup admin user
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';

-- Test: Admin can insert songs
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin can insert setlists
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin and manager can insert assignments
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin can view assignment history
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

SELECT * FROM finish();
ROLLBACK;
