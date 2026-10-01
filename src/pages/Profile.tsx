import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOwnBadges } from '@/features/badges/hooks'
import {
  useAudition,
  useAuditionApplicationInstruments,
  useMyAuditionApplications,
} from '@/features/auditions/hooks'
import { useSongsByIds } from '@/features/songs/hooks'
import { supabase } from '@/lib/supabase'
import { formatDateIt } from '@/lib/romeTime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BadgeQr } from '@/pages/BadgePublic'
import { strings as t } from '@/i18n'

function MyAuditionRow({ applicationId, auditionId, status }: { applicationId: string; auditionId: string; status: 'pending' | 'admitted' | 'rejected' }) {
  const { data: audition } = useAudition(auditionId)
  const { data: items } = useAuditionApplicationInstruments(applicationId)
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    supabase
      .from('instrument_roles')
      .select('id, name')
      .order('display_order')
      .then(({ data }) => {
        if (data) setRoles(data)
      })
  }, [])
  const songIds = (items ?? []).map((it) => it.song_id).filter((v): v is string => typeof v === 'string')
  const { data: songs } = useSongsByIds(songIds)
  const songById = new Map((songs ?? []).map((s) => [s.id, s]))
  const roleName = (id: number) => roles.find((r) => r.id === id)?.name ?? String(id)
  if (!audition) return null
  return (
    <li className="rounded border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium">{audition.title}</span>
          <span className="text-slate-500"> {formatDateIt(audition.date)}</span>
          {audition.location ? <span className="text-slate-500"> — {audition.location}</span> : null}
        </div>
        <Badge variant="secondary">{t.auditions.status[status]}</Badge>
      </div>
      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
        {(items ?? []).map((it) => {
          const song = it.song_id ? songById.get(it.song_id) : undefined
          return (
            <li key={it.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1">
                {roleName(it.instrument_role_id)} — {song ? t.auditions.songPicked(song.title, song.artist) : t.auditions.noSong}
              </span>
              <Badge variant="secondary">{t.auditions.status[it.status]}</Badge>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

function MyAudition() {
  const { user } = useAuth()
  const { data: apps } = useMyAuditionApplications(user ?? undefined)
  if (!apps || apps.length === 0) return null
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{t.profile.myAudition}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {apps.map((a) => (
            <MyAuditionRow key={a.id} applicationId={a.id} auditionId={a.audition_id} status={a.status} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function Profile() {
  const { user, profile } = useAuth()
  const { data: badges } = useOwnBadges()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [classe, setClasse] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setClasse(profile.classe ?? '')
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSaved('')
    try {
      const fn = firstName.trim() === '' ? null : firstName.trim()
      const ln = lastName.trim() === '' ? null : lastName.trim()
      const { error: upError } = await supabase
        .from('profiles')
        .update({
          first_name: fn,
          last_name: ln,
          full_name: [fn, ln].filter(Boolean).join(' ') || null,
          classe: classe.trim() === '' ? null : classe.trim(),
        })
        .eq('id', user)
      if (upError) throw upError
      setSaved(t.profile.saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.errorSave)
    } finally {
      setSaving(false)
    }
  }

  const handlePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setPwMsg('')
    try {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
      if (pwError) throw pwError
      setNewPassword('')
      setPwMsg(t.profile.passwordUpdated)
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : t.common.errorGeneric)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t.profile.title}</h1>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t.profile.editTitle}</CardTitle>
          <CardDescription>{t.profile.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {error !== '' && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {saved !== '' && <p className="mb-2 text-sm text-green-700">{saved}</p>}
          <form className="space-y-4" onSubmit={handleSave}>
            <div><Label>{t.profile.username}</Label><Input value={profile?.username ?? ''} disabled /></div>
            <div><Label>{t.profile.name}</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div><Label>{t.profile.surname}</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            <div><Label>{t.profile.className}</Label><Input value={classe} onChange={(e) => setClasse(e.target.value)} /></div>
            <Button type="submit" disabled={saving}>{t.profile.save}</Button>
          </form>
          <form className="mt-6 space-y-4 border-t pt-4" onSubmit={handlePassword}>
            <div><Label>{t.profile.newPassword}</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} /></div>
            <Button type="submit" disabled={newPassword.length < 6}>{t.profile.changePassword}</Button>
            {pwMsg !== '' && <p className="text-sm text-slate-600">{pwMsg}</p>}
          </form>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t.profile.myBadges}</CardTitle>
          <CardDescription>{t.common.readOnly}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(badges ?? []).map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <BadgeQr token={b.qr_token} size={64} />
                <span className="font-mono">{b.short_code}</span>
              </li>
            ))}
          </ul>
          {(badges ?? []).length === 0 && <p className="text-sm text-slate-500">{t.profile.noActiveBadges}</p>}
        </CardContent>
      </Card>
      <MyAudition />
    </div>
  )
}
