import { z } from 'zod'
import { strings as t } from '@/i18n'

export const bannerSchema = z.object({
  login_banner_enabled: z.boolean(),
  login_banner_message: z.string().max(500),
  login_banner_type: z.enum(['info', 'warning', 'success', 'destructive']),
  login_banner_expires_at: z.string().nullable().optional(),
})

export const maintenanceSchema = z.object({
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().max(500),
})

export const bulkRoleSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, t.validation.selectAtLeastOneUser),
  role: z.enum(['admin', 'manager', 'user', 'candidate']),
})

export const updateMemberSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['admin', 'manager', 'user', 'candidate']).optional(),
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  classe: z.string().max(50).nullable().optional(),
})
