import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

// Songs API
type SongRow = Database['public']['Tables']['songs']['Row']
type SongInsert = Database['public']['Tables']['songs']['Insert']

function normalize(v: string): string {
  return v.trim().toLowerCase()
}

export function isDuplicateError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const code = (err as { code?: unknown }).code
  return code === '23505'
}

export const songsApi = {
  // Library list: audition picks (is_audition) are excluded.
  // ponytail: filter client-side so the page still works when the
  // is_audition migration hasn't been applied (column missing/NULL).
  async list() {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as SongRow[]).filter(
      (s) => (s as { is_audition?: boolean | null }).is_audition !== true,
    )
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Database['public']['Tables']['songs']['Row']
  },

  // Audition display needs audition-flagged rows by id (list() hides them).
  async getByIds(ids: string[]) {
    if (ids.length === 0) return [] as SongRow[]
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .in('id', ids)
    if (error) throw error
    return data as SongRow[]
  },

  // Reuse an existing non-archived row (by external id, else title+artist)
  // instead of inserting a duplicate. Used by audition apply and quick-add.
  async findExisting(input: { title: string; artist: string; lastfm_id?: string | null; spotify_id?: string | null }) {
    const title = input.title.trim()
    const artist = input.artist.trim()
    if (input.lastfm_id) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('lastfm_id', input.lastfm_id)
        .is('archived_at', null)
        .limit(1)
      if (error) throw error
      if (data.length > 0) return data[0] as SongRow
    }
    if (input.spotify_id) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('spotify_id', input.spotify_id)
        .is('archived_at', null)
        .limit(1)
      if (error) throw error
      if (data.length > 0) return data[0] as SongRow
    }
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .ilike('title', title)
      .ilike('artist', artist)
      .is('archived_at', null)
      .limit(10)
    if (error) throw error
    // ponytail: ilike is pattern-based; confirm exact normalized match client-side
    const match = (data as SongRow[]).find(
      (s) => normalize(s.title) === normalize(title) && normalize(s.artist) === normalize(artist),
    )
    return match ?? null
  },

  async findOrCreate(input: SongInsert) {
    const existing = await songsApi.findExisting({
      title: input.title,
      artist: input.artist,
      lastfm_id: input.lastfm_id ?? null,
      spotify_id: input.spotify_id ?? null,
    })
    if (existing) return existing
    try {
      return await songsApi.create(input)
    } catch (err) {
      // Race: someone inserted the same song concurrently — reuse it.
      if (isDuplicateError(err)) {
        const retry = await songsApi.findExisting({
          title: input.title,
          artist: input.artist,
          lastfm_id: input.lastfm_id ?? null,
          spotify_id: input.spotify_id ?? null,
        })
        if (retry) return retry
      }
      throw err
    }
  },

  async create(input: Database['public']['Tables']['songs']['Insert']) {
    const { data, error } = await supabase
      .from('songs')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['songs']['Update']) {
    const { data, error } = await supabase
      .from('songs')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async archive(id: string) {
    const { data, error } = await supabase
      .from('songs')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
