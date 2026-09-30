-- ============================================================================
-- pgTAP test: Bulletin author name + content-only updated_at trigger
-- ============================================================================
BEGIN;

SELECT plan(3);

-- Test: denormalized author display name exists (profiles are not
-- readable cross-user under RLS, so posts carry the name)
SELECT has_column('bulletin_posts', 'author_name');

-- Test: content-only updated_at trigger still wired
SELECT has_function('handle_bulletin_updated_at');
SELECT has_trigger('bulletin_posts', 'bulletin_posts_updated_at');

SELECT * FROM finish();
ROLLBACK;
