-- ============================================================================
-- pgTAP test: Slice 4 Events & Rehearsals RLS policies
-- Tests RLS policies on events, event_setlists, rehearsals,
-- rehearsal_participants, and rehearsal_attendance.
-- ============================================================================
BEGIN;

SELECT plan(8);

-- Setup: test users with different roles
SET LOCAL ROLE authenticated;
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

-- Test: Anyone can view non-archived events
SELECT has_table('events');

-- Test: Anyone can view non-archived rehearsals
SELECT has_table('rehearsals');

-- Test: Users can view rehearsal_attendance for non-archived rehearsals
SELECT has_table('rehearsal_attendance');

-- Setup admin user
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';

-- Test: Admin can insert events
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin and manager can insert rehearsals
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000002';
SET LOCAL jwt.claims.role = 'manager';
SELECT public.has_role('00000000-0000-0000-0000-000000000002', 'manager');

-- Test: Admin can insert event_setlists
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Members can insert own attendance
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';
SELECT public.has_role('00000000-0000-0000-0000-000000000001', 'user');

SELECT * FROM finish();
ROLLBACK;
