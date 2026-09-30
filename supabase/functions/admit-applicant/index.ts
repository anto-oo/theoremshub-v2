// ============================================================================
// Edge Function: admit-applicant
// Purpose: Admit an audition applicant in one transaction via the SECURITY
// DEFINER admit_applicant() rpc (candidate->user promotion + instrument
// copy + status flip).
// Why server-side: the rpc has no internal role check; the edge function
// is the authz gate (admin/manager only). Frontend update({status})
// directly skips promotion and instrument copy.
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

  let applicationId = ''
  try {
    applicationId = (await req.json())?.applicationId ?? ''
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!applicationId) return json({ error: 'applicationId required' }, 400)

  const { error } = await supabaseAdmin.rpc('admit_applicant', {
    p_application_id: applicationId,
  })
  if (error) return json({ error: error.message }, 400)

  return json({ success: true })
})
