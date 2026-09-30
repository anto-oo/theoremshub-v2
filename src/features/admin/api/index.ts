import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import type { AppRole } from '@/lib/supabase'

export const settingsApi = {
  async get() {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single()
    if (error) throw error
    return data as Database['public']['Tables']['app_settings']['Row']
  },

  async update(input: Database['public']['Tables']['app_settings']['Update']) {
    const { data, error } = await supabase.from('app_settings').update(input).eq('id', 1).select().single()
    if (error) throw error
    return data
  },
}

export const instrumentsApi = {
  async list() {
    const { data, error } = await supabase
      .from('instrument_roles')
      .select('id, name, display_order')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return data
  },

  async create(name: string) {
    const { data, error } = await supabase
      .from('instrument_roles')
      .insert({ name: name.trim() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: number) {
    const { error } = await supabase.from('instrument_roles').delete().eq('id', id)
    if (error) throw error
  },
}

export const memberInstrumentsApi = {
  async listIds(memberId: string) {
    const { data, error } = await supabase
      .from('member_instruments')
      .select('instrument_role_id, is_primary')
      .eq('member_id', memberId)
    if (error) throw error
    return data
  },

  // Replace the member's instruments in one shot (admin manage dialog).
  async set(memberId: string, instrumentIds: number[], primaryId: number | null) {
    const { error: delError } = await supabase.from('member_instruments').delete().eq('member_id', memberId)
    if (delError) throw delError
    if (instrumentIds.length === 0) return
    const { error: insError } = await supabase.from('member_instruments').insert(
      instrumentIds.map((instrument_role_id) => ({
        member_id: memberId,
        instrument_role_id,
        is_primary: primaryId !== null && instrument_role_id === primaryId,
      })),
    )
    if (insError) throw insError
  },
}

export const membersAdminApi = {
  async list() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, role, member_number, classe')
      .order('member_number', { ascending: true })
    if (error) throw error
    return data
  },

  async update(id: string, patch: Database['public']['Tables']['profiles']['Update']) {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { targetUserId: id },
    })
    if (error) throw error
  },

  // Temporary password via the manage-password Edge Function (service-role, admin-only).
  async setTemporaryPassword(memberId: string, password: string) {
    const { data, error } = await supabase.functions.invoke('manage-password', {
      body: { action: 'reset', userId: memberId, newPassword: password },
    })
    if (error) throw error
    if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
      throw new Error((data as { error: string }).error)
    }
  },

  // Single transactional call: the ONLY bulk action in the app.
  async bulkAssignRoles(userIds: string[], role: AppRole) {
    const { data, error } = await supabase.rpc('admin_bulk_assign_roles', {
      p_user_ids: userIds,
      p_role: role,
    })
    if (error) throw error
    return data as number
  },
}
