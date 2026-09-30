import { useEffect, useState } from 'react'
import { useDeezerSearch } from '@/features/songs/hooks'
import { getDeezerTrackInfo, type DeezerTrack, type DeezerTrackDetails } from '@/features/songs/api/deezer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings as t } from '@/i18n'

interface Props {
  onSelect: (track: DeezerTrackDetails) => void | Promise<void>
  id?: string
}

export default function SongSearch({ onSelect, id = 'song-search' }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const tm = setTimeout(() => setDebounced(query), 400)
    return () => clearTimeout(tm)
  }, [query])

  const { data: tracks, isFetching, isError } = useDeezerSearch(debounced)
  const showResults = debounced.trim().length >= 2

  const handlePick = async (tr: DeezerTrack) => {
    const key = `${tr.artist}-${tr.name}-${tr.mbid ?? tr.url ?? ''}`
    setLoadingKey(key)
    setError('')
    try {
      // Fetch album, hi-res cover, duration — don't touch the manual title/artist inputs
      const details = await getDeezerTrackInfo(tr)
      await onSelect(details)
      setQuery('')
      setDebounced('')
    } catch (err) {
      setError(err instanceof Error && err.message ? `${t.common.errorGeneric} (${err.message})` : t.common.errorGeneric)
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t.songs.search.label}</Label>
      <Input
        id={id}
        placeholder={t.songs.search.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {error !== '' && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {showResults && (
        <div className="overflow-hidden rounded-xl border">
          {isFetching && <p className="px-3 py-2 text-sm text-muted-foreground">{t.common.searching}</p>}
          {!isFetching && isError && (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">{t.common.errorGeneric}</p>
          )}
          {!isFetching && !isError && (tracks ?? []).length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t.common.noResults}</p>
          )}
          {(tracks ?? []).map((tr) => {
            const key = `${tr.artist}-${tr.name}-${tr.mbid ?? tr.url ?? ''}`
            const loading = loadingKey === key
            return (
              <button
                key={key}
                type="button"
                disabled={loadingKey !== null}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent disabled:opacity-60"
                onClick={() => handlePick(tr)}
              >
                {tr.albumArtUrl ? (
                  <img src={tr.albumArtUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
                ) : (
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-sm font-semibold">
                    {(tr.name.trim()[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{tr.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{tr.artist}</span>
                </span>
                {loading && <span className="shrink-0 text-xs text-muted-foreground">{t.common.loading}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
