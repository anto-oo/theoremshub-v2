import { CheckCircle2, ClipboardList, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAllMySurveyResponses, useSurveys } from '@/features/surveys/hooks'
import { countAnswers } from '@/features/surveys/lib/results'
import { MediaRow } from '@/shared/components/MediaRow'
import { EmptyScreen, LoadingState } from '@/shared/components/StateFeedback'
import { strings as t } from '@/i18n'

// Open forms for members: RLS only exposes status = 'open' to non-admins, so
// this is every form they can still fill in plus the ones already filled in.
// Anonymous answers (collect_respondent off) are not linked to a user, so
// those forms always show as pending.
export default function MySurveys() {
  const { user } = useAuth()
  const { data: surveys, isLoading } = useSurveys()
  const { data: mine } = useAllMySurveyResponses(user ?? null)

  const open = (surveys ?? []).filter((s) => s.status === 'open')

  const given = new Map<string, number>()
  for (const r of mine ?? []) {
    given.set(r.survey_id, (given.get(r.survey_id) ?? 0) + countAnswers(r.answers))
  }

  return (
    <div>
      <h1 className="text-[32px] leading-tight font-normal">{t.mySurveys.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.mySurveys.subtitle}</p>
      {isLoading && (
        <div className="mt-4">
          <LoadingState />
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {open.map((s) => {
          const answered = given.has(s.id)
          return (
            <MediaRow
              key={s.id}
              hideImage
              title={s.title}
              subtitle={s.description ?? ''}
              footer={
                answered ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {t.mySurveys.completed} · {t.mySurveys.answersGiven(given.get(s.id) ?? 0)}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{t.mySurveys.pending}</p>
                )
              }
              action={
                <Link
                  to={`/s/${s.id}`}
                  aria-label={t.mySurveys.openForm(s.title)}
                  className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <ExternalLink size={20} aria-hidden="true" />
                </Link>
              }
            />
          )
        })}
      </ul>
      {open.length === 0 && !isLoading && (
        <EmptyScreen
          icon={<ClipboardList size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />}
          title={t.mySurveys.empty}
        />
      )}
    </div>
  )
}
