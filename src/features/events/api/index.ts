import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const eventsApi = {
  async list() {
    const { data, error } = await supabase.from('events').select('*').is('archived_at', null).order('date', { ascending: true })
    if (error) throw error
    return data as Database['public']['Tables']['events']['Row'][]
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['events']['Insert']) {
    const { data, error } = await supabase.from('events').insert(input).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['events']['Update']) {
    const { data, error } = await supabase.from('events').update(input).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async archive(id: string) {
    const { data, error } = await supabase.from('events').update({ archived_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { data, error } = await supabase.from('events').delete().eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

export const eventSetlistsApi = {
  async listAll() {
    const { data, error } = await supabase.from('event_setlists').select('event_id, setlist_id')
    if (error) throw error
    return data
  },
  async listByEvent(eventId: string) {
    const { data, error } = await supabase.from('event_setlists').select('*').eq('event_id', eventId)
    if (error) throw error
    return data
  },

  async add(eventId: string, setlistId: string) {
    const { data, error } = await supabase.from('event_setlists').insert({ event_id: eventId, setlist_id: setlistId }).select().single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { data, error } = await supabase.from('event_setlists').delete().eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async saveForEvent(eventId: string, setlistIds: string[]) {
    const { error: delError } = await supabase.from('event_setlists').delete().eq('event_id', eventId)
    if (delError) throw delError
    if (setlistIds.length === 0) return
    const { error } = await supabase
      .from('event_setlists')
      .insert(setlistIds.map((setlist_id) => ({ event_id: eventId, setlist_id })))
    if (error) throw error
  },
}

export const rehearsalsApi = {
  async list() {
    const { data, error } = await supabase.from('rehearsals').select('*').is('archived_at', null).order('start_time', { ascending: true })
    if (error) throw error
    return data as Database['public']['Tables']['rehearsals']['Row'][]
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('rehearsals').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['rehearsals']['Insert']) {
    const { data, error } = await supabase.from('rehearsals').insert(input).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['rehearsals']['Update']) {
    const { data, error } = await supabase.from('rehearsals').update(input).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async archive(id: string) {
    const { data, error } = await supabase.from('rehearsals').update({ archived_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

export const rehearsalAttendanceApi = {
  async listByRehearsal(rehearsalId: string) {
    const { data, error } = await supabase.from('rehearsal_attendance').select('*').eq('rehearsal_id', rehearsalId)
    if (error) throw error
    return data
  },

  async upsert(input: Database['public']['Tables']['rehearsal_attendance']['Insert']) {
    const { data, error } = await supabase.from('rehearsal_attendance').upsert(input).select().single()
    if (error) throw error
    return data
  },
}

export const rehearsalParticipantsApi = {
  async listByRehearsal(rehearsalId: string) {
    const { data, error } = await supabase.from('rehearsal_participants').select('*').eq('rehearsal_id', rehearsalId)
    if (error) throw error
    return data
  },

  async add(rehearsalId: string, memberId: string, role: 'participant' | 'leader') {
    const { data, error } = await supabase.from('rehearsal_participants').insert({ rehearsal_id: rehearsalId, member_id: memberId, role }).select().single()
    if (error) throw error
    return data
  },
}
