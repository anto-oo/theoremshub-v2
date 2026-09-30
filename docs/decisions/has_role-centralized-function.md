# Decision: Single `has_role()` Function for All RLS Policies

**Date**: 2025-09-27
**Slice**: 1 (Foundations)

## Problem

The project requires role-based access control across many tables. We could either:
1. Write individual role checks in each RLS policy
2. Create a centralized `has_role(uid, role)` function

## Decision

We chose option 2: a single `public.has_role(uid UUID, role TEXT)` function that queries the `profiles` table and checks if the user has the specified role. This function is used by every RLS policy in the application.

## Rationale

- **Maintainability**: Changes to role logic only need to happen in one place
- **Consistency**: All policies use the same logic, reducing bugs
- **Supabase best practice**: `SECURITY DEFINER` ensures the function runs with elevated privileges
- **Testability**: The function can be tested independently in pgTAP

## Implications

- Every new table must add RLS policies using `public.has_role()`
- The `profiles` table must exist before any other table's RLS can work
- Role changes (e.g., adding a new role) only require updating the `app_role` enum
