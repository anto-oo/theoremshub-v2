import { z } from 'zod'
import { strings as t } from '@/i18n'

export const inventoryItemSchema = z.object({
  name: z.string().min(1, t.validation.nameRequired).max(200),
  category_id: z.number().int().nullable(),
})

export const inventoryCategorySchema = z.object({
  name: z.string().min(1, t.validation.nameRequired).max(100),
})

export const inventorySnapshotSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().uuid(),
    quantity: z.number().int().min(0),
  })),
  note: z.string().optional(),
})
