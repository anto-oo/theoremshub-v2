import { useQuery } from '@tanstack/react-query'
import { Music } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDuration } from '@/lib/utils'
import { InstrumentBadge, MediaRow } from '@/shared/components/MediaRow'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { strings as t } from '@/i18n'

interface AssignedRow {
  key: string
  title: string
  artist: string
  albumArtUrl: string | null
  duration: number | null
  instrument: string
  context: string | null
}

async function fetchMySongs(memberId: string): Promise<AssignedRow[]> {
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('id, context_type, context_id, instrument_role_id, instrument_roles(name)')
    .eq('member_id', memberId)
  if (error) throw error
  const rows = assignments ?? []
  if (rows.length === 0) return []

  const songIds = [...new Set(rows.filter((a) => a.context_type === 'song').map((a) => a.context_id))]
  const entryIds = [...new Set(rows.filter((a) => a.context_type === 'setlist_song').map((a) => a.context_id))]

  const [songsRes, entriesRes, rolesRes] = await Promise.all([
    songIds.length > 0
      ? supabase.from('songs').select('id, title, artist, album_art_url, duration_seconds, archived_at').in('id', songIds)
      : Promise.resolve({ data: [], error: null }),
    entryIds.length > 0
      ? supabase.from('setlist_songs').select('id, song_id, setlists(name), songs(id, title, artist, album_art_url, duration_seconds, archived_at)').in('id', entryIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('instrument_roles').select('id, name'),
  ])
  if (songsRes.error) throw songsRes.error
  if (entriesRes.error) throw entriesRes.error
  if (rolesRes.error) throw rolesRes.error

  const songById = new Map((songsRes.data ?? []).map((s: any) => [s.id, s]))
  const entryById = new Map((entriesRes.data ?? []).map((e: any) => [e.id, e]))
  const roleById = new Map((rolesRes.data ?? []).map((r: any) => [r.id, r.name]))

  const out: AssignedRow[] = []
  for (const a of rows as any[]) {
    const instrument = a.instrument_roles?.name ?? roleById.get(a.instrument_role_id) ?? String(a.instrument_role_id)
    if (a.context_type === 'song') {
      const s = songById.get(a.context_id)
      if (!s || s.archived_at) continue
      out.push({ key: a.id, title: s.title, artist: s.artist, albumArtUrl: s.album_art_url, duration: s.duration_seconds, instrument, context: null })
    } else {
      const e = entryById.get(a.context_id)
      const s = e?.songs
      if (!s || s.archived_at) continue
      out.push({ key: a.id, title: s.title, artist: s.artist, albumArtUrl: s.album_art_url, duration: s.duration_seconds, instrument, context: e?.setlists?.name ?? null })
    }
  }
  out.sort((x, y) => x.title.localeCompare(y.title, 'it'))
  return out
}

export default function MySongs() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['my-songs', user],
    queryFn: () => fetchMySongs(user as string),
    enabled: !!user,
  })

  return (
    <div>
      <h1 className="text-[32px] leading-tight font-normal">{t.mySongs.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.mySongs.subtitle}</p>
      <div className="mt-4">
        {isLoading && <p aria-busy="true" aria-live="polite" className="text-sm text-muted-foreground">{t.common.loading}</p>}
        <ul className="space-y-3">
          {(data ?? []).map((s) => (
            <MediaRow
              key={s.key}
              title={s.title}
              subtitle={[s.artist, s.context, formatDuration(s.duration)].filter((v): v is string => typeof v === 'string' && v !== '').join(' • ')}
              imageUrl={s.albumArtUrl}
              titleBadge={<InstrumentBadge name={s.instrument} />}
            />
          ))}
        </ul>
        {(data ?? []).length === 0 && !isLoading && (
          <EmptyScreen icon={<Music size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.mySongs.empty} />
        )}
      </div>
    </div>
  )
}
