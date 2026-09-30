# Decision: Participant/Leader Role in Single Join Table

**Date**: 2025-09-27
**Slice**: 4 (Events & Rehearsals)

## Problem

Rehearsals need two distinct participant roles: who's expected to attend (participant) vs. who's leading it (leader). The instinct is to create two separate tables, but this complicates queries and requires joining tables to see all participants.

## Decision

Use a single `rehearsal_participants` table with a `role` column of type `participant_role` enum (`'participant'` or `'leader'`). A member can appear twice (once as participant, once as leader) in the same rehearsal, enforced by the `UNIQUE(rehearsal_id, member_id, role)` constraint.

## Rationale

- **Single query**: All participants and leaders are in one table
- **Flexibility**: A member can be both a participant and a leader
- **Normalization**: Avoids the anti-pattern of "two similar tables"
- **Scalability**: If new roles are needed later, just add enum values

## Implications

- The `rehearsal_participants` table has a composite unique constraint
- The `rehearsal_attendance` table is separate — it tracks availability status, not role
- RLS policies treat both roles the same for visibility

---

# Decision: Attendance Table Separate from Participants

**Date**: 2025-09-27
**Slice**: 4 (Events & Rehearsals)

## Problem

We need to track both who's expected to attend (participants/leaders) and their availability status (available/unavailable/maybe). These are conceptually different: role is a fixed assignment, attendance status can change.

## Decision

Keep `rehearsal_participants` (role assignment) and `rehearsal_attendance` (status) as separate tables with a shared `member_id`. This allows independent updates — a member can be added as a leader without setting their attendance status, and vice versa.

## Rationale

- **Separation of concerns**: Role assignment vs. availability tracking
- **Independent updates**: No cascading updates needed when status changes
- **Historical tracking**: Attendance status can be recorded at different times

## Implications

- Both tables share `rehearsal_id` and `member_id`
- RLS policies are independent for each table
- The UI shows attendance summary (counts per status) separately from participant/leader lists
