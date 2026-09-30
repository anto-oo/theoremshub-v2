import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useArchiveAudition,
  useAuditionApplicationInstruments,
  useAuditionApplications,
  useAuditionInstruments,
  useAuditions,
  useCreateAudition,
  useCreateAuditionApplication,
  useJudgeAuditionInstrument,
} from '@/features/auditions/hooks'
import { needsAuditionSong } from '@/features/auditions/schema'
import { useMembersAdmin } from '@/features/admin/hooks'
import { songsApi } from '@/features/songs/api'
import type { DeezerTrackDetails } from '@/features/songs/api/deezer'
import SongSearch from '@/features/songs/components/SongSearch'
import { useSongsByIds } from '@/features/songs/hooks'
import { auditionInstrumentsApi } from '@/features/auditions/api'
import { supabase } from '@/lib/supabase'
import { formatDateIt, formatDateTimeIt, romeWallTimeToUtcIso } from '@/lib/romeTime'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker, DateTimePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { strings as t } from '@/i18n'

interface InstrumentRole {
  id: number
  name: string
}

function useInstrumentRoles() {
  const [roles, setRoles] = useState<InstrumentRole[]>([])
  useEffect(() => {
    supabase
      .from('instrument_roles')
      .select('id, name')
      .order('display_order')
      .then(({ data }) => {
        if (data) setRoles(data as InstrumentRole[])
      })
  }, [])
  return roles
}

function ApplicationInstruments({ applicationId, roles, canModerate }: { applicationId: string; roles: InstrumentRole[]; canModerate: boolean }) {
  const { data: items } = useAuditionApplicationInstruments(applicationId)
  const songIds = (items ?? []).map((it) => it.song_id).filter((v): v is string => typeof v === 'string')
  const { data: auditionSongs } = useSongsByIds(songIds)
  const judge = useJudgeAuditionInstrument()
  const [judgeError, setJudgeError] = useState('')
  if (!items || items.length === 0) return null
  const songById = new Map((auditionSongs ?? []).map((s) => [s.id, s]))
  const handleJudge = async (id: string, decision: 'admitted' | 'rejected'): Promise<void> => {
    setJudgeError('')
    try {
      await judge.mutateAsync({ id, decision })
    } catch (err) {
      setJudgeError(err instanceof Error ? err.message : t.auditions.errorJudge)
    }
  }
  return (
    <div>
      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
        {items.map((it) => {
          const roleName = roles.find((r) => r.id === it.instrument_role_id)?.name ?? String(it.instrument_role_id)
          const song = it.song_id ? songById.get(it.song_id) : undefined
          return (
            <li key={it.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1">
                {roleName} — {song ? t.auditions.songPicked(song.title, song.artist) : t.auditions.noSong}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Badge variant="secondary">{t.auditions.status[it.status]}</Badge>
                {canModerate && it.status === 'pending' && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={judge.isPending}
                      onClick={() => void handleJudge(it.id, 'admitted')}
                    >
                      {t.auditions.admit}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={judge.isPending}
                      onClick={() => void handleJudge(it.id, 'rejected')}
                    >
                      {t.auditions.reject}
                    </Button>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {judgeError !== '' && <p role="alert" className="mt-1 text-xs text-red-600">{judgeError}</p>}
    </div>
  )
}

function Applications({
  auditionId,
  canModerate,
  roles,
  openIds,
  maxInstruments,
}: {
  auditionId: string
  canModerate: boolean
  roles: InstrumentRole[]
  openIds: number[]
  maxInstruments: number
}) {
  const { user } = useAuth()
  const role = useRole()
  const { data: apps } = useAuditionApplications(auditionId)
  const { data: members } = useMembersAdmin()
  const createApp = useCreateAuditionApplication()
  const [selected, setSelected] = useState<number[]>([])
  const [songByRole, setSongByRole] = useState<Record<number, DeezerTrackDetails>>({})
  const [saving, setSaving] = useState(false)
  const [applyError, setApplyError] = useState('')

  const openRoles = roles.filter((r) => openIds.length === 0 || openIds.includes(r.id))
  const roleName = (id: number) => roles.find((r) => r.id === id)?.name ?? ''
  const needsSong = (id: number) => needsAuditionSong(roleName(id))
  const toggle = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id))
      setSongByRole((s) => {
        if (!(id in s)) return s
        const next = { ...s }
        delete next[id]
        return next
      })
    } else if (selected.length < maxInstruments) {
      setSelected([...selected, id])
    }
  }
  const missingSongs = selected.filter((id) => needsSong(id) && !songByRole[id])

  // Same display as the members list; RLS scopes candidates to their own row.
  const memberById = new Map((members ?? []).map((m) => [m.id as string, m]))
  const applicantName = (id: string) => {
    const m = memberById.get(id) as { first_name: string | null; last_name: string | null; username: string | null } | undefined
    return m ? (`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.username || id.slice(0, 8)) : id.slice(0, 8)
  }

  const handleApply = async (): Promise<void> => {
    if (!user || selected.length === 0 || missingSongs.length > 0 || saving) return
    setApplyError('')
    setSaving(true)
    try {
      // Reuse an existing song when the same pick already exists; otherwise
      // persist it as an audition song (hidden from the Songs library).
      const songIds: Record<number, string> = {}
      for (const roleId of selected) {
        const track = songByRole[roleId]
        if (!track) continue
        const song = await songsApi.findOrCreate({
          title: track.name.trim(),
          artist: track.artist.trim(),
          ...(track.album ? { album: track.album } : {}),
          ...(track.albumArtUrl ? { album_art_url: track.albumArtUrl } : {}),
          ...(typeof track.durationSeconds === 'number' ? { duration_seconds: track.durationSeconds } : {}),
          ...(track.mbid ? { lastfm_id: track.mbid } : {}),
          is_audition: true,
        })
        songIds[roleId] = song.id
      }
      const app = await createApp.mutateAsync({ audition_id: auditionId, applicant_id: user })
      await supabase.from('audition_application_instruments').insert(
        selected.map((instrument_role_id) => ({
          application_id: app.id,
          instrument_role_id,
          ...(songIds[instrument_role_id] ? { song_id: songIds[instrument_role_id] } : {}),
        })),
      )
      setSelected([])
      setSongByRole({})
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : t.songs.errorCreate)
    } finally {
      setSaving(false)
    }
  }

  const alreadyApplied = (apps ?? []).some((a) => a.applicant_id === user)

  return (
    <div className="mt-2 border-t pt-2">
      <p className="text-sm font-medium">{t.auditions.applications((apps ?? []).length)}</p>
      <ul className="mt-1 space-y-1">
        {(apps ?? []).map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
            <div>
              <span className="font-medium">{applicantName(a.applicant_id)}</span>
              <ApplicationInstruments applicationId={a.id} roles={roles} canModerate={canModerate} />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t.auditions.status[a.status]}</Badge>
            </div>
          </li>
        ))}
      </ul>
      {role === 'candidate' && !alreadyApplied && (
        <div className="mt-2 space-y-2">
          <fieldset>
            <legend className="text-sm text-slate-600">
              {t.auditions.instrumentAria} ({t.auditions.maxInstrumentsSuffix(maxInstruments)})
            </legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {openRoles.map((r) => (
                <label key={r.id} className="flex items-center gap-1 text-sm">
                  <Checkbox
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    disabled={!selected.includes(r.id) && selected.length >= maxInstruments}
                    aria-label={r.name}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>
          {selected.some(needsSong) && (
            <div className="space-y-2">
              {selected.filter(needsSong).map((roleId) => {
                const picked = songByRole[roleId]
                return (
                  <div key={roleId} className="space-y-1.5 rounded border p-2">
                    <p className="text-sm font-medium">{t.auditions.songFor(roleName(roleId))}</p>
                    {picked ? (
                      <div className="flex items-center gap-2 text-sm">
                        {picked.albumArtUrl && (
                          <img src={picked.albumArtUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" loading="lazy" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{t.auditions.songPicked(picked.name, picked.artist)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSongByRole((s) => {
                              const next = { ...s }
                              delete next[roleId]
                              return next
                            })
                          }
                        >
                          {t.auditions.songChange}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <SongSearch
                          id={`song-search-${auditionId}-${roleId}`}
                          onSelect={(tr) => setSongByRole((s) => ({ ...s, [roleId]: tr }))}
                        />
                        <p className="text-xs text-slate-500">{t.auditions.songHint}</p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {selected.length > 0 && missingSongs.length > 0 && (
            <p className="text-xs text-slate-500">{t.auditions.songRequired}</p>
          )}
          {applyError !== '' && <p role="alert" className="text-sm text-red-600">{applyError}</p>}
          <Button type="button" size="sm" disabled={createApp.isPending || saving || selected.length === 0 || missingSongs.length > 0} onClick={handleApply}>
            {t.auditions.apply}
          </Button>
        </div>
      )}
    </div>
  )
}

function AuditionMeta({ auditionId, roles }: { auditionId: string; roles: InstrumentRole[] }) {
  const { data } = useAuditionInstruments(auditionId)
  if (!data || data.length === 0) return null
  const names = data
    .map((r) => roles.find((x) => x.id === r.instrument_role_id)?.name ?? String(r.instrument_role_id))
    .join(', ')
  return (
    <p className="text-sm text-slate-500">
      {t.auditions.openInstruments} {names}
    </p>
  )
}

export default function Auditions() {
  const role = useRole()
  const canModerate = role === 'admin' || role === 'manager'
  const { data: auditions, isLoading } = useAuditions()
  const createAudition = useCreateAudition()
  const archiveAudition = useArchiveAudition()
  const roles = useInstrumentRoles()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [deadline, setDeadline] = useState('')
  const [openIds, setOpenIds] = useState<number[]>([])
  const [maxInstruments, setMaxInstruments] = useState('3')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')

  const toggleOpen = (id: number) =>
    setOpenIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  const maxN = Math.min(10, Math.max(1, Number(maxInstruments) || 3))
  const canSubmit =
    title.trim() !== '' && date !== '' && deadline !== '' && openIds.length > 0 && !createAudition.isPending

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (title.trim() === '' || date === '' || deadline === '') return
    if (openIds.length === 0) {
      setError(t.auditions.instrumentsRequired)
      return
    }
    setError('')
    try {
      const created = await createAudition.mutateAsync({
        title: title.trim(),
        date,
        application_deadline: romeWallTimeToUtcIso(deadline),
        max_instruments_per_applicant: maxN,
        ...(location.trim() === '' ? {} : { location: location.trim() }),
      })
      await auditionInstrumentsApi.setForAudition(created.id, openIds)
      setTitle('')
      setDate('')
      setLocation('')
      setDeadline('')
      setOpenIds([])
      setMaxInstruments('3')
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auditions.errorCreate)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm(t.auditions.deleteConfirm)) return
    setError('')
    try {
      await archiveAudition.mutateAsync(id)
      setExpanded((v) => (v === id ? null : v))
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auditions.errorCreate)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.auditions.title}</h1>
        {canModerate && <AddButton label={t.auditions.newAudition} onClick={() => setDialogOpen(true)} />}
      </div>
      {error !== '' && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {canModerate && (
        <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.auditions.newAudition}>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div><Label>{t.auditions.form.titleLabel}</Label><Input placeholder={t.auditions.form.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div>
              <Label>{t.auditions.form.dateLabel}</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div><Label>{t.auditions.form.locationLabel}</Label><Input placeholder={t.auditions.form.locationPlaceholder} value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div>
              <Label>{t.auditions.form.deadlineLabel}</Label>
              <DateTimePicker value={deadline} onChange={setDeadline} />
              <p className="mt-1 text-xs text-slate-500">{t.auditions.deadlineHint}</p>
            </div>
            <fieldset>
              <legend className="text-sm font-medium leading-none">{t.auditions.form.instrumentsLabel}</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-1 text-sm">
                    <Checkbox checked={openIds.includes(r.id)} onChange={() => toggleOpen(r.id)} aria-label={r.name} />
                    {r.name}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{t.auditions.form.instrumentsHint}</p>
            </fieldset>
            <div>
              <Label>{t.auditions.form.maxInstrumentsLabel}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxInstruments}
                onChange={(e) => setMaxInstruments(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">{t.auditions.form.maxInstrumentsHint}</p>
            </div>
            <Button type="submit" disabled={!canSubmit}>
              {t.auditions.form.submit}
            </Button>
          </form>
        </AddDialog>
      )}

      <div className="mt-4">
        <h2 className="text-lg font-semibold">{t.auditions.listTitle}</h2>
        {isLoading && <p className="mt-2 text-sm text-slate-500">{t.common.loading}</p>}
        <ul className="mt-2 space-y-2">
          {(auditions ?? []).map((a) => (
            <li key={a.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{a.title}</span>
                  <span className="text-slate-500"> {formatDateIt(a.date)}</span>
                  {a.location ? <span className="text-slate-500"> — {a.location}</span> : null}
                  <p className="text-sm text-slate-500">
                    {t.auditions.form.deadlineLabel}: {formatDateTimeIt(a.application_deadline)}
                  </p>
                  <AuditionMeta auditionId={a.id} roles={roles} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {role === 'admin' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={archiveAudition.isPending}
                      onClick={() => void handleDelete(a.id)}
                    >
                      {t.auditions.delete}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded((v) => (v === a.id ? null : a.id))}
                  >
                    {expanded === a.id ? t.auditions.close : t.auditions.applicationsTitle}
                  </Button>
                </div>
              </div>
              {expanded === a.id && (
                <AuditionRowBody auditionId={a.id} canModerate={canModerate} roles={roles} maxFallback={a.max_instruments_per_applicant} />
              )}
            </li>
          ))}
        </ul>
        {(auditions ?? []).length === 0 && !isLoading && (
          <p className="mt-2 text-sm text-slate-500">{t.auditions.empty}</p>
        )}
      </div>
    </div>
  )
}

function AuditionRowBody({
  auditionId,
  canModerate,
  roles,
  maxFallback,
}: {
  auditionId: string
  canModerate: boolean
  roles: InstrumentRole[]
  maxFallback: number
}) {
  const { data } = useAuditionInstruments(auditionId)
  const openIds = (data ?? []).map((r) => r.instrument_role_id)
  return (
    <Applications
      auditionId={auditionId}
      canModerate={canModerate}
      roles={roles}
      openIds={openIds}
      maxInstruments={maxFallback || 3}
    />
  )
}
