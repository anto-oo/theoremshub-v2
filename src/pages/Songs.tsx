import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Menu } from '@base-ui/react/menu'
import { useRole } from '@/hooks/useRole'
import { useArchiveSong, useCreateSong, useSongs } from '@/features/songs/hooks'
import { isDuplicateError } from '@/features/songs/api'
import SongSearch from '@/features/songs/components/SongSearch'
import { AddDialog } from '@/shared/components/AddDialog'
import { MediaRow, RowIconButton } from '@/shared/components/MediaRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDuration } from '@/lib/utils'
import { strings as t } from '@/i18n'

type AddMode = 'search' | 'manual'

// ponytail: accepts "m:ss" or plain seconds, null when empty/invalid
function parseDuration(input: string): number | null {
  const v = input.trim()
  if (v === '') return null
  if (/^\d+$/.test(v)) return Number(v)
  const m = v.match(/^(\d+):([0-5]?\d)$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export default function Songs() {
  const role = useRole()
  const isAdmin = role === 'admin' || role === 'manager'
  const { data: songs, isLoading } = useSongs()
  const createSong = useCreateSong()
  const archiveSong = useArchiveSong()

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [duration, setDuration] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<AddMode>('manual')
  const [error, setError] = useState('')
  const [quickAddPending, setQuickAddPending] = useState(false)

  const openMode = (next: AddMode) => {
    setError('')
    setMode(next)
    setDialogOpen(true)
  }

  // ponytail: normalized client-side dupe check; DB unique index is the backstop
  const alreadyExists = (title: string, artist: string, mbid?: string | null): boolean =>
    (songs ?? []).some((s) => {
      if (mbid && s.lastfm_id && s.lastfm_id === mbid) return true
      return s.title.trim().toLowerCase() === title.trim().toLowerCase() && s.artist.trim().toLowerCase() === artist.trim().toLowerCase()
    })

  const toError = (err: unknown): string => {
    if (isDuplicateError(err)) return t.songs.errorDuplicate
    return err instanceof Error && err.message ? `${t.songs.errorCreate} (${err.message})` : t.songs.errorCreate
  }

  const handleQuickAdd = async (tr: { name: string; artist: string; album?: string | null; albumArtUrl: string | null; durationSeconds?: number | null; mbid: string | null }): Promise<void> => {
    setError('')
    if (alreadyExists(tr.name, tr.artist, tr.mbid)) {
      setError(t.songs.errorDuplicate)
      return
    }
    setQuickAddPending(true)
    try {
      await createSong.mutateAsync({
        title: tr.name.trim(),
        artist: tr.artist.trim(),
        ...(tr.album ? { album: tr.album } : {}),
        ...(tr.albumArtUrl ? { album_art_url: tr.albumArtUrl } : {}),
        ...(typeof tr.durationSeconds === 'number' ? { duration_seconds: tr.durationSeconds } : {}),
        ...(tr.mbid ? { lastfm_id: tr.mbid } : {}),
      })
      setDialogOpen(false)
    } catch (err) {
      // Show raw message (e.g. RLS/validation detail) to make failures diagnosable
      setError(toError(err))
    } finally {
      setQuickAddPending(false)
    }
  }

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (title.trim() === '' || artist.trim() === '') return
    if (alreadyExists(title, artist)) {
      setError(t.songs.errorDuplicate)
      return
    }
    setError('')
    try {
      const durationSeconds = parseDuration(duration)
      await createSong.mutateAsync({
        title: title.trim(),
        artist: artist.trim(),
        ...(typeof durationSeconds === 'number' ? { duration_seconds: durationSeconds } : {}),
      })
      setTitle('')
      setArtist('')
      setDuration('')
      setDialogOpen(false)
    } catch (err) {
      setError(toError(err))
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[32px] leading-tight font-normal">{t.songs.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.songs.subtitle}</p>
        </div>
        {isAdmin && (
          <Menu.Root>
            <Menu.Trigger
              aria-label={t.songs.addSong}
              title={t.songs.addSong}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card text-white shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Plus size={20} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end" sideOffset={8} className="z-50">
                <Menu.Popup className="min-w-48 rounded-xl border bg-card p-1.5 shadow-lg focus:outline-none">
                  <Menu.Item
                    onClick={() => openMode('manual')}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <Pencil size={16} aria-hidden="true" /> {t.songs.manual}
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => openMode('search')}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <Search size={16} aria-hidden="true" /> {t.songs.searchOnline}
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>
      {error !== '' && !dialogOpen && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.songs.addSong}>
          <div className="space-y-4">
            {mode === 'search' && (
              <div className="space-y-3">
                <SongSearch onSelect={handleQuickAdd} />
                {quickAddPending && <p aria-live="polite" className="text-sm text-muted-foreground">{t.common.loading}</p>}
              </div>
            )}

            {mode === 'manual' && (
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-1.5">
                  <Label htmlFor="song-title">{t.songs.form.titleLabel}</Label>
                  <Input id="song-title" placeholder={t.songs.form.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="song-artist">{t.songs.form.artistLabel}</Label>
                  <Input id="song-artist" placeholder={t.songs.form.artistPlaceholder} value={artist} onChange={(e) => setArtist(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="song-duration">{t.songs.form.durationLabel}</Label>
                  <Input id="song-duration" placeholder={t.songs.form.durationPlaceholder} value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={createSong.isPending || title.trim() === '' || artist.trim() === ''}>
                    {createSong.isPending ? t.songs.form.submitting : t.songs.form.submit}
                  </Button>
                </div>
              </form>
            )}

            {error !== '' && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        </AddDialog>
      )}

      <div className="mt-4">
        {isLoading && <p aria-busy="true" aria-live="polite" className="text-sm text-muted-foreground">{t.common.loading}</p>}
        <ul className="space-y-3">
          {(songs ?? []).map((s) => (
            <MediaRow
              key={s.id}
              title={s.title}
              subtitle={[s.artist, s.album, formatDuration(s.duration_seconds)].filter((v): v is string => typeof v === 'string' && v !== '').join(' • ')}
              imageUrl={s.album_art_url}
              action={
                isAdmin && (
                  <RowIconButton
                    label={`${t.common.delete} ${s.title}`}
                    onClick={() => archiveSong.mutate(s.id)}
                    disabled={archiveSong.isPending}
                    tone="danger"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </RowIconButton>
                )
              }
            />
          ))}
        </ul>
        {(songs ?? []).length === 0 && !isLoading && (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{t.songs.empty} {isAdmin ? t.songs.emptyAdminHint : ''}</p>
        )}
      </div>
    </div>
  )
}
