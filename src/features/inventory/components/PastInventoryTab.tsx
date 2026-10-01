import { useMemo } from 'react'
import { Archive, ArrowRight } from 'lucide-react'
import { useInventoryItems, useInventorySnapshots, useSnapshotItems } from '@/features/inventory/hooks'
import { diffSnapshots } from '@/features/inventory/lib/snapshotDiff'
import { strings as t } from '@/i18n'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { formatDateTimeIt } from '@/lib/romeTime'
import { Badge } from '@/components/ui/badge'

export default function PastInventoryTab() {
  const { data: snapshots, isLoading } = useInventorySnapshots()
  const { data: items } = useInventoryItems()

  const itemNames = useMemo(() => new Map((items ?? []).map((r: { id: string; name: string }) => [r.id, r.name])), [items])
  const ids = useMemo(() => (snapshots ?? []).map((s) => s.id), [snapshots])

  if (isLoading) return <p className="text-sm text-muted-foreground">{t.common.loading}</p>
  if (ids.length === 0) return <EmptyScreen icon={<Archive size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.inventory.noHistory} />

  return (
    <div className="space-y-3">
      {ids.map((id, idx) => (
        <PastEntry
          key={id}
          snapshotId={id}
          prevSnapshotId={ids[idx + 1] ?? null}
          snapshotLabel={labelOf((snapshots ?? [])[idx] as { created_at: string; note: string | null })}
          itemNames={itemNames}
        />
      ))}
    </div>
  )
}

function labelOf(s: { created_at: string; note: string | null }): string {
  return `${formatDateTimeIt(s.created_at)}${s.note ? ` — ${s.note}` : ''}`
}

function PastEntry({
  snapshotId,
  prevSnapshotId,
  snapshotLabel,
  itemNames,
}: {
  snapshotId: string
  prevSnapshotId: string | null
  snapshotLabel: string
  itemNames: Map<string, string>
}) {
  const { data: curr } = useSnapshotItems(snapshotId)
  const { data: prev } = useSnapshotItems(prevSnapshotId ?? '')

  const currQty = (curr ?? []).map((r: { item_id: string; quantity: number }) => ({ item_id: r.item_id, quantity: r.quantity }))
  const prevQty = prevSnapshotId ? (prev ?? []).map((r: { item_id: string; quantity: number }) => ({ item_id: r.item_id, quantity: r.quantity })) : []
  const diff = diffSnapshots(prevSnapshotId ? prevQty : [], currQty)
  const nameOf = (id: string): string => itemNames.get(id) ?? id

  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
        <div className="inline-flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium">{snapshotLabel}</span>
          <span className="flex gap-2">
            {diff.added.length > 0 && <span className="text-xs text-primary">+{diff.added.length}</span>}
            {diff.removed.length > 0 && <span className="text-xs text-destructive">-{diff.removed.length}</span>}
            {diff.changed.length > 0 && <span className="text-xs text-muted-foreground">~{diff.changed.length}</span>}
            {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
              <span className="text-xs text-muted-foreground">{t.inventory.noChanges}</span>
            )}
          </span>
        </div>
      </summary>
      <div className="border-t px-4 pt-3 pb-4">
        {diff.added.length + diff.removed.length + diff.changed.length > 0 ? (
          <div className="mt-1 space-y-2">
            {diff.added.map((a) => (
              <div key={a.item_id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">{t.inventory.itemAdded}</Badge>
                <span className="font-medium">{nameOf(a.item_id)}</span>
                <span className="text-muted-foreground">×{a.quantity}</span>
              </div>
            ))}
            {diff.removed.map((r) => (
              <div key={r.item_id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">{t.inventory.itemRemoved}</Badge>
                <span className="font-medium">{nameOf(r.item_id)}</span>
                <span className="text-muted-foreground">×{r.quantity}</span>
              </div>
            ))}
            {diff.changed.map((c) => (
              <div key={c.item_id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="border-border bg-accent text-accent-foreground">{t.inventory.quantityChanged}</Badge>
                <span className="font-medium">{nameOf(c.item_id)}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {c.from} <ArrowRight aria-hidden="true" className="h-3 w-3" /> {c.to}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t.inventory.noChanges}</p>
        )}
      </div>
    </details>
  )
}
