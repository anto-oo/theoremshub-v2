# Decision: Surveys without access codes, JSONB questions, public route outside the shell

**Date**: 2026-09-27
**Slice**: 6 (Inventory & Surveys)

## Problem

Surveys need two modes (open/anonymous via public link, logged-in via
dashboard) with single/multiple-choice questions and per-question min/max,
plus an admin builder with preview and results.

## Decision

- Questions are stored as JSONB on `surveys` (`single_choice` /
  `multiple_choice`, options, `min_select`/`max_select`); answers as JSONB on
  `survey_responses`. No access-code column or table anywhere.
- The public page lives at top-level route `/s/:id`, outside the app shell,
  in a plain white style. Anonymous abuse protection is only a localStorage
  flag (`survey_done_<id>`), explicitly documented as weak.
- Result aggregation (`computeSurveyResults`) and answer validation
  (`validateAnswers`) are pure helpers in
  `src/features/surveys/lib/results.ts`, unit-tested with Vitest.
- Same slice also fixed three shell bugs that blocked end-to-end: added the
  missing `<Outlet />` in `Layout`, moved `AuthProvider` inside the Router
  (so `useNavigate()` works), and added the app-wide `QueryClientProvider`.

## Rationale

- JSONB keeps the builder flexible without a questions/options table split.
- Pure result/validation logic is testable without a database.
- Keeping the public page outside the shell satisfies the plain white
  print-friendly constraint and avoids leaking the sidebar to anonymous users.

## Implications

- RLS allows anyone to read `open` surveys and insert responses to them;
  only admins can read responses or manage surveys.
- `logged_in` surveys are surfaced on the dashboard; they share the same
  public route but carry `respondent_id` when a user is logged in.
