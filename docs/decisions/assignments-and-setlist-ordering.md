# Decision: Assignments Model — Single Current-State Table + Append-Only History

**Date**: 2025-09-27
**Slice**: 3 (Songs & Setlists)

## Problem

The previous v1 implementation split assignment logic across three tables: `song_assignments`, `song_member_assignments`, and `assignment_history`. This made querying "who plays what" complex and error-prone.

## Decision

Replace with two clean tables:
1. **`assignments`** — Current-state table keyed by `(context_type, context_id, instrument_role_id, member_id)`. `context_type` is either `'song'` (a song directly, outside a setlist) or `'setlist_song'` (a song within a specific setlist).
2. **`assignment_history`** — Append-only log recording every change: `assignment_id`, `action` ('assign', 'unassign', 'reassign'), `assigner_id`, `created_at`.

## Rationale

- **Simplicity**: One table to query for current assignments, regardless of context
- **Auditability**: Full history trail showing who assigned whom and when
- **Context flexibility**: A song can have different assignments in different setlists
- **Normalization**: Avoids the fan-out problem of the v1 three-table design

## Implications

- The `assignments` table uses a composite unique constraint to prevent duplicate assignments
- The `assignment_history` table uses `ON DELETE CASCADE` so history is preserved when an assignment is removed
- Public routes (badges, etc.) use UUID identifiers, never the incremental `member_number`

---

# Decision: setlist_songs Position Column for @dnd-kit Ordering

**Date**: 2025-09-27
**Slice**: 3 (Songs & Setlists)

## Problem

Songs within a setlist need to be reorderable via drag-and-drop (@dnd-kit). The order must persist and be efficiently queryable.

## Decision

Add an integer `position` column to the `setlist_songs` join table. @dnd-kit provides the new order, and the API updates positions via `updatePositions` using `upsert`.

## Rationale

- **Simple**: Integer position is the most straightforward approach
- **Efficient**: Index on `(setlist_id, position)` enables fast ordered queries
- **@dnd-kit compatible**: The library returns an ordered list that maps directly to position integers
- **One-time copy**: Importing assignments from another setlist creates new `setlist_songs` rows with copied positions, not a live link

## Implications

- `position` starts at 0 and increments by 1
- Reordering requires updating all affected positions in a single transaction
- The total duration of a setlist is calculated client-side by summing song durations
