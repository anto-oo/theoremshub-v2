import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { badgesApi, type PublicBadgeProfile } from '@/features/badges/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings as t } from '@/i18n'

function BadgeProfileView({ profile }: { profile: PublicBadgeProfile }) {
  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">
          {profile.first_name ?? ''} {profile.last_name ?? ''}
        </h1>
        <p className="mt-2 text-sm">{t.badgePublic.memberSince(new Date(profile.created_at).toLocaleDateString('it-IT'))}</p>
      </div>
    </div>
  )
}

export function BadgeByToken() {
  const { token } = useParams()
  const [profile, setProfile] = useState<PublicBadgeProfile | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setDone(true)
      return
    }
    badgesApi
      .lookupByToken(token)
      .then((p) => {
        setProfile(p)
        setDone(true)
      })
      .catch(() => {
        setError(t.badgePublic.notFound)
        setDone(true)
      })
  }, [token])

  if (!done) return <div className="min-h-screen bg-white p-6 text-black">{t.common.loading}</div>
  if (error !== '' || !profile) {
    return <div className="min-h-screen bg-white p-6 text-black">{error !== '' ? error : t.badgePublic.notFound}</div>
  }
  return <BadgeProfileView profile={profile} />
}

export function BadgeByCode() {
  const [code, setCode] = useState('')
  const [profile, setProfile] = useState<PublicBadgeProfile | null>(null)
  const [error, setError] = useState('')

  const handleLookup = async (): Promise<void> => {
    setError('')
    setProfile(null)
    try {
      const p = await badgesApi.lookupByCode(code.trim())
      if (!p) setError(t.badgePublic.notFound)
      else setProfile(p)
    } catch {
      setError(t.badgePublic.notFound)
    }
  }

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">{t.badgePublic.title}</h1>
        <p className="mt-2 text-sm">{t.badgePublic.hintWithQr}</p>
        <div className="mt-4 space-y-2">
          <div>
            <Label>{t.badgePublic.codeLabel}</Label>
            <Input value={code} maxLength={6} onChange={(e) => setCode(e.target.value)} placeholder={t.badgePublic.codePlaceholder} />
          </div>
          <Button type="button" disabled={code.trim().length !== 6} onClick={handleLookup}>
            {t.badgePublic.search}
          </Button>
        </div>
        {error !== '' && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {profile && (
          <div className="mt-4 rounded border p-3">
            <p className="font-medium">
              {profile.first_name ?? ''} {profile.last_name ?? ''}
            </p>
            <p className="text-sm">{t.badgePublic.memberSince(new Date(profile.created_at).toLocaleDateString('it-IT'))}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function BadgeQr({ token, size }: { token: string; size?: number }) {
  const url = `${window.location.origin}/badge/${token}`
  return <QRCodeSVG value={url} size={size ?? 128} />
}
