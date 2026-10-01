import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useArchiveRehearsal,
  useCreateRehearsal,
  useRehearsalAttendance,
  useRehearsals,
  useUpsertAttendance,
} from '@/features/events/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateTimePicker } from '@/components/ui/date-picker'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { strings as t } from '@/i18n'
import { formatDateTimeIt } from '@/lib/romeTime'

type AttendanceStatus = 'available' | 'unavailable' | 'maybe'

function Attendance({ rehearsalId, memberId }: { rehearsalId: string; memberId: string }) {
  const { data: rows } = useRehearsalAttendance(rehearsalId)
  const upsert = useUpsertAttendance()
  const [status, setStatus] = useState<AttendanceStatus>('available')

  const mine = (rows ?? []).find((r) => r.member_id === memberId)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-600">
        {mine ? t.rehearsals.answerWith(mine.status) : t.rehearsals.currentAnswer}
      </span>
      <Select
        value={status}
        onValueChange={(v) => setStatus(v as AttendanceStatus)}
        options={[
          { value: 'available', label: t.rehearsals.status.available },
          { value: 'maybe', label: t.rehearsals.status.maybe },
          { value: 'unavailable', label: t.rehearsals.status.unavailable },
        ]}
        aria-label={t.rehearsals.attendance}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={upsert.isPending}
        onClick={() => upsert.mutate({ rehearsal_id: rehearsalId, member_id: memberId, status })}
      >
        {t.rehearsals.answer}
      </Button>
    </div>
  )
}

export default function Rehearsals() {
  const { user } = useAuth()
  const role = useRole()
  const isAdmin = role === 'admin' || role === 'manager'
  const { data: rehearsals, isLoading } = useRehearsals()
  const createRehearsal = useCreateRehearsal()
  const archiveRehearsal = useArchiveRehearsal()

  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')

  const now = new Date().toISOString()
  const upcoming = (rehearsals ?? []).filter((r) => r.start_time >= now)
  const past = (rehearsals ?? []).filter((r) => r.start_time < now)

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (title.trim() === '' || start === '' || end === '') return
    setError('')
    try {
      await createRehearsal.mutateAsync({
        title: title.trim(),
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        ...(location.trim() === '' ? {} : { location: location.trim() }),
      })
      setTitle('')
      setStart('')
      setEnd('')
      setLocation('')
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.errorCreate)
    }
  }

  const renderRow = (r: { id: string; title: string; start_time: string; location: string | null }) => (
    <li key={r.id} className="rounded border p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{r.title}</span>
        <span className="text-sm text-slate-500">
          {formatDateTimeIt(r.start_time)}{r.location ? ` — ${r.location}` : ''}
        </span>
      </div>
      {user && <Attendance rehearsalId={r.id} memberId={user} />}
      {isAdmin && (
        <div className="mt-2">
          <Button type="button" size="sm" variant="destructive" onClick={() => archiveRehearsal.mutate(r.id)}>
            {t.common.delete}
          </Button>
        </div>
      )}
    </li>
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.rehearsals.title}</h1>
        {isAdmin && <AddButton label={t.rehearsals.createRehearsal} onClick={() => setDialogOpen(true)} />}
      </div>
      {error !== '' && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.rehearsals.newRehearsal}>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div><Label>{t.rehearsals.form.titleLabel}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div><Label>{t.rehearsals.form.startLabel}</Label><DateTimePicker value={start} onChange={setStart} /></div>
            <div><Label>{t.rehearsals.form.endLabel}</Label><DateTimePicker value={end} onChange={setEnd} /></div>
            <div><Label>{t.rehearsals.form.locationLabel}</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <Button type="submit" disabled={createRehearsal.isPending || title.trim() === '' || start === '' || end === ''}>
              {t.rehearsals.form.submit}
            </Button>
          </form>
        </AddDialog>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-500">{t.common.loading}</p>}

      <div className="mt-4 space-y-4">
        <Card>
          <CardHeader><CardTitle>{t.rehearsals.tabs.upcoming}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {upcoming.map(renderRow)}
            </ul>
            {upcoming.length === 0 && !isLoading && <EmptyScreen icon={<CalendarDays size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.rehearsals.emptyUpcoming} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.rehearsals.tabs.past}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {past.map(renderRow)}
            </ul>
            {past.length === 0 && !isLoading && <EmptyScreen icon={<CalendarDays size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.rehearsals.emptyPast} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
