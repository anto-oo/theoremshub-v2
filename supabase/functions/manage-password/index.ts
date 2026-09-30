// ============================================================================
// Edge Function: manage-password
// Purpose: Allows users to change their own password (verifying current
// password) and admins to reset any user's password.
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

  let action: string, userId: string, currentPassword: string, newPassword: string
  try {
    ({ action, userId, currentPassword, newPassword } = await req.json())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  if (action === 'change' && currentPassword && newPassword) {
    // Verify the current password with a sign-in attempt, then update as admin.
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email ?? '',
      password: currentPassword,
    })
    if (signInError) {
      return new Response(JSON.stringify({ error: 'Current password incorrect' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword })
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to change password' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'reset' && userId && newPassword) {
    // Only admin can reset another user's password
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

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to reset password' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 400,
  })
})
