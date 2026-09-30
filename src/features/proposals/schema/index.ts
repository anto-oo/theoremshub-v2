import { z } from 'zod'
import { strings as t } from '@/i18n'

export const proposalSchema = z.object({
  title: z.string().min(1, t.validation.titleRequired).max(200),
  artist: z.string().min(1, t.validation.artistRequired).max(200),
  spotify_id: z.string().optional(),
  lastfm_id: z.string().optional(),
  album: z.string().max(200).optional(),
  album_art_url: z.string().url().optional(),
  duration_seconds: z.number().int().min(0).optional(),
  reason: z.string().optional(),
})

export const proposalCommentSchema = z.object({
  content: z.string().min(1, t.validation.commentRequired).max(1000),
})

export const proposalSettingsSchema = z.object({
  proposals_open: z.boolean(),
  submission_window_start: z.string().optional(),
  submission_window_end: z.string().optional(),
  max_proposals_per_user: z.number().int().min(1).max(50),
})
