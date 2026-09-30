import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const PAGE_SIZE = 10

export const bulletinApi = {
  async listPage(page: number) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error, count } = await supabase
      .from('bulletin_posts')
      .select('*', { count: 'exact' })
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error
    return { posts: data as Database['public']['Tables']['bulletin_posts']['Row'][], count: count ?? 0 }
  },

  async latest(limit: number) {
    const { data, error } = await supabase
      .from('bulletin_posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as Database['public']['Tables']['bulletin_posts']['Row'][]
  },

  async create(input: Database['public']['Tables']['bulletin_posts']['Insert']) {
    const { data, error } = await supabase.from('bulletin_posts').insert(input).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, input: Database['public']['Tables']['bulletin_posts']['Update']) {
    const { data, error } = await supabase.from('bulletin_posts').update(input).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { error } = await supabase.from('bulletin_posts').delete().eq('id', id)
    if (error) throw error
  },

  async listAttachments(postId: string) {
    const { data, error } = await supabase.from('bulletin_attachments').select('*').eq('post_id', postId)
    if (error) throw error
    return data as Database['public']['Tables']['bulletin_attachments']['Row'][]
  },

  async uploadAttachment(postId: string, file: File) {
    const path = `${postId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('bulletin-attachments').upload(path, file)
    if (uploadError) throw uploadError
    const { data, error } = await supabase
      .from('bulletin_attachments')
      .insert({ post_id: postId, storage_path: path, file_name: file.name })
      .select()
      .single()
    if (error) throw error
    return data
  },

  attachmentUrl(path: string): string {
    const { data } = supabase.storage.from('bulletin-attachments').getPublicUrl(path)
    return data.publicUrl
  },
}
