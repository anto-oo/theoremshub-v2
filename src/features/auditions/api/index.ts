import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const auditionsApi = {
  async list() {
    const { data, error } = await supabase
      .from('auditions')
      .select('*')
      .is('archived_at', null)
      .order('date', { ascending: true })
    if (error) throw error
    return data as Database['public']['Tables']['auditions']['Row'][]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('auditions')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['auditions']['Insert']) {
    const { data, error } = await supabase
      .from('auditions')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['auditions']['Update']) {
    const { data, error } = await supabase
      .from('auditions')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async archive(id: string) {
    const { data, error } = await supabase
      .from('auditions')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const auditionApplicationsApi = {
  async listByAudition(auditionId: string) {
    const { data, error } = await supabase
      .from('audition_applications')
      .select('*')
      .eq('audition_id', auditionId)
    if (error) throw error
    return data as Database['public']['Tables']['audition_applications']['Row'][]
  },

  async listByApplicant(applicantId: string) {
    // RLS ("Applicants can view own applications") scopes this to own rows.
    const { data, error } = await supabase
      .from('audition_applications')
      .select('*')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Database['public']['Tables']['audition_applications']['Row'][]
  },

  async create(input: Database['public']['Tables']['audition_applications']['Insert']) {
    const { data, error } = await supabase
      .from('audition_applications')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async updateStatus(id: string, status: 'pending' | 'admitted' | 'rejected', responseNotes?: string) {
    const { data, error } = await supabase
      .from('audition_applications')
      .update({ status, response_notes: responseNotes })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async admit(applicationId: string) {
    // Transactional: candidate->user promotion + instrument copy + status flip.
    const { error } = await supabase.rpc('admit_applicant', {
      p_application_id: applicationId,
    })
    if (error) throw error
  },
}

export const auditionInstrumentsApi = {
  async listByAudition(auditionId: string) {
    const { data, error } = await supabase
      .from('audition_instruments')
      .select('*')
      .eq('audition_id', auditionId)
    if (error) throw error
    return data
  },

  async setForAudition(auditionId: string, instrumentRoleIds: number[]) {
    const { error: delError } = await supabase
      .from('audition_instruments')
      .delete()
      .eq('audition_id', auditionId)
    if (delError) throw delError
    if (instrumentRoleIds.length === 0) return []
    const { data, error } = await supabase
      .from('audition_instruments')
      .insert(instrumentRoleIds.map((instrument_role_id) => ({ audition_id: auditionId, instrument_role_id })))
      .select()
    if (error) throw error
    return data
  },
}

export const auditionApplicationInstrumentsApi = {
  async listByApplication(applicationId: string) {
    const { data, error } = await supabase
      .from('audition_application_instruments')
      .select('*')
      .eq('application_id', applicationId)
    if (error) throw error
    return data as Database['public']['Tables']['audition_application_instruments']['Row'][]
  },

  async add(input: Database['public']['Tables']['audition_application_instruments']['Insert']) {
    const { data, error } = await supabase
      .from('audition_application_instruments')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async judge(id: string, decision: 'admitted' | 'rejected') {
    // Transactional: instrument verdict + promotion/instrument copy + derived
    // application status.
    const { error } = await supabase.rpc('judge_audition_instrument', {
      p_application_instrument_id: id,
      p_decision: decision,
    })
    if (error) throw error
  },
}
