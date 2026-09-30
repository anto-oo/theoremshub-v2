# Decision: Inventory snapshot model instead of mutable quantities

**Date**: 2026-09-27
**Slice**: 6 (Inventory & Surveys)

## Problem

Inventory quantities change often and the spec requires a full history view
(added / removed / changed between consecutive states) plus PDF export of the
current state.

## Decision

Quantities are stored only in immutable `inventory_snapshot_items` rows grouped
under an `inventory_snapshots` header. Saving new quantities always inserts a
new snapshot; nothing ever updates a quantity in place. The UI derives the
"current state" from the newest snapshot, and the history view diffs
consecutive snapshots with the pure `diffSnapshots()` helper
(`src/features/inventory/lib/snapshotDiff.ts`), rendered as collapsible
`<details>` entries.

## Rationale

- History falls out of the model for free: every state transition is a stored row.
- Diffing is a pure function, unit-tested with Vitest, independent of Supabase.
- No password gate: role-based access (manager read/export, admin write) is enough.

## Implications

- `createSnapshot` must write the header plus all item rows; callers pass the
  full quantity map each time.
- No snapshot deletion UI: snapshots are append-only by design.
