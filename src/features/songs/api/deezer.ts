import { supabase } from '@/lib/supabase'

export interface DeezerTrack {
  name: string
  artist: string
  // ponytail: Deezer track id reused in legacy `mbid`/`lastfm_id` DB field, no migration
  mbid: string | null
  url: string | null
  listeners: number
  albumArtUrl: string | null
}

export interface DeezerTrackDetails extends DeezerTrack {
  album: string | null
  durationSeconds: number | null
}

export async function searchDeezer(searchText: string): Promise<DeezerTrack[]> {
  const { data, error } = await supabase.functions.invoke('deezer-search', {
    body: { searchText },
  })
  if (error) throw error
  return (data?.tracks ?? []) as DeezerTrack[]
}

export async function getDeezerTrackInfo(track: DeezerTrack): Promise<DeezerTrackDetails> {
  const fallback: DeezerTrackDetails = { ...track, album: null, durationSeconds: null }
  try {
    const { data, error } = await supabase.functions.invoke('deezer-search', {
      body: track.mbid
        ? { deezerId: track.mbid }
        : { artist: track.artist, track: track.name },
    })
    // Detail enrichment is best-effort: any failure falls back to search-result
    // data so picking a result always adds the song instead of erroring.
    if (error || !data?.track) return fallback
    const d = data.track
    return {
      name: d.name ?? track.name,
      artist: d.artist ?? track.artist,
      mbid: d.mbid ?? track.mbid,
      url: d.url ?? track.url,
      listeners: d.listeners ?? track.listeners,
      // Prefer hi-res art from track lookup, fall back to search result art
      albumArtUrl: d.albumArtUrl ?? track.albumArtUrl,
      album: d.album ?? null,
      durationSeconds: d.durationSeconds ?? null,
    }
  } catch {
    return fallback
  }
}

// Best-effort lookup for manual title+artist input. Returns null when
// Deezer has no match or the call fails — callers fall back to plain input.
export async function resolveSongMetadata(title: string, artist: string): Promise<DeezerTrackDetails | null> {
  const t = title.trim()
  const a = artist.trim()
  if (t === '' || a === '') return null
  try {
    const { data, error } = await supabase.functions.invoke('deezer-search', {
      body: { artist: a, track: t },
    })
    if (error || !data?.track) return null
    const d = data.track
    return {
      name: d.name ?? t,
      artist: d.artist ?? a,
      mbid: d.mbid ?? null,
      url: d.url ?? null,
      listeners: d.listeners ?? 0,
      albumArtUrl: d.albumArtUrl ?? null,
      album: d.album ?? null,
      durationSeconds: d.durationSeconds ?? null,
    }
  } catch {
    return null
  }
}
