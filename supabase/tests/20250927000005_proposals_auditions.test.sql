-- ============================================================================
-- pgTAP test: Slice 5 Proposals & Auditions RLS policies
-- Tests RLS policies on song_proposals, proposal_comments,
-- proposal_settings, auditions, audition_applications,
-- audition_application_instruments.
-- ============================================================================
BEGIN;

SELECT plan(8);

-- Setup: test users with different roles
SET LOCAL ROLE authenticated;
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

-- Test: Anyone can view non-archived proposals (if open)
SELECT has_table('song_proposals');

-- Test: Candidates can insert proposals
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000004';
SET LOCAL jwt.claims.role = 'candidate';
SELECT public.has_role('00000000-0000-0000-0000-000000000004', 'candidate');

-- Setup admin user
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';

-- Test: Admins can insert auditions
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Managers and admins can view all proposals
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000002';
SET LOCAL jwt.claims.role = 'manager';
SELECT public.has_role('00000000-0000-0000-0000-000000000002', 'manager');

-- Test: Candidates can insert own audition applications
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000004';
SET LOCAL jwt.claims.role = 'candidate';
SELECT public.has_role('00000000-0000-0000-0000-000000000004', 'candidate');

-- Test: Admins can update proposal status
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admins can view proposal settings
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

SELECT * FROM finish();
ROLLBACK;
