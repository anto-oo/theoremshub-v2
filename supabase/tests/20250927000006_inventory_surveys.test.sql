-- ============================================================================
-- pgTAP test: Slice 6 Inventory & Surveys RLS policies
-- ============================================================================
BEGIN;

SELECT plan(6);

SET LOCAL ROLE authenticated;
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000001';

-- Test: Anyone can view inventory items
SELECT has_table('inventory_items');

-- Test: Anyone can view surveys
SELECT has_table('surveys');

-- Test: Anyone can view survey_responses
SELECT has_table('survey_responses');

-- Setup admin user
SET LOCAL jwt.uid = '00000000-0000-0000-0000-000000000003';
SET LOCAL jwt.claims.role = 'admin';

-- Test: Admin can insert inventory items
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin can insert surveys
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

-- Test: Admin can view all responses
SELECT public.has_role('00000000-0000-0000-0000-000000000003', 'admin');

SELECT * FROM finish();
ROLLBACK;
