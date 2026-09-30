# Decision: Badges resolved through SECURITY DEFINER lookup functions

**Date**: 2026-09-28
**Slice**: 7 (Admin Settings, Bulletin Board, Member Badges, Dashboard)

## Problem

Public badge routes (`/badge/:token`, `/badge` short-code form) must resolve a
token to a member profile without authentication, but the `member_badges`
table must never be listable by anonymous users (tokens would leak).

## Decision

Anonymous access goes exclusively through two SECURITY DEFINER SQL functions,
`lookup_badge_by_token()` and `lookup_badge_by_code()`, each returning at most
one non-revoked badge joined to the member's public name. There is deliberately
no anon SELECT policy on `member_badges`: members read only their own active
badges, admins manage everything, managers have no policy at all.

## Rationale

- A permissive anon SELECT policy (even with an `.eq()` filter client-side)
  would let anyone page through the whole table.
- Functions keep both lookup paths (token, short code) resolving to the same
  public profile view with one code path each.

## Implications

- Revoked badges return nothing from both functions (`revoked_at IS NULL`).
- Short codes are case-insensitive on lookup (`upper(p_code)`); tokens are exact.
