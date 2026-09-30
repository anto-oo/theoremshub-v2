import { z } from 'zod'
import { strings as t } from '@/i18n'

export const bulletinPostSchema = z.object({
  title: z.string().min(1, t.validation.requiredTitle).max(200),
  body: z.string().max(5000),
  pinned: z.boolean(),
  visible_roles: z.array(z.enum(['admin', 'manager', 'user', 'candidate'])).min(1),
})
