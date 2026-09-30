-- ============================================================================
-- pgTAP test: Slice 7 Admin Settings, Bulletin Board, Member Badges
-- ============================================================================
BEGIN;

SELECT plan(8);

SET LOCAL ROLE authenticated;
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

-- Test: settings, bulletin and badge tables exist
SELECT has_table('app_settings');
SELECT has_table('bulletin_posts');
SELECT has_table('bulletin_attachments');
SELECT has_table('member_badges');

-- Setup admin user
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';

-- Test: admin role check works for settings/bulletin/badge management
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: transactional bulk-role function exists
SELECT has_function('admin_bulk_assign_roles');

-- Test: public badge lookup functions exist (anon-safe lookup paths)
SELECT has_function('lookup_badge_by_token');
SELECT has_function('lookup_badge_by_code');

SELECT * FROM finish();
ROLLBACK;
