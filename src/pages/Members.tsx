import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useDeleteMember,
  useInstruments,
  useMemberInstruments,
  useMemberInstrumentIds,
  useMembersAdmin,
  useSetMemberInstruments,
  useSetTemporaryPassword,
  useUpdateMember,
} from '@/features/admin/hooks'
import { useCreateBadge, useMemberBadges, useRevokeBadge } from '@/features/badges/hooks'
import type { AppRole } from '@/lib/supabase'
import { InstrumentBadge, MediaRow, RoleBadge, RowIconButton } from '@/shared/components/MediaRow'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { AddDialog } from '@/shared/components/AddDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Radio } from '@/components/ui/radio'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BadgeQr } from '@/pages/BadgePublic'
import { strings as t } from '@/i18n'

const ROLES: AppRole[] = ['admin', 'manager', 'user', 'candidate']

const TEMP_PASSWORD_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

function randomTempPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => TEMP_PASSWORD_CHARS[b % TEMP_PASSWORD_CHARS.length])
    .join('')
}

// Badge management lives here, inside member management, and is strictly
// admin-only: managers never see this UI (not even the section header).
function MemberBadgeManager({ memberId }: { memberId: string }) {
  const { user } = useAuth()
  const { data: badges } = useMemberBadges(memberId)
  const createBadge = useCreateBadge()
  const revokeBadge = useRevokeBadge()
  const [note, setNote] = useState('')

  const handleCreate = async (): Promise<void> => {
    if (!user) return
    await createBadge.mutateAsync({ memberId, createdBy: user, adminNote: note })
    setNote('')
  }

  return (
    <div className="mt-2 border-t pt-2">
      <p className="text-sm font-medium">{t.members.badge}</p>
      <ul className="mt-1 space-y-2">
        {(badges ?? []).map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
            <BadgeQr token={b.qr_token} size={64} />
            <span className="font-mono">{b.short_code}</span>
            {b.admin_note !== '' && <span className="text-slate-500">{b.admin_note}</span>}
            <Button type="button" size="sm" variant="destructive" onClick={() => revokeBadge.mutate(b.id)}>
              {t.members.revoke}
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <Label>{t.members.adminNoteOptional}</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.members.adminNote} />
        </div>
        <Button type="button" size="sm" onClick={handleCreate}>
          {t.members.createBadge}
        </Button>
      </div>
    </div>
  )
}

// Admin-only dialog for managing a user: name, class, role, instruments,
// temporary password, delete. Managers never see the button that opens it.
function ManageMemberDialog({ memberId, onOpenChange }: { memberId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data: members } = useMembersAdmin()
  const { data: instruments } = useInstruments()
  const { data: memberLinks } = useMemberInstrumentIds(memberId)
  const updateMember = useUpdateMember()
  const setInstruments = useSetMemberInstruments()
  const applyTempPassword = useSetTemporaryPassword()
  const deleteMember = useDeleteMember()

  const member = (members ?? []).find((m) => m.id === memberId) ?? null

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [classe, setClasse] = useState('')
  const [role, setRole] = useState<AppRole>('user')
  const [instrumentIds, setInstrumentIds] = useState<number[]>([])
  const [primaryId, setPrimaryId] = useState<number | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name ?? '')
      setLastName(member.last_name ?? '')
      setClasse(member.classe ?? '')
      setRole(member.role)
      setTempPassword('')
      setMsg('')
      setPwError('')
    }
  }, [member?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (memberLinks) {
      setInstrumentIds(memberLinks.map((l) => l.instrument_role_id))
      setPrimaryId(memberLinks.find((l) => l.is_primary)?.instrument_role_id ?? null)
    }
  }, [memberLinks])

  const toggleInstrument = (id: number): void => {
    setInstrumentIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
      if (primaryId === id && !next.includes(id)) setPrimaryId(null)
      if (primaryId === null && next.length === 1) setPrimaryId(next[0])
      return next
    })
  }

  const handleSave = async (): Promise<void> => {
    if (!member) return
    const fn = firstName.trim() === '' ? null : firstName.trim()
    const ln = lastName.trim() === '' ? null : lastName.trim()
    await updateMember.mutateAsync({
      id: member.id,
      patch: {
        first_name: fn,
        last_name: ln,
        full_name: [fn, ln].filter(Boolean).join(' ') || null,
        classe: classe.trim() === '' ? null : classe.trim(),
        role,
      },
    })
    await setInstruments.mutateAsync({ memberId: member.id, instrumentIds, primaryId })
    setMsg(t.members.saved)
  }

  const handleTempPassword = async (): Promise<void> => {
    if (!member || tempPassword.length < 6) return
    setMsg('')
    setPwError('')
    try {
      await applyTempPassword.mutateAsync({ memberId: member.id, password: tempPassword })
      setTempPassword('')
      setMsg(t.members.tempPasswordSet)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : t.common.errorGeneric)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!member || !window.confirm(t.members.deleteConfirm)) return
    await deleteMember.mutateAsync(member.id)
    onOpenChange(false)
  }

  return (
    <AddDialog open={memberId !== null} onOpenChange={onOpenChange} title={t.members.manageTitle}>
      {member === null ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <div className="space-y-4">
          {msg !== '' && <p className="text-sm text-green-700">{msg}</p>}
          <div><Label>{t.members.firstName}</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><Label>{t.members.lastName}</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div><Label>{t.members.className}</Label><Input value={classe} onChange={(e) => setClasse(e.target.value)} /></div>
          <div>
            <Label>{t.members.role}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as AppRole)}
              options={ROLES.map((r) => ({ value: r, label: r }))}
              className="w-full"
            />
          </div>
          <div>
            <Label>{t.members.instruments}</Label>
            <ul className="mt-1 space-y-1">
              {(instruments ?? []).map((ins) => (
                <li key={ins.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={instrumentIds.includes(ins.id)}
                    onChange={() => toggleInstrument(ins.id)}
                    aria-label={ins.name}
                  />
                  <span className="flex-1">{ins.name}</span>
                  {instrumentIds.includes(ins.id) && (
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <Radio
                        name="primary-instrument"
                        checked={primaryId === ins.id}
                        onChange={() => setPrimaryId(ins.id)}
                        aria-label={`${t.members.primaryInstrument} ${ins.name}`}
                      />
                      {t.members.primaryInstrument}
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Button type="button" disabled={updateMember.isPending || setInstruments.isPending} onClick={handleSave}>
            {t.members.save}
          </Button>
          <div className="border-t pt-4">
            <Link className="font-medium text-primary underline underline-offset-4 text-sm" to={`/members/${member.id}`}>
              {t.members.detail}
            </Link>
          </div>
          <MemberBadgeManager memberId={member.id} />
          <div className="border-t pt-4">
            <Label>{t.members.tempPassword}</Label>
            <p className="text-xs text-slate-500">{t.members.tempPasswordHint}</p>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                minLength={6}
                className="flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => setTempPassword(randomTempPassword())}>
                {t.members.generate}
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={tempPassword.length < 6 || applyTempPassword.isPending}
              onClick={handleTempPassword}
            >
              {t.members.setTempPassword}
            </Button>
            {pwError !== '' && <p className="text-sm text-red-600">{pwError}</p>}
          </div>
          <div className="border-t pt-4">
            <Button type="button" size="sm" variant="destructive" onClick={handleDelete}>
              {t.members.deleteUser}
            </Button>
          </div>
        </div>
      )}
    </AddDialog>
  )
}

export default function Members() {
  const role = useRole()
  const isAdmin = role === 'admin'
  const { data: members } = useMembersAdmin()
  const { data: instrumentsByMember } = useMemberInstruments()
  const [managingId, setManagingId] = useState<string | null>(null)

  return (
    <div>
      <h1 className="text-[32px] leading-tight font-normal">{t.members.title}</h1>
      <ul className="mt-4 space-y-3">
        {(members ?? []).map((m) => {
          const fullName = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.username
          const subtitle = [m.classe, m.username ? `@${m.username}` : '']
            .filter((s) => s !== '' && s !== null)
            .join(' | ')
          const instruments = instrumentsByMember?.get(m.id) ?? []
          return (
            <MediaRow
              key={m.id}
              title={fullName}
              titleBadge={<RoleBadge role={m.role} />}
              subtitle={subtitle}
              footer={
                instruments.length > 0 || !isAdmin ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {instruments.map((name) => (
                      <InstrumentBadge key={name} name={name} />
                    ))}
                    {!isAdmin && (
                      <Link className="font-medium text-primary underline underline-offset-4 text-sm" to={`/members/${m.id}`}>
                        {t.members.detail}
                      </Link>
                    )}
                  </div>
                ) : undefined
              }
              action={
                isAdmin ? (
                  <RowIconButton label={`${t.members.manage} ${fullName}`} onClick={() => setManagingId(m.id)}>
                    <SlidersHorizontal size={16} aria-hidden="true" />
                  </RowIconButton>
                ) : undefined
              }
            />
          )
        })}
      </ul>
      {(members ?? []).length === 0 && (
        <EmptyScreen icon={<Users size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.members.empty} />
      )}
      {isAdmin && (
        <ManageMemberDialog memberId={managingId} onOpenChange={(open) => { if (!open) setManagingId(null) }} />
      )}
    </div>
  )
}
