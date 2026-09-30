import { supabase } from '@/lib/supabase'

export interface PublicBadgeProfile {
  badge_id: string
  member_id: string
  first_name: string | null
  last_name: string | null
  created_at: string
}

export const badgesApi = {
  async listByMember(memberId: string) {
    const { data, error } = await supabase
      .from('member_badges')
      .select('*')
      .eq('member_id', memberId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async listOwn() {
    const { data, error } = await supabase
      .from('member_badges')
      .select('*')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(memberId: string, createdBy: string, adminNote?: string) {
    const { data, error } = await supabase
      .from('member_badges')
      .insert(adminNote === undefined || adminNote === '' ? { member_id: memberId, created_by: createdBy } : { member_id: memberId, created_by: createdBy, admin_note: adminNote })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async revoke(id: string) {
    const { data, error } = await supabase
      .from('member_badges')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async lookupByToken(token: string) {
    const { data, error } = await supabase.rpc('lookup_badge_by_token', { p_token: token })
    if (error) throw error
    const rows = data as PublicBadgeProfile[]
    return rows[0] ?? null
  },

  async lookupByCode(code: string) {
    const { data, error } = await supabase.rpc('lookup_badge_by_code', { p_code: code })
    if (error) throw error
    const rows = data as PublicBadgeProfile[]
    return rows[0] ?? null
  },
}
