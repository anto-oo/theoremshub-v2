import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const proposalsApi = {
  async list() {
    const { data, error } = await supabase
      .from('song_proposals')
      .select('*, proposal_comments(count)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('song_proposals')
      .select('*, proposal_comments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['song_proposals']['Insert']) {
    const { data, error } = await supabase
      .from('song_proposals')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    if (status === 'approved') return this.approve(id)
    const { data, error } = await supabase
      .from('song_proposals')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Approving must also create the song — via the transactional
  // approve_proposal() rpc, not a direct status update (which leaves no song).
  // Direct rpc, same as audition admit_applicant() — see docs/decisions.
  async approve(id: string) {
    const { data, error } = await supabase.rpc('approve_proposal', {
      p_proposal_id: id,
      p_associated_event_id: null,
    })
    if (error) throw error
    return data
  },

  async archive(id: string) {
    const { data, error } = await supabase
      .from('song_proposals')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const proposalCommentsApi = {
  async listByProposal(proposalId: string) {
    const { data, error } = await supabase
      .from('proposal_comments')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['proposal_comments']['Insert']) {
    const { data, error } = await supabase
      .from('proposal_comments')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const proposalSettingsApi = {
  async get() {
    const { data, error } = await supabase
      .from('proposal_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) throw error
    return data
  },

  async update(input: Database['public']['Tables']['proposal_settings']['Update']) {
    const { data, error } = await supabase
      .from('proposal_settings')
      .update(input)
      .eq('id', 1)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
