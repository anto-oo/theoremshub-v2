import { z } from 'zod'
import { strings as t } from '@/i18n'

export const auditionSchema = z.object({
  title: z.string().min(1, t.validation.titleRequired).max(200),
  description: z.string().optional(),
  date: z.string().min(1, t.validation.dateRequired),
  location: z.string().optional(),
  application_deadline: z.string().min(1, t.validation.deadlineRequired),
  max_applicants: z.number().int().min(1).optional(),
  max_instruments_per_applicant: z.number().int().min(1).max(10).default(3),
  open_instrument_role_ids: z.array(z.number().int()).min(1),
})

export const auditionApplicationSchema = z.object({
  audition_id: z.string().uuid(),
})

export const auditionApplicationInstrumentSchema = z.object({
  instrument_role_id: z.number().int(),
  song_id: z.string().uuid().optional(),
})

// Instrument roles that don't require an audition song (e.g. non-musical ones).
// Compared case-insensitively against the admin-managed instrument_roles name.
export function needsAuditionSong(roleName: string): boolean {
  return roleName.trim().toLowerCase() !== 'altro'
}
