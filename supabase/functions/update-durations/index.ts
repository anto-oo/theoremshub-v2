// ============================================================================
// Edge Function: update-durations
// Purpose: Batch update missing song durations from Last.fm.
// Finds songs with null duration and tries to fill them in.
// Shows progress/results to the user running it.
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

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  const supabaseAdmin = createClient(
    Deno.env.get('VITE_SUPABASE_URL') ?? '',
    Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  // Only admin can run this batch operation
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    })
  }

  // Find all songs with null duration
  const { data: songsWithNullDuration, error } = await supabaseAdmin
    .from('songs')
    .select('id, title, artist')
    .is('duration_seconds', null)
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to query songs' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  if (!songsWithNullDuration || songsWithNullDuration.length === 0) {
    return new Response(JSON.stringify({ success: true, updated: 0, message: 'No songs with missing durations found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Try to find durations from Last.fm for each song
  const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') ?? ''
  const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/'
  const results = []
  let updated = 0

  for (const song of songsWithNullDuration) {
    const url = `${LASTFM_BASE}?method=track.getInfo&artist=${encodeURIComponent(song.artist)}&track=${encodeURIComponent(song.title)}&api_key=${LASTFM_API_KEY}&format=json`

    try {
      const response = await fetch(url)
      const data = await response.json()
      const duration = data?.track?.duration ? Math.floor(data.track.duration / 1000) : null

      if (duration) {
        await supabaseAdmin
          .from('songs')
          .update({ duration_seconds: duration })
          .eq('id', song.id)

        updated++
        results.push({ songId: song.id, title: song.title, duration })
      } else {
        results.push({ songId: song.id, title: song.title, duration: null })
      }
    } catch {
      results.push({ songId: song.id, title: song.title, error: 'Last.fm lookup failed' })
    }
  }

  return new Response(JSON.stringify({ success: true, updated, total: songsWithNullDuration.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
