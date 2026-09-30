import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEEZER_BASE = 'https://api.deezer.com'
// ponytail: public api.deezer.com needs no key/account — call it directly, no secret wiring

// ponytail: tiny TTL cache so repeated lookups don't hit the API again
const cache = new Map<string, { at: number; value: unknown }>()
const CACHE_TTL_MS = 5 * 60 * 1000
const cacheGet = (key: string): unknown | undefined => {
  const hit = cache.get(key)
  if (!hit || Date.now() - hit.at > CACHE_TTL_MS) {
    if (hit) cache.delete(key)
    return undefined
  }
  return hit.value
}

// Fetch Deezer, treating an `error` body (e.g. code 4 = quota) as failure.
// Quota errors get one retry after ~1s, then fail gracefully (null).
async function deezerGet(url: string): Promise<Record<string, any> | null> {
  const cached = cacheGet(url)
  if (cached !== undefined) return cached as Record<string, any>
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (data?.error) {
        if (data.error.code === 4 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1000))
          continue
        }
        return null
      }
      cache.set(url, { at: Date.now(), value: data })
      return data
    } catch {
      return null
    }
  }
  return null
}

const toTrack = (t: Record<string, any>) => ({
  name: (t.title as string) ?? '',
  artist: (t.artist?.name as string) ?? '',
  // ponytail: Deezer id stored in legacy `mbid`/`lastfm_id` field, no DB migration
  mbid: t.id != null ? String(t.id) : null,
  url: (t.link as string) || null,
  listeners: Number(t.rank) || 0,
  albumArtUrl: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || t.album?.cover_small || null,
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  let body: { searchText?: string; artist?: string; track?: string; deezerId?: string; mbid?: string } = {}
  try {
    body = (await req.json()) ?? {}
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // Detail mode: GET /track/{id} -> album, hi-res art, duration
  const detailId = body.deezerId ?? body.mbid ?? null
  if (detailId || body.track) {
    try {
      let info: Record<string, any> | null = null
      if (detailId) {
        info = await deezerGet(`${DEEZER_BASE}/track/${encodeURIComponent(detailId)}`)
        if (!info?.title) return json({ error: 'Track not found' }, 404)
      } else {
        // No id: fall back to best-match search (legacy artist+track callers)
        const q = `artist:"${body.artist ?? ''}" track:"${body.track ?? ''}"`
        const data = await deezerGet(`${DEEZER_BASE}/search?q=${encodeURIComponent(q)}&limit=1`)
        info = data?.data?.[0] ?? null
        if (!info?.title) return json({ error: 'Track not found' }, 404)
      }
      const base = toTrack(info)
      return json({
        track: {
          ...base,
          album: (info.album?.title as string) ?? null,
          durationSeconds: Number(info.duration) || null,
        },
      })
    } catch {
      return json({ error: 'Failed to fetch Deezer track info' }, 500)
    }
  }

  const searchText = body.searchText?.trim() ?? ''
  if (searchText.length < 2) {
    return json({ error: 'searchText must be at least 2 characters' }, 400)
  }

  try {
    const data = await deezerGet(`${DEEZER_BASE}/search?q=${encodeURIComponent(searchText)}&limit=10`)
    if (!data) return json({ error: 'Deezer request failed' }, 502)
    const list = Array.isArray(data?.data) ? data.data : []
    const tracks = list
      .filter((t: Record<string, any>) => t?.title && t?.artist?.name)
      .map(toTrack)
    return json({ tracks })
  } catch {
    return json({ error: 'Failed to search Deezer' }, 500)
  }
})
