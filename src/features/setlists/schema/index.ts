import { z } from 'zod'
import { strings as t } from '@/i18n'

export const songSchema = z.object({
  title: z.string().min(1, t.validation.titleRequired).max(200),
  artist: z.string().min(1, t.validation.artistRequired).max(200),
  album: z.string().max(200).optional(),
  album_art_url: z.string().url().optional(),
  duration_seconds: z.number().int().min(0).optional(),
  spotify_id: z.string().optional(),
  lastfm_id: z.string().optional(),
})

export const setlistSchema = z.object({
  name: z.string().min(1, t.validation.nameRequired).max(200),
  description: z.string().optional(),
  event_date: z.string().optional(),
})

export const setlistSongSchema = z.object({
  song_id: z.string().uuid(),
  instrument_role_id: z.number().int(),
  position: z.number().int().min(0),
})
