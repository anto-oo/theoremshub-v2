export interface SnapshotQty {
  item_id: string
  quantity: number
}

export interface ChangedQty {
  item_id: string
  from: number
  to: number
}

export interface SnapshotDiff {
  added: SnapshotQty[]
  removed: SnapshotQty[]
  changed: ChangedQty[]
}

// Diff between two consecutive snapshots (prev -> curr), keyed by item_id.
export function diffSnapshots(prev: SnapshotQty[], curr: SnapshotQty[]): SnapshotDiff {
  const prevMap = new Map(prev.map((p) => [p.item_id, p.quantity]))
  const currMap = new Map(curr.map((c) => [c.item_id, c.quantity]))

  const added: SnapshotQty[] = []
  const removed: SnapshotQty[] = []
  const changed: ChangedQty[] = []

  for (const [item_id, quantity] of currMap) {
    if (!prevMap.has(item_id)) {
      added.push({ item_id, quantity })
    } else {
      const from = prevMap.get(item_id) as number
      if (from !== quantity) changed.push({ item_id, from, to: quantity })
    }
  }

  for (const [item_id, quantity] of prevMap) {
    if (!currMap.has(item_id)) removed.push({ item_id, quantity })
  }

  return { added, removed, changed }
}
