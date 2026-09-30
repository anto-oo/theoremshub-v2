// ============================================================================
// Edge Function: create-snapshot
// Purpose: Create an inventory snapshot + its items atomically.
// Why server-side: client does two anon-key calls (snapshots.insert then
// snapshot_items.insert[]); if the second fails it leaves an orphan empty
// snapshot. RLS has no multi-table atomicity. On items failure the
// function deletes the snapshot header (rollback).
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return json({ error: 'Admin only' }, 403)

  let items: { item_id: string; quantity: number }[] = []
  let note: string | null = null
  try {
    const body = await req.json()
    items = body?.items ?? []
    note = body?.note ?? null
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!Array.isArray(items) || items.length === 0) {
    return json({ error: 'items must be a non-empty array' }, 400)
  }
  if (items.some((i) => !i.item_id || !Number.isInteger(i.quantity) || i.quantity < 0)) {
    return json({ error: 'Each item needs item_id and quantity >= 0' }, 400)
  }

  const { data: snapshot, error: snapError } = await supabaseAdmin
    .from('inventory_snapshots')
    .insert({ created_by: user.id, note })
    .select()
    .single()
  if (snapError || !snapshot) return json({ error: 'Failed to create snapshot' }, 500)

  const { error: itemsError } = await supabaseAdmin
    .from('inventory_snapshot_items')
    .insert(items.map((i) => ({ snapshot_id: snapshot.id, item_id: i.item_id, quantity: i.quantity })))
  if (itemsError) {
    // Roll back the orphan header.
    await supabaseAdmin.from('inventory_snapshots').delete().eq('id', snapshot.id)
    return json({ error: 'Failed to save snapshot items' }, 500)
  }

  return json({ success: true, snapshot })
})
