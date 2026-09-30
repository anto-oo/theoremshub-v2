import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export const inventoryApi = {
  async getCategories() {
    const { data, error } = await supabase.from('inventory_categories').select('*').order('name')
    if (error) throw error
    return data as Database['public']['Tables']['inventory_categories']['Row'][]
  },

  async createCategory(name: string) {
    const { data, error } = await supabase.from('inventory_categories').insert({ name }).select().single()
    if (error) throw error
    return data
  },

  async deleteCategory(id: number) {
    const { error } = await supabase.from('inventory_categories').delete().eq('id', id)
    if (error) throw error
  },

  async getItems() {
    const { data, error } = await supabase.from('inventory_items').select('*, inventory_categories(name)').order('name')
    if (error) throw error
    return data
  },

  async createItem(name: string, categoryId: number | null) {
    const { data, error } = await supabase.from('inventory_items').insert({ name, category_id: categoryId }).select().single()
    if (error) throw error
    return data
  },

  async updateItem(id: string, input: { name?: string; category_id?: number | null }) {
    const { data, error } = await supabase.from('inventory_items').update(input).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async deleteItem(id: string) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
  },

  async getSnapshots() {
    const { data, error } = await supabase.from('inventory_snapshots').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as Database['public']['Tables']['inventory_snapshots']['Row'][]
  },

  async getSnapshotItems(snapshotId: string) {
    const { data, error } = await supabase
      .from('inventory_snapshot_items')
      .select('*, inventory_items(name), inventory_categories(name)')
      .eq('snapshot_id', snapshotId)
    if (error) throw error
    return data
  },

  async createSnapshot(items: { item_id: string; quantity: number }[], createdBy: string, note?: string) {
    const { data: snapshot, error: snapError } = await supabase
      .from('inventory_snapshots')
      .insert(note === undefined ? { created_by: createdBy } : { created_by: createdBy, note })
      .select()
      .single()
    if (snapError) throw snapError

    const snapshotItems = items.map(item => ({
      snapshot_id: snapshot.id,
      item_id: item.item_id,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase.from('inventory_snapshot_items').insert(snapshotItems)
    if (itemsError) throw itemsError

    return snapshot
  },
}
