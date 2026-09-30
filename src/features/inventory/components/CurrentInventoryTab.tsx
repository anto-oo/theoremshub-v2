import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useCreateInventoryItem,
  useCreateSnapshot,
  useInventoryCategories,
  useInventoryItems,
  useInventorySnapshots,
  useSnapshotItems,
} from '@/features/inventory/hooks'
import CreateInventoryDialog from '@/features/inventory/components/CreateInventoryDialog'
import GenerateInventoryPdfDialog from '@/features/inventory/components/GenerateInventoryPdfDialog'
import {
  generateInventoryPdf,
  loadPdfSettings,
  type InventoryPdfData,
} from '@/features/inventory/lib/generateInventoryPdf'
import { strings as t } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface ItemRow {
  id: string
  name: string
  category_id: number | null
  inventory_categories: { name: string } | { name: string }[] | null
}

function categoryNameOf(row: ItemRow): string {
  const c = row.inventory_categories
  if (!c) return ''
  return Array.isArray(c) ? (c[0]?.name ?? '') : c.name
}

export default function CurrentInventoryTab() {
  const { user } = useAuth()
  const isAdmin = useRole() === 'admin'

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfPending, setPdfPending] = useState(false)

  const { data: items, isLoading } = useInventoryItems()
  const { data: categories } = useInventoryCategories()
  const { data: snapshots } = useInventorySnapshots()
  const latestId = snapshots?.[0]?.id ?? ''
  const { data: latestItems } = useSnapshotItems(latestId)
  const createSnapshot = useCreateSnapshot()
  const createItem = useCreateInventoryItem()

  const rows: ItemRow[] = useMemo(() => (Array.isArray(items) ? (items as ItemRow[]) : []), [items])

  const currentQty = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of (latestItems ?? []) as { item_id: string; quantity: number }[]) map.set(r.item_id, r.quantity)
    return map
  }, [latestItems])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filterCategory === 'uncategorized' ? r.category_id !== null : filterCategory !== 'all' && String(r.category_id) !== filterCategory) return false
      if (q !== '' && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, filterCategory])

  const handleSaveSnapshot = async (
    drafts: { item_id: string | null; name: string; quantity: number; category_id: number | null }[],
    note: string,
  ): Promise<void> => {
    if (!user) return
    const snapshotItems: { item_id: string; quantity: number }[] = []
    for (const d of drafts) {
      let id = d.item_id
      if (id === null) {
        const created = (await createItem.mutateAsync({ name: d.name, category_id: d.category_id })) as { id: string }
        id = created.id
      }
      snapshotItems.push({ item_id: id, quantity: d.quantity })
    }
    await createSnapshot.mutateAsync({
      items: snapshotItems,
      createdBy: user,
      ...(note === '' ? {} : { note }),
    })
    setCreateOpen(false)
  }

  const handleGeneratePdf = async (form: InventoryPdfData): Promise<void> => {
    if (filtered.length === 0) return
    setPdfPending(true)
    try {
      await generateInventoryPdf(
        filtered.map((r) => ({ name: r.name, quantity: currentQty.get(r.id) ?? 0 })),
        form,
        loadPdfSettings(),
      )
      setPdfOpen(false)
    } finally {
      setPdfPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {rows.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setPdfOpen(true)}>
            {t.inventory.generatePdf}
          </Button>
        )}
        {isAdmin && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />{t.inventory.createInventory}
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterCategory}
            onValueChange={setFilterCategory}
            options={[
              { value: 'all', label: t.inventory.allCategories },
              { value: 'uncategorized', label: t.inventory.uncategorized },
              ...((categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))),
            ]}
            aria-label={t.inventory.category}
            className="w-full sm:w-[200px]"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : filtered.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">{t.inventory.name}</th>
                  <th className="p-2">{t.inventory.category}</th>
                  <th className="w-32 p-2 text-center">{t.inventory.quantity}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">
                      {categoryNameOf(r) === '' ? (
                        <Badge variant="outline" className="text-muted-foreground">{t.inventory.uncategorized}</Badge>
                      ) : (
                        <Badge variant="secondary">{categoryNameOf(r)}</Badge>
                      )}
                    </td>
                    <td className="p-2 text-center">{currentQty.get(r.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{r.name}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {categoryNameOf(r) === '' ? (
                      <Badge variant="outline" className="text-muted-foreground">{t.inventory.uncategorized}</Badge>
                    ) : (
                      <Badge variant="secondary">{categoryNameOf(r)}</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {t.inventory.quantity}: <span className="font-semibold text-foreground">{currentQty.get(r.id) ?? 0}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : rows.length > 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t.common.noResults}</p>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">{t.inventory.noItems}</p>
      )}

      {isAdmin && (
        <CreateInventoryDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          currentItems={rows.map((r) => ({ item_id: r.id, name: r.name, quantity: currentQty.get(r.id) ?? 0, category_id: r.category_id }))}
          categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
          onSave={handleSaveSnapshot}
          isPending={createSnapshot.isPending || createItem.isPending}
        />
      )}

      <GenerateInventoryPdfDialog open={pdfOpen} onOpenChange={setPdfOpen} onGenerate={handleGeneratePdf} isPending={pdfPending} />
    </div>
  )
}
