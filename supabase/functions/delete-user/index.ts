// ============================================================================
// Edge Function: delete-user
// Purpose: Admin-only hard deletion of a user's auth account and profile.
// This is the only place in the app where true delete (not archive) is
// correct, because it's a person's account, not content.
// Requires service-role key (admin access).
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  // Verify admin role
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    })
  }

  let targetUserId = ''
  try {
    targetUserId = (await req.json())?.targetUserId ?? ''
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  if (!targetUserId || targetUserId === user.id) {
    return new Response(JSON.stringify({ error: 'Invalid target user' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  // Delete the profile first (CASCADE handles member_instruments and other
  // rows): if the auth delete then fails, a retry still works because the
  // auth user still exists. Auth-first would leave an undeletable orphan.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', targetUserId)

  if (profileError) {
    return new Response(JSON.stringify({ error: 'Failed to delete profile' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  // Hard delete the auth user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
  if (deleteError) {
    return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
