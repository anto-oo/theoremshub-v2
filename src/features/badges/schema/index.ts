import { z } from 'zod'
import { strings as t } from '@/i18n'

export const badgeSchema = z.object({
  member_id: z.string().uuid(),
  admin_note: z.string().max(500).optional(),
})

export const shortCodeSchema = z.object({
  code: z
    .string()
    .length(6, t.validation.codeLength)
    .regex(/^[A-Za-z0-9]{6}$/, t.validation.codeAlphanum),
})
