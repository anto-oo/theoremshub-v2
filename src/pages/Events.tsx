import { useState } from 'react'
import { Archive, Calendar, CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useRole } from '@/hooks/useRole'
import {
  useArchiveEvent,
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  useEventSetlistsMap,
  useSaveEventSetlists,
  useUpdateEvent,
} from '@/features/events/hooks'
import { useSetlists } from '@/features/setlists/hooks'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { InstrumentBadge, RowIconButton } from '@/shared/components/MediaRow'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings as t } from '@/i18n'
import { formatDateIt } from '@/lib/romeTime'
import type { Database } from '@/lib/supabase'

type EventRow = Database['public']['Tables']['events']['Row']

interface EventFormState {
  name: string
  date: string
  location: string
  description: string
  setlistIds: string[]
}

const emptyForm: EventFormState = { name: '', date: '', location: '', description: '', setlistIds: [] }

function isPast(date: string): boolean {
  return new Date(date) < new Date()
}

export default function Events() {
  const role = useRole()
  const isAdmin = role === 'admin' || role === 'manager'
  const { data: events, isLoading } = useEvents()
  const { data: setlistMap } = useEventSetlistsMap()
  const { data: setlists } = useSetlists()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const archiveEvent = useArchiveEvent()
  const deleteEvent = useDeleteEvent()
  const saveSetlists = useSaveEventSetlists()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [deleting, setDeleting] = useState<EventRow | null>(null)
  const [form, setForm] = useState<EventFormState>(emptyForm)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'archive' | 'delete' | null>(null)

  const openCreate = (): void => {
    setError('')
    setForm(emptyForm)
    setCreateOpen(true)
  }

  const openEdit = (ev: EventRow): void => {
    setError('')
    setForm({
      name: ev.name,
      date: ev.date,
      location: ev.location ?? '',
      description: ev.description ?? '',
      setlistIds: setlistMap?.[ev.id] ?? [],
    })
    setEditing(ev)
  }

  const toggleSetlist = (id: string): void => {
    setForm((f) => ({ ...f, setlistIds: f.setlistIds.includes(id) ? f.setlistIds.filter((s) => s !== id) : [...f.setlistIds, id] }))
  }

  const persist = async (): Promise<void> => {
    if (form.name.trim() === '' || form.date === '') return
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        date: form.date,
        location: form.location.trim() === '' ? null : form.location.trim(),
        description: form.description.trim() === '' ? null : form.description.trim(),
      }
      if (editing) {
        await updateEvent.mutateAsync({ id: editing.id, input: payload })
        await saveSetlists.mutateAsync({ eventId: editing.id, setlistIds: form.setlistIds })
        setEditing(null)
      } else {
        const created = await createEvent.mutateAsync(payload)
        await saveSetlists.mutateAsync({ eventId: created.id, setlistIds: form.setlistIds })
        setCreateOpen(false)
      }
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.events.errorCreate)
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
    if (!events) return
    setSelected(selected.size === events.length ? new Set() : new Set(events.map((e) => e.id)))
  }

  const runBulk = async (): Promise<void> => {
    const ids = [...selected]
    if (bulkAction === null || ids.length === 0) return
    for (const id of ids) {
      if (bulkAction === 'archive') await archiveEvent.mutateAsync(id)
      else await deleteEvent.mutateAsync(id)
    }
    setSelected(new Set())
    setBulkAction(null)
  }

  const setlistName = (id: string): string => setlists?.find((s) => s.id === id)?.name ?? id.slice(0, 8)

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event-name">{t.events.form.nameLabel}</Label>
        <Input id="event-name" placeholder={t.events.form.namePlaceholder} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-date">{t.events.form.dateLabel}</Label>
        <DatePicker value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} aria-label={t.events.form.dateLabel} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-location">{t.events.form.locationLabel}</Label>
        <Input id="event-location" placeholder={t.events.form.locationPlaceholder} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-description">{t.events.form.descriptionLabel}</Label>
        <textarea
          id="event-description"
          className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          rows={3}
          placeholder={t.events.form.descriptionPlaceholder}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t.events.form.setlistsLabel}</Label>
        {(setlists ?? []).length > 0 ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {(setlists ?? []).map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                  <Checkbox checked={form.setlistIds.includes(s.id)} onChange={() => toggleSetlist(s.id)} aria-label={s.name} />
                  <span className="min-w-0 truncate">{s.name}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.events.form.noSetlists}</p>
        )}
      </div>
      {error !== '' && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-normal">{t.events.title}</h1>
        {isAdmin && <AddButton label={t.events.newEvent} onClick={openCreate} />}
      </div>
      {error !== '' && !createOpen && !editing && (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {isAdmin && (events ?? []).length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size === (events ?? []).length && (events ?? []).length > 0}
              onChange={(v) => { if (v) toggleSelectAll(); else setSelected(new Set()) }}
              aria-label={t.events.allCount((events ?? []).length)}
            />
            <span className="text-sm text-muted-foreground">
              {selected.size === 0 ? t.events.allCount((events ?? []).length) : t.events.selectedCount(selected.size)}
            </span>
          </div>
          {selected.size > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setBulkAction('archive')}>
                <Archive size={14} aria-hidden="true" /> {t.events.archiveSelected}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => setBulkAction('delete')}>
                <Trash2 size={14} aria-hidden="true" /> {t.events.deleteSelected}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {isLoading && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" aria-label={t.common.loading}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-[16px] border border-white/10 bg-card" />
            ))}
          </div>
        )}
        {!isLoading && (events ?? []).length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(events ?? []).map((ev) => {
              const past = isPast(ev.date)
              const linked = setlistMap?.[ev.id] ?? []
              return (
                <li key={ev.id} className="relative">
                  {isAdmin && (
                    <span className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} aria-label={`${ev.name}`} />
                    </span>
                  )}
                  <div className={`flex h-full flex-col rounded-[16px] border border-white/10 bg-[#050a16] px-5 pt-4 pb-3 text-white transition-colors hover:bg-[#1b2542] ${past ? 'opacity-60' : ''}`}>
                    <div className={`min-w-0 flex-1 ${isAdmin ? 'pl-7' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-[22px] leading-tight font-normal">{ev.name}</p>
                        {past && (
                          <span className="inline-flex h-5 shrink-0 items-center rounded-[11px] bg-secondary px-2.5 text-[11px] text-secondary-foreground">
                            {t.events.past}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-white/90">
                        <Calendar size={14} aria-hidden="true" />
                        {formatDateIt(ev.date)}
                      </p>
                      {ev.location && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-white/90">
                          <MapPin size={14} aria-hidden="true" />
                          <span className="truncate">{ev.location}</span>
                        </p>
                      )}
                      {linked.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {linked.map((id) => (
                            <InstrumentBadge key={id} name={setlistName(id)} />
                          ))}
                        </div>
                      )}
                      {ev.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-white/70">{ev.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <span className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
                        <RowIconButton label={`${t.common.edit} ${ev.name}`} onClick={() => openEdit(ev)}>
                          <Pencil size={16} aria-hidden="true" />
                        </RowIconButton>
                        <RowIconButton label={`${t.events.archive} ${ev.name}`} onClick={() => void archiveEvent.mutateAsync(ev.id)} disabled={archiveEvent.isPending}>
                          <Archive size={16} aria-hidden="true" />
                        </RowIconButton>
                        <RowIconButton label={`${t.common.delete} ${ev.name}`} onClick={() => setDeleting(ev)} tone="danger">
                          <Trash2 size={16} aria-hidden="true" />
                        </RowIconButton>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {!isLoading && (events ?? []).length === 0 && (
          <EmptyScreen icon={<CalendarDays size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.events.empty} />
        )}
      </div>

      {isAdmin && (
        <AddDialog open={createOpen} onOpenChange={setCreateOpen} title={t.events.newEvent} className="max-w-lg">
          {formFields}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t.common.cancel}</Button>
            <Button type="button" disabled={createEvent.isPending || saveSetlists.isPending || form.name.trim() === '' || form.date === ''} onClick={() => void persist()}>
              {t.common.create}
            </Button>
          </div>
        </AddDialog>
      )}

      <AddDialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }} title={t.common.edit} className="max-w-lg">
        {formFields}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t.common.cancel}</Button>
          <Button type="button" disabled={updateEvent.isPending || saveSetlists.isPending} onClick={() => void persist()}>
            {t.common.save}
          </Button>
        </div>
      </AddDialog>

      <AddDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null) }} title={t.common.delete}>
        <p className="text-sm text-muted-foreground">{t.events.deleteConfirm}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDeleting(null)}>{t.common.cancel}</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteEvent.isPending}
            onClick={() => { if (deleting) void deleteEvent.mutateAsync(deleting.id).then(() => setDeleting(null)) }}
          >
            {t.common.delete}
          </Button>
        </div>
      </AddDialog>

      <AddDialog open={bulkAction !== null} onOpenChange={(open) => { if (!open) setBulkAction(null) }} title={bulkAction === 'archive' ? t.events.archiveSelected : t.events.deleteSelected}>
        <p className="text-sm text-muted-foreground">{t.events.bulkConfirm(bulkAction === 'archive' ? t.events.archive : t.common.delete, selected.size)}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setBulkAction(null)}>{t.common.cancel}</Button>
          <Button type="button" variant={bulkAction === 'delete' ? 'destructive' : 'default'} disabled={archiveEvent.isPending || deleteEvent.isPending} onClick={() => void runBulk()}>
            {t.common.confirm}
          </Button>
        </div>
      </AddDialog>
    </div>
  )
}
