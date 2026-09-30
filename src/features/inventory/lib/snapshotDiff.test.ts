import { describe, expect, it } from 'vitest'
import { diffSnapshots } from './snapshotDiff'

describe('diffSnapshots', () => {
  it('detects added, removed and changed quantities', () => {
    const diff = diffSnapshots(
      [
        { item_id: 'a', quantity: 2 },
        { item_id: 'b', quantity: 1 },
        { item_id: 'c', quantity: 5 },
      ],
      [
        { item_id: 'a', quantity: 3 },
        { item_id: 'c', quantity: 5 },
        { item_id: 'd', quantity: 4 },
      ],
    )
    expect(diff.added).toEqual([{ item_id: 'd', quantity: 4 }])
    expect(diff.removed).toEqual([{ item_id: 'b', quantity: 1 }])
    expect(diff.changed).toEqual([{ item_id: 'a', from: 2, to: 3 }])
  })

  it('returns empty diff for identical snapshots', () => {
    const qty = [{ item_id: 'a', quantity: 1 }]
    expect(diffSnapshots(qty, qty)).toEqual({ added: [], removed: [], changed: [] })
  })

  it('handles empty previous snapshot as all added', () => {
    const diff = diffSnapshots([], [{ item_id: 'a', quantity: 1 }])
    expect(diff.added).toHaveLength(1)
    expect(diff.removed).toHaveLength(0)
    expect(diff.changed).toHaveLength(0)
  })
})
