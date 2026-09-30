import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMembersAdmin } from '@/features/admin/hooks'
import { useMemberBadges } from '@/features/badges/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBadge } from '@/shared/components/MediaRow'
import { BadgeQr } from '@/pages/BadgePublic'
import { strings as t } from '@/i18n'

export default function MemberDetail() {
  const { id } = useParams()
  const { data: members, isLoading } = useMembersAdmin()
  const { data: badges } = useMemberBadges(id ?? '')

  const member = useMemo(() => (members ?? []).find((m) => m.id === id) ?? null, [members, id])

  if (isLoading) return <p className="text-sm text-slate-500">{t.common.loading}</p>
  if (!member) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t.memberDetail.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.memberDetail.notFound}</p>
        <Link className="mt-2 inline-block text-sm text-blue-600 underline" to="/members">{t.memberDetail.backToMembers}</Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{t.memberDetail.title}</h1>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            {member.first_name ?? ''} {member.last_name ?? ''} ({member.username})
          </CardTitle>
          <CardDescription>{t.memberDetail.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RoleBadge role={member.role} />
            {member.member_number !== null && (
              <span className="text-sm text-slate-500">#{member.member_number}</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium">{t.memberDetail.activeBadges((badges ?? []).length)}</p>
            <ul className="mt-2 space-y-2">
              {(badges ?? []).map((b) => (
                <li key={b.id} className="flex items-center gap-3 text-sm">
                  <BadgeQr token={b.qr_token} size={64} />
                  <span className="font-mono">{b.short_code}</span>
                </li>
              ))}
            </ul>
            {(badges ?? []).length === 0 && <p className="text-sm text-slate-500">{t.memberDetail.noActiveBadges}</p>}
          </div>
          <Link className="mt-4 inline-block text-sm text-blue-600 underline" to="/members">
            {t.memberDetail.backToMembers}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
