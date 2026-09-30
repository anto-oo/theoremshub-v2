import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const surveysApi = {
  async list() {
    const { data, error } = await supabase.from('surveys').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as Database['public']['Tables']['surveys']['Row'][]
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('surveys').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async create(input: Database['public']['Tables']['surveys']['Insert']) {
    const { data, error } = await supabase.from('surveys').insert(input).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['surveys']['Update']) {
    const { data, error } = await supabase.from('surveys').update(input).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('surveys').delete().eq('id', id)
    if (error) throw error
  },
}

export const surveyResponsesApi = {
  async listBySurvey(surveyId: string) {
    const { data, error } = await supabase.from('survey_responses').select('*').eq('survey_id', surveyId)
    if (error) throw error
    return data as Database['public']['Tables']['survey_responses']['Row'][]
  },

  // Own responses only (RLS: auth.uid() = respondent_id). Used to enforce
  // max_responses_per_user client-side without exposing other respondents.
  async listMine(surveyId: string, userId: string) {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('respondent_id', userId)
    if (error) throw error
    return data as { id: string }[]
  },

  async create(input: Database['public']['Tables']['survey_responses']['Insert']) {
    const { data, error } = await supabase.from('survey_responses').insert(input).select().single()
    if (error) throw error
    return data
  },
}
