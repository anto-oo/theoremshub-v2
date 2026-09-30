# TheoremHub v2

Band management platform built with React, Vite, TypeScript, and Supabase.

## Features Checklist

| Slice | Feature | Status |
|-------|---------|--------|
| 1 | Foundations (repo, CI, schema skeleton, auth, roles, app shell) | ✅ Done |
| 2 | Auth & RBAC, Members, Profile | ✅ Done |
| 3 | Songs & Setlists | ✅ Done |
| 4 | Events & Rehearsals | ✅ Done |
| 5 | Proposals & Auditions | ✅ Done |
| 6 | Inventory & Surveys | ✅ Done |
| 7 | Admin Settings, Bulletin Board, Member Badges, Dashboard | ✅ Done |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Supabase CLI (`npm install -g supabase`)

### Local Development

```bash
# Install dependencies
npm install

# Start Supabase local development instance
npm run supabase:start

# Run the dev server
npm run dev

# Apply migrations
npm run supabase:migrate

# Seed the database
npm run supabase:seed
```

### Running Migrations

```bash
# Generate a new migration from local schema
npm run supabase:migrate

# Reset local database and re-apply migrations
npm run supabase:reset

# Push local migrations to staging/production
supabase db push
```

### Running RLS Tests (pgTAP)

RLS tests live in `supabase/tests/` (never in `supabase/migrations/` —
files there are applied as real migrations by `db push`, and pgTAP helpers
like `plan()` don't exist outside the pgTAP extension):

```bash
# Start the local stack first, then run all pgTAP tests
npm run supabase:start
supabase test db
```

### Useful Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # Run oxlint
npm run typecheck    # TypeScript check
npm run test         # Run Vitest tests
npm run test:watch   # Run Vitest in watch mode
npm run format       # Format with Prettier
```

## Architecture

- **Frontend**: React + Vite + TypeScript (strict mode) + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **State**: TanStack Query for server state, React Context for auth
- **Forms**: react-hook-form + Zod
- **Testing**: Vitest + @testing-library/react
- **CI**: GitHub Actions

## Code Structure

```
src/
  features/<name>/        # Feature-based modules (api, hooks, components, pages, schema)
  shared/                 # Cross-cutting UI and utilities
  contexts/               # React contexts (auth)
  layouts/                # App layout components
  pages/                  # Top-level pages
  lib/                    # Supabase client, utilities
  test/                   # Test setup
```

## Database Workflow

- All schema changes are in `supabase/migrations/` as versioned SQL files
- Every migration has a SQL comment explaining its purpose
- RLS is enabled on every table with policies using `has_role(uid, role)`
- Each RLS policy has a pgTAP test in `supabase/tests/` (run with `supabase test db`)
- TypeScript types are generated from the schema

## Decisions

See `docs/decisions/` for technical decisions made during development.

### Slice 2 Notes

- **Username-based auth**: Users log in with username; mapped to `{username}@theorems.local` internally
- **Role hierarchy**: admin > manager > user > candidate
- **useRole() hook**: Returns the current user's role from profile; used by `useCan()` for permission checks and `useSidebarItems()` for navigation filtering
- **useCan() hook**: Returns boolean for permission strings (e.g., `manage_members`, `reset_password`)
- **Route guards**: `RoleGuard` requires any authenticated user; `AdminGuard` requires admin role
- **Edge Functions**: `manage-password` (self-service + admin reset) and `delete-user` (admin hard-delete) use service-role key
- **4 roles**: admin, manager, user, candidate (replaces previous admin/manager/member/viewer)
- **Instrument tables**: `instrument_roles` (admin-managed) and `member_instruments` (member-to-instrument mapping with primary flag)
- **Profile fields**: first_name, last_name, classe, username, member_number (incremental int, never exposed in URLs)
- **Self-registration**: Anyone can sign up, auto-assigned `candidate` role, auto-confirmed

### Slice 6 Notes

- **Inventory snapshot model**: quantities live only in immutable `inventory_snapshot_items` rows; the UI derives current state from the latest snapshot, never from a mutable quantity column
- **Inventory access**: manager reads + exports PDF; only admin creates/edits/deletes items and categories; no password gate anywhere
- **Surveys**: no access codes; `open` surveys are anonymous via public `/s/:id` link (localStorage flag only as weak anti-abuse), `logged_in` surveys are listed on the dashboard
- **Survey questions**: stored as JSONB (`single_choice` / `multiple_choice` with per-question min/max); admin builder with preview, publish/close/reopen, results with per-option percentage bars, copy-link for open surveys

### Slice 7 Notes

- **Bulk roles**: `admin_bulk_assign_roles()` SQL function is the single transactional call and the ONLY bulk action in the app — no generic bulk-action pattern
- **Login banner**: fields on `app_settings`, shown on the login page when enabled and unexpired
- **Maintenance mode**: boolean on `app_settings`, polled every 30s; gates authenticated non-admin sessions only, so admins can always log in to disable it; public routes stay reachable
- **Bulletin**: admin-only posts with role targeting (`visible_roles`), pinned-first ordering, paginated list, attachments in the `bulletin-attachments` Storage bucket
- **Badges**: `member_badges` with opaque `qr_token` + 6-char `short_code` as independent lookup paths via SECURITY DEFINER functions (anon can never list tokens); revoke via `revoked_at`, never hard delete; QR rendered client-side; admin UI inside member management, manager has zero access; public `/badge/:token` and `/badge` linked from login
- **Dashboard**: Realtime-driven counts (songs, setlists, proposals, rehearsals), latest bulletin widget, open logged-in surveys, assigned songs + unanswered upcoming rehearsals
