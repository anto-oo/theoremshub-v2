// ============================================================================
// Edge Function: approve-proposal
// Purpose: Approve a song proposal AND create the song in one transaction
// via the SECURITY DEFINER approve_proposal() rpc.
// Why server-side: the rpc has no internal role check, so the edge
// function is the authz gate (admin/manager only). Frontend calling
// update({status}) directly bypasses song creation entirely.
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
  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return json({ error: 'Admin or manager only' }, 403)
  }

  let proposalId = ''
  let associatedEventId: string | null = null
  try {
    const body = await req.json()
    proposalId = body?.proposalId ?? ''
    associatedEventId = body?.associatedEventId ?? null
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!proposalId) return json({ error: 'proposalId required' }, 400)

  const { data: songId, error } = await supabaseAdmin.rpc('approve_proposal', {
    p_proposal_id: proposalId,
    p_associated_event_id: associatedEventId,
  })
  if (error) return json({ error: error.message }, 400)

  return json({ success: true, songId })
})
