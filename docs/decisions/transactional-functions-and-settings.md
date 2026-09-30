# Decision: Transactional SQL Functions for Approval and Admission

**Date**: 2025-09-27
**Slice**: 5 (Proposals & Auditions)

## Problem

Approving a song proposal must both mark the proposal as approved AND create the corresponding song record. Admitting an audition applicant must both upgrade their role from candidate to user AND insert their instruments into member_instructions. Splitting these into separate client-side calls risks partial failure — an approved proposal with no song, or an admitted applicant with no instruments.

## Decision

Implement two `SECURITY DEFINER` SQL functions:
1. `approve_proposal(p_proposal_id, p_associated_event_id)` — inserts into `songs`, updates `song_proposals.status` to 'approved'
2. `admit_applicant(p_application_id)` — updates `profiles.role` to 'user', inserts into `member_instruments`, updates `audition_applications.status` to 'admitted'

Plus per-instrument verdicts (`audition_application_instruments.status`):
3. `judge_audition_instrument(p_application_instrument_id, p_decision)` — flips one instrument to 'admitted'/'rejected', promotes candidate->user + copies that instrument on admission, then derives the application status (pending while any instrument is pending, admitted if any admitted, rejected when all rejected). Unlike `admit_applicant`, it checks the admin/manager role internally since the client calls it directly.

Both run in a single transaction. If any step fails, the entire operation rolls back.

## Rationale

- **Atomicity**: No orphaned records from partial failures
- **Security**: `SECURITY DEFINER` ensures the function runs with elevated privileges
- **Simplicity**: Client calls one function instead of orchestrating multiple mutations
- **Consistency**: Same pattern used for both approval and admission flows

## Implications

- Client code calls `supabase.rpc('approve_proposal', { ... })` instead of multiple `.update()`/`.insert()` calls
- The functions are idempotent — calling twice has no additional effect
- Error messages are descriptive for debugging

---

# Decision: Proposal Settings as Single-Row Table

**Date**: 2025-09-27
**Slice**: 5 (Proposals & Auditions)

## Problem

Global proposal settings (open/closed, submission window, max per user) need to be stored somewhere. Options: a dedicated single-row table, a JSONB column in a shared settings table, or hardcoded values.

## Decision

Use a dedicated `proposal_settings` table with `CHECK (id = 1)` to enforce a single row. This is simpler than a shared settings table and more structured than hardcoding.

## Rationale

- **Simplicity**: One row, one purpose — no need for a generic key-value store
- **Type safety**: Each column has a proper type (boolean, timestamptz, integer)
- **Enforcement**: The CHECK constraint guarantees only one row exists
- **Admin-only**: RLS restricts all access to admin role

## Implications

- The table always has exactly one row (id=1)
- Settings are updated via `UPDATE ... WHERE id = 1`
- No need for INSERT — the row is seeded in the migration
