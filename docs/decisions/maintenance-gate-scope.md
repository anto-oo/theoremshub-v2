# Decision: Maintenance gate covers authenticated sessions, public routes stay open

**Date**: 2026-09-28
**Slice**: 7 (Admin Settings, Bulletin Board, Member Badges, Dashboard)

## Problem

The spec says every non-admin user sees a maintenance screen when maintenance
mode is on, while admins keep full access. Taken literally for logged-out
visitors, this would also block the login page — including for admins, who
could then never log in to turn maintenance off.

## Decision

The gate (in `Layout`, polling `app_settings` every 30s) applies only to
authenticated non-admin sessions. Public routes — login, signup, open surveys,
badge verification — stay reachable so an admin can always log in and disable
maintenance.

## Rationale

- Preserves the spec's core guarantee (admins keep full access regardless)
  without creating a lockout state.
- "Instead of the app" is read as the authenticated app shell, not the
  public pages.

## Implications

- Anonymous visitors can still submit open surveys and verify badges during
  maintenance; members see the maintenance screen once logged in.
