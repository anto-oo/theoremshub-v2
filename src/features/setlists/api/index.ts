import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const setlistsApi = {
  async list() {
    const { data, error } = await supabase
      .from('setlists')
      .select('*, setlist_songs(id, songs(duration_seconds))')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as (Database['public']['Tables']['setlists']['Row'] & {
      setlist_songs: { id: string; songs: { duration_seconds: number | null } | null }[]
    })[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('setlists')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['setlists']['Insert']) {
    const { data, error } = await supabase
      .from('setlists')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['setlists']['Update']) {
    const { data, error } = await supabase
      .from('setlists')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async archive(id: string) {
    const { data, error } = await supabase
      .from('setlists')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { data, error } = await supabase
      .from('setlists')
      .delete()
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const setlistSongsApi = {
  async listBySetlist(setlistId: string) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .select('*, songs(*)')
      .eq('setlist_id', setlistId)
      .order('position', { ascending: true })
    if (error) throw error
    return data as (Database['public']['Tables']['setlist_songs']['Row'] & {
      songs: Database['public']['Tables']['songs']['Row'] | null
    })[]
  },

  async add(setlistId: string, songId: string, instrumentRoleId: number, position: number) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .insert({ setlist_id: setlistId, song_id: songId, instrument_role_id: instrumentRoleId, position })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .delete()
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updatePosition(id: string, position: number) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .update({ position })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updatePositions(_setlistId: string, positions: { id: string; position: number }[]) {
    const { data, error } = await supabase
      .from('setlist_songs')
      .upsert(positions)
      .select()
    if (error) throw error
    return data
  },
}

export const assignmentsApi = {
  async listBySetlistSong(setlistSongId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('context_type', 'setlist_song')
      .eq('context_id', setlistSongId)
    if (error) throw error
    return data as Database['public']['Tables']['assignments']['Row'][]
  },

  async add(setlistSongId: string, memberId: string, instrumentRoleId: number) {
    const { data, error } = await supabase
      .from('assignments')
      .insert({ context_type: 'setlist_song', context_id: setlistSongId, member_id: memberId, instrument_role_id: instrumentRoleId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { data, error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async listForSongs(setlistSongIds: string[]) {
    if (setlistSongIds.length === 0) return []
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('context_type', 'setlist_song')
      .in('context_id', setlistSongIds)
    if (error) throw error
    return data as Database['public']['Tables']['assignments']['Row'][]
  },

  async listSongLevel(songIds: string[]) {
    if (songIds.length === 0) return []
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('context_type', 'song')
      .in('context_id', songIds)
    if (error) throw error
    return data as Database['public']['Tables']['assignments']['Row'][]
  },
}
