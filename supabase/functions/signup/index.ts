// ============================================================================
// Edge Function: signup
// Purpose: Atomic username signup. Creates the auth user AND the profile
// in one server-side step, forcing role='candidate'.
// Why server-side: client-side signUp + profiles.insert is racy (orphan
// auth user on insert failure), can't enforce username uniqueness before
// insert, and WITH CHECK (auth.uid()=id) can't prevent role escalation.
// verify_jwt = false (caller has no token yet).
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

const AUTH_EMAIL_DOMAIN = Deno.env.get('AUTH_EMAIL_DOMAIN') ?? 'theorems.local'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  let username = ''
  let password = ''
  let firstName: string | null = null
  let lastName: string | null = null
  let classe: string | null = null
  try {
    const body = await req.json()
    username = (body?.username ?? '').trim().toLowerCase()
    password = body?.password ?? ''
    firstName = body?.firstName?.trim() || null
    lastName = body?.lastName?.trim() || null
    classe = body?.classe?.trim() || null
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return json({ error: 'Invalid username (3-30 chars, a-z 0-9 . _ -)' }, 400)
  }
  if (!password || password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Pre-check username uniqueness for a clean 409 instead of a DB error.
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (existing) return json({ error: 'Username already taken' }, 409)

  const email = `${username}@${AUTH_EMAIL_DOMAIN}`
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    const msg = error?.message?.includes('already registered')
      ? 'Username already taken'
      : 'Signup failed'
    return json({ error: msg }, 400)
  }

  const userId = data.user.id
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    email,
    role: 'candidate', // forced server-side, never from client input
    username,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    classe,
    auth_id: userId,
  })

  if (profileError) {
    // Roll back: no orphan auth user without a profile.
    await supabaseAdmin.auth.admin.deleteUser(userId)
    const taken = profileError.message?.includes('duplicate') ||
      profileError.message?.includes('unique')
    return json({ error: taken ? 'Username already taken' : 'Signup failed' }, taken ? 409 : 500)
  }

  return json({ success: true, userId })
})
