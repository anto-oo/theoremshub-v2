# Decision: Username-Based Authentication with @theorems.local Mapping

**Date**: 2025-09-27
**Slice**: 2 (Auth & RBAC, Members, Profile)

## Problem

Users should log in with a username, not an email. Supabase Auth requires an email address, but users should never see or type one.

## Decision

Map username to `{username}@theorems.local` server-side. The `@theorems.local` domain is a synthetic domain that never appears in user-facing forms. The mapping happens in `AuthContext.tsx` in `usernameToEmail()` and `signUp()`/`signIn()` functions. The domain is overridable via `VITE_AUTH_EMAIL_DOMAIN`, but must never change after users exist (the mapped email is stored on the auth user — changing it orphans accounts).

**Required Supabase setting**: `Authentication → Sign In / Sign Ups → Confirm email` must be **OFF**. Supabase validates an address (including DNS) when it attempts to send mail to it, so with confirmations on, signup fails with `Email address "...@theorems.local" is invalid` because the synthetic domain doesn't resolve. Synthetic addresses have no mailbox, so confirmation (and email password recovery) can never work by design.

## Rationale

- **Privacy**: Users never see an email they didn't choose
- **Simplicity**: No need for a separate auth provider
- **Supabase compatibility**: Works with Supabase Auth's email-based flow without modification
- **Security**: The synthetic domain prevents email enumeration attacks since no real emails exist

## Implications

- All auth calls use the synthetic email format
- Profile lookup after auth uses the Supabase user ID, not email
- Password reset flows through the same synthetic email

---

# Decision: useRole()/useCan()/useRouteGuard() Hook Architecture

**Date**: 2025-09-27
**Slice**: 2 (Auth & RBAC, Members, Profile)

## Problem

The app needs to gate sidebar items, action buttons, and routes based on 4 roles. Need a clean API that doesn't duplicate role-checking logic across components.

## Decision

Create three hooks in `src/hooks/useRole.ts`:
- `useRole()`: Returns the current user's `AppRole | null` from profile
- `useCan(permission)`: Returns boolean for permission strings
- `useRouteGuard(config)`: Returns boolean for route access based on allowed roles

`useSidebarItems()` filters the navigation config using `useRole()`.

## Rationale

- **Separation of concerns**: Role logic isolated from UI components
- **Client-side convenience only**: These hooks are for UX gating; actual security is enforced by RLS policies on the database
- **Type safety**: All hooks use the `AppRole` type from the Supabase types

## Implications

- Any new permission or role requires updating the `permissions` map in `useCan()`
- Route guards must be wrapped around lazy-loaded components inside the router config
- Sidebar items are dynamically filtered per user role
