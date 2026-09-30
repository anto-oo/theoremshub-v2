import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { AddDialog } from '@/shared/components/AddDialog'
import { strings as t } from '@/i18n'

export interface DraftInventoryItem {
  key: string
  item_id: string | null
  name: string
  quantity: number
  category_id: number | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentItems: { item_id: string | null; name: string; quantity: number; category_id: number | null }[]
  categories: { id: number; name: string }[]
  onSave: (items: { item_id: string | null; name: string; quantity: number; category_id: number | null }[], note: string) => void
  isPending: boolean
}

let keyCounter = 0
const nextKey = (): string => `item-${++keyCounter}`

export default function CreateInventoryDialog({ open, onOpenChange, currentItems, categories, onSave, isPending }: Props) {
  const [items, setItems] = useState<DraftInventoryItem[]>([])
  const [note, setNote] = useState('')

  const handleOpenChange = (isOpen: boolean): void => {
    if (isOpen) {
      setItems(
        currentItems.length > 0
          ? currentItems.map((item) => ({ ...item, key: nextKey() }))
          : [{ key: nextKey(), item_id: null, name: '', quantity: 1, category_id: null }],
      )
      setNote('')
    }
    onOpenChange(isOpen)
  }

  const validItems = items.filter((i) => i.name.trim() !== '')

  return (
    <AddDialog open={open} onOpenChange={handleOpenChange} title={t.inventory.createInventory} className="max-w-xl">
      <p className="text-sm text-muted-foreground">{t.inventory.createInventoryDescription}</p>
      <div className="mt-3 space-y-3">
        {items.map((item, idx) => (
          <div key={item.key} className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm text-muted-foreground">{idx + 1}</span>
              <Input
                placeholder={t.inventory.name}
                value={item.name}
                onChange={(e) => setItems((all) => all.map((i) => (i.key === item.key ? { ...i, name: e.target.value } : i)))}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="shrink-0 text-destructive"
                aria-label={t.common.delete}
                onClick={() => setItems((all) => all.filter((i) => i.key !== item.key))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <div className="flex gap-2 pl-8">
              <Select
                value={item.category_id === null ? '' : String(item.category_id)}
                onValueChange={(v) =>
                  setItems((all) => all.map((i) => (i.key === item.key ? { ...i, category_id: v === '' ? null : Number(v) } : i)))
                }
                options={[
                  { value: '', label: `— ${t.inventory.uncategorized}` },
                  ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
                aria-label={t.inventory.category}
                className="min-w-0 flex-1"
              />
              <Input
                type="number"
                min={0}
                placeholder={t.inventory.quantity}
                value={item.quantity}
                onChange={(e) =>
                  setItems((all) => all.map((i) => (i.key === item.key ? { ...i, quantity: Number(e.target.value) || 0 } : i)))
                }
                className="w-20 shrink-0"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        onClick={() => setItems((all) => [...all, { key: nextKey(), item_id: null, name: '', quantity: 1, category_id: null }])}
      >
        <Plus aria-hidden="true" />{t.inventory.addItem}
      </Button>

      <div className="mt-4 space-y-2">
        <Label htmlFor="inventory-snapshot-note">{t.inventory.notes}</Label>
        <textarea
          id="inventory-snapshot-note"
          placeholder={t.inventory.snapshotNotes}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">{validItems.length}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button
            type="button"
            disabled={validItems.length === 0 || isPending}
            onClick={() =>
              onSave(
                validItems.map(({ item_id, name, quantity, category_id }) => ({ item_id, name: name.trim(), quantity, category_id })),
                note.trim(),
              )
            }
          >
            {t.common.save}
          </Button>
        </div>
      </div>
    </AddDialog>
  )
}
