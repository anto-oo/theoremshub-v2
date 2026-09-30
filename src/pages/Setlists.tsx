import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Archive,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  GripVertical,
  Import,
  ListMusic,
  Music,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRole } from '@/hooks/useRole'
import { useSongs } from '@/features/songs/hooks'
import {
  useAddAssignment,
  useAddSetlistSong,
  useArchiveSetlist,
  useAssignments,
  useCreateSetlist,
  useDeleteSetlist,
  useRemoveAssignment,
  useRemoveSetlistSong,
  useReorderSetlistSongs,
  useSetlistSongs,
  useSetlists,
} from '@/features/setlists/hooks'
import { assignmentsApi, setlistSongsApi } from '@/features/setlists/api'
import { generateSetlistPdf } from '@/features/setlists/lib/pdf'
import { useMembersAdmin } from '@/features/admin/hooks'
import { supabase } from '@/lib/supabase'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { InstrumentBadge, RowIconButton } from '@/shared/components/MediaRow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { strings as t } from '@/i18n'

interface InstrumentRole {
  id: number
  name: string
}

type Entry = NonNullable<ReturnType<typeof useSetlistSongs>['data']>[number]
type Member = { id: string; first_name: string | null; last_name: string | null; username: string | null }

// --- helpers (same math as old_ver, seconds instead of ms) ---
function formatTotal(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function formatSong(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function memberDisplay(m: { first_name: string | null; last_name: string | null; username: string | null; id: string }): string {
  return `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.username || m.id.slice(0, 8)
}

function useInstrumentRoles() {
  return useQuery({
    queryKey: ['instrumentRoles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instrument_roles')
        .select('id, name')
        .order('display_order')
      if (error) throw error
      return data as InstrumentRole[]
    },
    staleTime: 5 * 60_000,
  })
}

function useMemberRoleMap() {
  const [map, setMap] = useState<Map<string, number[]>>(new Map())
  useEffect(() => {
    supabase
      .from('member_instruments')
      .select('member_id, instrument_role_id')
      .then(({ data }) => {
        const m = new Map<string, number[]>()
        for (const row of data ?? []) {
          m.set(row.member_id, [...(m.get(row.member_id) ?? []), row.instrument_role_id])
        }
        setMap(m)
      })
  }, [])
  return map
}

function ConfirmDialog({ open, onOpenChange, title, message, confirmLabel, onConfirm, pending }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  pending?: boolean
}) {
  return (
    <AddDialog open={open} onOpenChange={onOpenChange} title={title}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </AddDialog>
  )
}

// --- old_ver SetlistSongAssignmentsDialog ported to new assignments table ---
function AssignmentDialog({ entryId, songTitle, songArtist, memberRoleMap, isAdmin, open, onOpenChange }: {
  entryId: string | null
  songTitle: string
  songArtist?: string | undefined
  memberRoleMap: Map<string, number[]>
  isAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: assignments } = useAssignments(open ? entryId : null)
  const { data: members } = useMembersAdmin()
  const { data: roles = [], isLoading: rolesLoading } = useInstrumentRoles()
  const qc = useQueryClient()
  const addAssignment = useAddAssignment()
  const removeAssignment = useRemoveAssignment()

  const [roleId, setRoleId] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  useEffect(() => {
    if (open) { setSelectedMembers([]) }
  }, [open, entryId])
  useEffect(() => {
    if (open && roleId === '' && roles.length > 0) setRoleId(String(roles[0].id))
  }, [open, roles, roleId])

  const roleName = (id: number): string => roles.find((r) => r.id === id)?.name ?? String(id)
  const assignedIds = useMemo(
    () => new Set((assignments ?? []).filter((a) => String(a.instrument_role_id) === roleId).map((a) => a.member_id)),
    [assignments, roleId],
  )
  const options = useMemo(() => {
    const list = roleId === ''
      ? members ?? []
      : (members ?? []).filter((m) => (memberRoleMap.get(m.id) ?? []).includes(Number(roleId)))
    return list.filter((m) => !assignedIds.has(m.id))
  }, [members, memberRoleMap, roleId, assignedIds])

  useEffect(() => {
    setSelectedMembers((prev) => prev.filter((id) => options.some((m) => m.id === id)))
  }, [options])

  const handleAdd = async (): Promise<void> => {
    if (entryId === null || roleId === '' || selectedMembers.length === 0) return
    await Promise.all(selectedMembers.map((memberId) =>
      addAssignment.mutateAsync({ setlistSongId: entryId, memberId, instrumentRoleId: Number(roleId) }),
    ))
    void qc.invalidateQueries({ queryKey: ['assignments'] })
    setSelectedMembers([])
  }

  const grouped = useMemo(() => {
    const m = new Map<number, NonNullable<typeof assignments>>()
    for (const a of assignments ?? []) {
      m.set(a.instrument_role_id, [...(m.get(a.instrument_role_id) ?? []), a])
    }
    return [...m.entries()].sort(([a], [b]) => roleName(a).localeCompare(roleName(b)))
  }, [assignments, roles])

  return (
    <AddDialog open={open} onOpenChange={onOpenChange} title={t.setlists.assignmentsOf(songTitle)} className="max-w-lg">
      {songArtist !== undefined && songArtist !== '' && (
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">{songArtist}</p>
      )}
      {rolesLoading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : (
      <>
      {(assignments ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t.setlists.emptyAssignments}</p>}
      <div className="space-y-4">
        {grouped.map(([rid, list]) => (
          <div key={rid} className="space-y-2">
            <InstrumentBadge name={roleName(rid)} />
            <ul className="ml-1 flex flex-wrap gap-2">
              {list.map((a) => {
                const m = (members ?? []).find((x) => x.id === a.member_id)
                return (
                  <li key={a.id} className="flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                      {(m ? memberDisplay(m) : '?')[0]?.toUpperCase()}
                    </span>
                    <span>{m ? memberDisplay(m) : a.member_id.slice(0, 8)}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        aria-label={`${t.setlists.remove} ${m ? memberDisplay(m) : ''}`}
                        disabled={removeAssignment.isPending}
                        onClick={() => entryId !== null && removeAssignment.mutate(
                          { id: a.id, setlistSongId: entryId },
                          { onSuccess: () => { void qc.invalidateQueries({ queryKey: ['assignments'] }) } },
                        )}
                        className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {isAdmin && (
        <div className="mt-4 space-y-3 rounded-[13px] border bg-muted/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={roleId}
              onValueChange={(v) => { setRoleId(v); setSelectedMembers([]) }}
              options={roles.map((r) => ({ value: String(r.id), label: r.name }))}
              aria-label={t.setlists.roleAria}
            />
            <Button
              type="button"
              size="sm"
              disabled={roleId === '' || selectedMembers.length === 0 || addAssignment.isPending}
              onClick={handleAdd}
            >
              <Plus size={14} aria-hidden="true" /> {t.setlists.add}
              {selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ''}
            </Button>
          </div>
          {options.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {options.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                    <Checkbox
                      checked={selectedMembers.includes(m.id)}
                      onChange={() => setSelectedMembers((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id])}
                      aria-label={memberDisplay(m)}
                    />
                    <span className="min-w-0 truncate">{memberDisplay(m)}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.setlists.noEligibleMembers}</p>
          )}
        </div>
      )}
      </>
      )}
    </AddDialog>
  )
}

// --- old_ver SortableSongCard: same Card layout, only buttons swapped to RowIconButton chips ---
function SortableSongCard({ entry, index, members, roles, entryAssignments, canManage, onAssign, onRemove, onRemoveAssignment }: {
  entry: Entry
  index: number
  members: Member[]
  entryAssignments: { id: string; member_id: string; instrument_role_id: number }[]
  roles: InstrumentRole[]
  canManage: boolean
  onAssign: () => void
  onRemove: () => void
  onRemoveAssignment: (assignmentId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const song = entry.songs
  const roleName = (id: number): string => roles.find((r) => r.id === id)?.name ?? String(id)

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {canManage && (
            <span
              {...attributes}
              {...listeners}
              aria-label={t.setlists.dragToReorder(song?.title ?? '')}
              className="cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical size={20} aria-hidden="true" />
            </span>
          )}
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
            {index + 1}
          </span>
          {song?.album_art_url ? (
            <img src={song.album_art_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
              <Music size={24} aria-hidden="true" className="text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{song ? song.title : entry.song_id.slice(0, 8)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[song?.artist, formatSong(song?.duration_seconds), t.setlists.position(entry.position)].filter(Boolean).join(' • ')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RowIconButton label={t.setlists.assignmentsOf(song?.title ?? '')} onClick={onAssign}>
              <Users size={16} aria-hidden="true" />
            </RowIconButton>
            {canManage && (
              <RowIconButton label={`${t.common.delete} ${song?.title ?? ''}`} onClick={onRemove} tone="danger">
                <Trash2 size={16} aria-hidden="true" />
              </RowIconButton>
            )}
          </div>
        </div>
        {entryAssignments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 pl-14">
            {entryAssignments.map((a) => {
              const m = members.find((x) => x.id === a.member_id)
              return (
                <Badge key={a.id} variant="secondary" className="gap-1">
                  {m ? memberDisplay(m) : a.member_id.slice(0, 8)} • {roleName(a.instrument_role_id)}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onRemoveAssignment(a.id)}
                      aria-label={`${t.setlists.remove} ${m ? memberDisplay(m) : ''}`}
                      className="ml-1 hover:text-destructive"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  )}
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}

function SetlistDetailScreen({ setlistId, isAdmin, onBack }: {
  setlistId: string
  isAdmin: boolean
  onBack: () => void
}) {
  const qc = useQueryClient()
  const { data: setlists } = useSetlists()
  const setlist = (setlists ?? []).find((s) => s.id === setlistId)
  const { data: entries, isLoading: songsLoading } = useSetlistSongs(setlistId)
  const { data: songs } = useSongs()
  const { data: members } = useMembersAdmin()
  const { data: roles = [] } = useInstrumentRoles()
  const memberRoleMap = useMemberRoleMap()

  const addSong = useAddSetlistSong()
  const removeSong = useRemoveSetlistSong()
  const reorder = useReorderSetlistSongs()
  const removeAssignment = useRemoveAssignment()

  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [managingEntryId, setManagingEntryId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const entryIds = useMemo(() => (entries ?? []).map((e) => e.id), [entries])
  const { data: allAssignments } = useQuery({
    queryKey: ['assignments', 'setlist', setlistId],
    queryFn: () => assignmentsApi.listForSongs(entryIds),
    enabled: entryIds.length > 0,
  })

  const assignmentsByEntry = useMemo(() => {
    const m = new Map<string, NonNullable<typeof allAssignments>>()
    for (const a of allAssignments ?? []) {
      m.set(a.context_id, [...(m.get(a.context_id) ?? []), a])
    }
    return m
  }, [allAssignments])

  const totalSeconds = useMemo(
    () => (entries ?? []).reduce((sum, e) => sum + (e.songs?.duration_seconds ?? 0), 0),
    [entries],
  )
  const roleName = (id: number): string => roles.find((r) => r.id === id)?.name ?? String(id)
  const availableSongs = useMemo(() => {
    const used = new Set((entries ?? []).map((e) => e.song_id))
    return (songs ?? []).filter((s) => !used.has(s.id))
  }, [songs, entries])

  const invalidateAssignments = (): void => {
    void qc.invalidateQueries({ queryKey: ['assignments'] })
  }

  const handleAddSong = async (songId: string): Promise<void> => {
    const songLevel = await assignmentsApi.listSongLevel([songId])
    const forSong = songLevel.filter((a) => a.context_id === songId)
    const roleId = forSong[0]?.instrument_role_id ?? roles[0]?.id
    if (roleId === undefined) return
    const created = await addSong.mutateAsync({
      setlistId,
      songId,
      instrumentRoleId: roleId,
      position: (entries ?? []).length,
    })
    if (forSong.length > 0) {
      const { error } = await supabase.from('assignments').insert(
        forSong.map((a) => ({
          context_type: 'setlist_song' as const,
          context_id: created.id,
          member_id: a.member_id,
          instrument_role_id: a.instrument_role_id,
        })),
      )
      if (error) throw error
      invalidateAssignments()
    }
    setAddOpen(false)
  }

  const handleImport = async (sourceId: string): Promise<void> => {
    setImportingId(sourceId)
    try {
      const [sourceEntries, currentAll] = await Promise.all([
        setlistSongsApi.listBySetlist(sourceId),
        assignmentsApi.listForSongs(entryIds),
      ])
      const sourceIds = sourceEntries.map((e) => e.id)
      const sourceAssignments = await assignmentsApi.listForSongs(sourceIds)
      const currentBySong = new Map((entries ?? []).map((e) => [e.song_id, e.id]))
      const existing = new Set(currentAll.map((a) => `${a.context_id}:${a.member_id}:${a.instrument_role_id}`))
      const sourceEntrySong = new Map(sourceEntries.map((e) => [e.id, e.song_id]))
      const toInsert = sourceAssignments
        .filter((a) => {
          const songId = sourceEntrySong.get(a.context_id)
          const target = songId ? currentBySong.get(songId) : undefined
          return target !== undefined && !existing.has(`${target}:${a.member_id}:${a.instrument_role_id}`)
        })
        .map((a) => ({
          context_type: 'setlist_song' as const,
          context_id: currentBySong.get(sourceEntrySong.get(a.context_id) as string) as string,
          member_id: a.member_id,
          instrument_role_id: a.instrument_role_id,
        }))
      if (toInsert.length > 0) {
        const { error } = await supabase.from('assignments').insert(toInsert)
        if (error) throw error
        invalidateAssignments()
      }
      setImportOpen(false)
    } finally {
      setImportingId(null)
    }
  }

  const handlePdf = (): void => {
    if (!setlist) return
    generateSetlistPdf({
      name: setlist.name,
      totalSeconds,
      songs: (entries ?? []).map((e, i) => ({
        position: i + 1,
        title: e.songs?.title ?? e.song_id.slice(0, 8),
        artist: e.songs?.artist ?? '',
        durationSeconds: e.songs?.duration_seconds,
        assignments: (assignmentsByEntry.get(e.id) ?? []).map((a) => {
          const m = members?.find((x) => x.id === a.member_id)
          return { memberName: m ? memberDisplay(m) : a.member_id.slice(0, 8), roleName: roleName(a.instrument_role_id) }
        }),
      })),
    })
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id || !entries) return
    const oldIndex = entries.findIndex((e) => e.id === active.id)
    const newIndex = entries.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(entries, oldIndex, newIndex)
    qc.setQueryData(['setlistSongs', setlistId], reordered)
    void reorder.mutateAsync({
      setlistId,
      positions: reordered.map((e, i) => ({ id: e.id, position: i })),
    })
  }

  const managingEntry = (entries ?? []).find((e) => e.id === managingEntryId) ?? null

  if (!setlist) return <p className="py-12 text-center text-sm text-muted-foreground">{t.setlists.noSetlists}</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t.common.back}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{setlist.name}</h1>
          {setlist.description && (
            <p className="mt-1 text-muted-foreground">{setlist.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(entries ?? []).length > 0 && (
            <>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <Clock size={16} aria-hidden="true" />
                {formatTotal(totalSeconds)}
              </Badge>
              <RowIconButton label={t.setlists.downloadPdf} onClick={handlePdf}>
                <Download size={16} aria-hidden="true" />
              </RowIconButton>
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} aria-hidden="true" /> {t.setlists.addSong}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Import size={16} aria-hidden="true" /> {t.setlists.importAssignments}
          </Button>
        </div>
      )}

      {songsLoading ? (
        <div className="space-y-3" aria-label={t.common.loading}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      ) : (entries ?? []).length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(entries ?? []).map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {(entries ?? []).map((e, i) => (
                <SortableSongCard
                  key={e.id}
                  entry={e}
                  index={i}
                  members={members ?? []}
                  roles={roles}
                  entryAssignments={assignmentsByEntry.get(e.id) ?? []}
                  canManage={isAdmin}
                  onAssign={() => setManagingEntryId(e.id)}
                  onRemove={() => removeSong.mutate({ id: e.id, setlistId })}
                  onRemoveAssignment={(assignmentId) => removeAssignment.mutate(
                    { id: assignmentId, setlistSongId: e.id },
                    { onSuccess: invalidateAssignments },
                  )}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="py-12 text-center">
          <Music size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">{t.setlists.emptySongs}</h3>
        </div>
      )}

      <AddDialog open={addOpen} onOpenChange={setAddOpen} title={t.setlists.addSong} className="max-w-lg">
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {availableSongs.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => void handleAddSong(s.id)}
                disabled={addSong.isPending}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
              >
                {s.album_art_url ? (
                  <img src={s.album_art_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                    <Music size={20} aria-hidden="true" className="text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">{s.artist}</span>
                </span>
                <Plus size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        {availableSongs.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.setlists.noMoreSongs}</p>
        )}
      </AddDialog>

      <AddDialog open={importOpen} onOpenChange={setImportOpen} title={t.setlists.importAssignments} className="max-w-lg">
        <p className="mb-3 text-sm text-muted-foreground">{t.setlists.importHint}</p>
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {(setlists ?? []).filter((s) => s.id !== setlistId).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => void handleImport(s.id)}
                disabled={importingId !== null}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-sm text-muted-foreground">{t.setlists.items(s.setlist_songs.length)}</span>
                </span>
                <Import size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        {(setlists ?? []).filter((s) => s.id !== setlistId).length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.setlists.noOtherSetlists}</p>
        )}
      </AddDialog>

      <AssignmentDialog
        entryId={managingEntryId}
        songTitle={managingEntry?.songs?.title ?? t.setlists.assignments}
        songArtist={managingEntry?.songs?.artist ?? undefined}
        memberRoleMap={memberRoleMap}
        isAdmin={isAdmin}
        open={managingEntryId !== null}
        onOpenChange={(open) => { if (!open) setManagingEntryId(null) }}
      />
    </div>
  )
}

export default function Setlists() {
  const role = useRole()
  const isAdmin = role === 'admin' || role === 'manager'
  const { data: setlists, isLoading } = useSetlists()
  const createSetlist = useCreateSetlist()
  const archiveSetlist = useArchiveSetlist()
  const deleteSetlist = useDeleteSetlist()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'archive' | 'delete' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; seconds: number }>()
    for (const s of setlists ?? []) {
      const nested = s.setlist_songs ?? []
      m.set(s.id, {
        count: nested.length,
        seconds: nested.reduce((sum, n) => sum + (n.songs?.duration_seconds ?? 0), 0),
      })
    }
    return m
  }, [setlists])

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (name.trim() === '') return
    setError('')
    try {
      await createSetlist.mutateAsync({
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        event_date: eventDate === '' ? null : eventDate,
      })
      setName('')
      setDescription('')
      setEventDate('')
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.errorCreate)
    }
  }

  const toggleSelect = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (): void => {
    if (!setlists) return
    setSelected(selected.size === setlists.length ? new Set() : new Set(setlists.map((s) => s.id)))
  }

  const runBulk = async (): Promise<void> => {
    const ids = [...selected]
    if (bulkAction === null || ids.length === 0) return
    for (const id of ids) {
      if (bulkAction === 'archive') await archiveSetlist.mutateAsync(id)
      else await deleteSetlist.mutateAsync(id)
    }
    setSelected(new Set())
    setBulkAction(null)
  }

  if (selectedId) {
    return <SetlistDetailScreen setlistId={selectedId} isAdmin={isAdmin} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.setlists.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.songs.subtitle}</p>
        </div>
        {isAdmin && <AddButton label={t.setlists.newSetlist} onClick={() => setDialogOpen(true)} />}
      </div>
      {error !== '' && <p className="text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.setlists.newSetlist}>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="setlist-name">{t.setlists.form.nameLabel}</Label>
              <Input id="setlist-name" placeholder={t.setlists.form.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setlist-description">{t.common.description}</Label>
              <Input id="setlist-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.events.form.descriptionPlaceholder} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setlist-date">{t.events.form.dateLabel}</Label>
              <Input id="setlist-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createSetlist.isPending || name.trim() === ''}>
                {t.setlists.form.submit}
              </Button>
            </div>
          </form>
        </AddDialog>
      )}

      {isAdmin && (setlists ?? []).length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size === (setlists ?? []).length && (setlists ?? []).length > 0}
              onChange={(v) => { if (v) toggleSelectAll(); else setSelected(new Set()) }}
              aria-label={t.setlists.allCount((setlists ?? []).length)}
            />
            <span className="text-sm text-muted-foreground">
              {selected.size === 0 ? t.setlists.allCount((setlists ?? []).length) : t.setlists.selectedCount(selected.size)}
            </span>
          </div>
          {selected.size > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setBulkAction('archive')}>
                <Archive size={14} aria-hidden="true" /> {t.setlists.archiveSelected}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => setBulkAction('delete')}>
                <Trash2 size={14} aria-hidden="true" /> {t.setlists.deleteSelected}
              </Button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label={t.common.loading}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      ) : (setlists ?? []).length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(setlists ?? []).map((s) => {
            const st = stats.get(s.id) ?? { count: 0, seconds: 0 }
            return (
              <div key={s.id} className="relative">
                {isAdmin && (
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      aria-label={`${s.name}`}
                    />
                  </div>
                )}
                <Card
                  className="cursor-pointer transition-colors hover:border-primary/50"
                  onClick={() => setSelectedId(s.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className={`text-lg ${isAdmin ? 'pl-7' : ''}`}>{s.name}</CardTitle>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {s.event_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={16} aria-hidden="true" />
                        {format(new Date(s.event_date), 'PPP')}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Music size={16} aria-hidden="true" />
                        {t.setlists.items(st.count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={16} aria-hidden="true" />
                        {formatTotal(st.seconds)}
                      </span>
                    </div>
                    {s.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                    )}
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <RowIconButton label={`${t.setlists.detail} ${s.name}`} onClick={() => setSelectedId(s.id)}>
                          <ChevronRight size={16} aria-hidden="true" />
                        </RowIconButton>
                        <RowIconButton label={`${t.setlists.archive} ${s.name}`} onClick={() => void archiveSetlist.mutateAsync(s.id)} disabled={archiveSetlist.isPending}>
                          <Archive size={16} aria-hidden="true" />
                        </RowIconButton>
                        <RowIconButton label={`${t.common.delete} ${s.name}`} onClick={() => setDeleteId(s.id)} tone="danger">
                          <Trash2 size={16} aria-hidden="true" />
                        </RowIconButton>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <ListMusic size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">{t.setlists.noSetlists}</h3>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title={t.common.delete}
        message={t.setlists.deleteConfirm}
        confirmLabel={t.common.delete}
        pending={deleteSetlist.isPending}
        onConfirm={() => { if (deleteId) void deleteSetlist.mutateAsync(deleteId).then(() => setDeleteId(null)) }}
      />
      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(open) => { if (!open) setBulkAction(null) }}
        title={bulkAction === 'archive' ? t.setlists.archiveSelected : t.setlists.deleteSelected}
        message={t.setlists.bulkConfirm(bulkAction === 'archive' ? t.setlists.archive : t.common.delete, selected.size)}
        confirmLabel={t.common.confirm}
        pending={archiveSetlist.isPending || deleteSetlist.isPending}
        onConfirm={() => void runBulk()}
      />
    </div>
  )
}
