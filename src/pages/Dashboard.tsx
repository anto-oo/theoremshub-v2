import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ChevronRight, CircleChevronRight, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useLiveCounts,
  useMyAssignedSongs,
  useNextEvent,
  useNextRehearsal,
} from '@/features/dashboard/hooks'
import { useLatestBulletin } from '@/features/bulletin/hooks'
import { useSurveys } from '@/features/surveys/hooks'
import { useAuditions } from '@/features/auditions/hooks'
import { strings as t } from '@/i18n'

function formatShortDate(value: string | null | undefined): string {
  if (!value) return t.common.emptyDash
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return t.common.emptyDash
  return format(d, 'dd/MM/yyyy')
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const role = useRole()
  const counts = useLiveCounts()
  const { data: posts } = useLatestBulletin(2)
  const { data: surveys } = useSurveys()
  const { data: assigned } = useMyAssignedSongs(user ?? '')
  const { data: nextRehearsal } = useNextRehearsal()
  const { data: nextEvent } = useNextEvent()
  const { data: auditions } = useAuditions()

  const displayName = profile?.first_name?.trim() || profile?.username || t.dashboard.fallbackName
  const handle = profile?.username ? `@${profile.username}` : ''

  const openSurveys = (surveys ?? []).filter(
    (s) => s.status === 'open' && s.survey_type === 'logged_in',
  ).slice(0, 2)

  const isCandidate = role === 'candidate'
  const canSeeMusicCards = !isCandidate
  const openAuditions = (auditions ?? []).slice(0, 2)

  return (
    <div className="mx-auto w-full max-w-md space-y-4 md:max-w-2xl">
      {/* Welcome text — Figma: "Bentornato, Antonio" 32px + "@anto" 16px */}
      <header>
        <h1 className="text-[32px] leading-tight font-normal">{t.dashboard.welcome(displayName)}</h1>
        {handle !== '' && <p className="text-base">{handle}</p>}
      </header>

      {/* Bacheca — Figma: full-width card, title 24px + arrow, 2 rows 16px */}
      <section
        aria-labelledby="dashboard-bacheca-title"
        className="rounded-[13px] border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="dashboard-bacheca-title" className="text-2xl font-normal">
            {t.dashboard.sections.bulletin}
          </h2>
          <Link
            to="/bulletin"
            aria-label={t.dashboard.goTo.bulletin}
            className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <CircleChevronRight size={24} aria-hidden="true" />
          </Link>
        </div>
        {(posts ?? []).length === 0 ? (
          <p className="mt-3 text-base text-muted-foreground">{t.dashboard.empty.posts}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(posts ?? []).map((p) => (
              <li key={p.id}>
                <Link
                  to="/bulletin"
                  className="flex items-center justify-between gap-2 rounded-lg py-1 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="truncate font-normal">{p.title}</span>
                  <ChevronRight size={24} aria-hidden="true" className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Moduli attivi — Figma: full-width card, title 24px + arrow, 2 rows */}
      <section
        aria-labelledby="dashboard-surveys-title"
        className="rounded-[13px] border bg-card p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="dashboard-surveys-title" className="text-2xl font-normal">
            {t.dashboard.sections.activeForms}
          </h2>
          {role === 'admin' ? (
            <Link
              to="/surveys"
              aria-label={t.dashboard.goTo.surveys}
              className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <CircleChevronRight size={24} aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/my-surveys"
              aria-label={t.dashboard.goTo.mySurveys}
              className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <CircleChevronRight size={24} aria-hidden="true" />
            </Link>
          )}
        </div>
        {openSurveys.length === 0 ? (
          <p className="mt-3 text-base text-muted-foreground">{t.dashboard.empty.forms}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {openSurveys.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/s/${s.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg py-1 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="truncate font-normal">{s.title}</span>
                  <ExternalLink size={24} aria-hidden="true" className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canSeeMusicCards ? (
        <>
          {/* Row: Prossima prova + Prossimo evento — Figma 184x138 cards */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/rehearsals"
              className="flex min-h-[138px] flex-col justify-between rounded-[13px] border bg-card p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[22px] leading-snug font-normal">{t.dashboard.sections.nextRehearsal}</span>
                <CircleChevronRight size={24} aria-hidden="true" className="mt-1 shrink-0" />
              </span>
              <span className="text-[22px] font-normal tabular-nums">
                {formatShortDate(nextRehearsal?.start_time)}
              </span>
            </Link>
            <Link
              to="/events"
              className="flex min-h-[138px] flex-col justify-between rounded-[13px] border bg-card p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[22px] leading-snug font-normal">{t.dashboard.sections.nextEvent}</span>
                <CircleChevronRight size={24} aria-hidden="true" className="mt-1 shrink-0" />
              </span>
              <span className="text-[22px] font-normal tabular-nums">
                {formatShortDate(nextEvent?.date)}
              </span>
            </Link>
          </div>

          {/* Row: Tutti i brani + I tuoi brani */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/songs"
              className="flex min-h-[138px] flex-col justify-between rounded-[13px] border bg-card p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[22px] leading-snug font-normal">{t.dashboard.sections.allSongs}</span>
                <CircleChevronRight size={24} aria-hidden="true" className="mt-1 shrink-0" />
              </span>
              <span className="text-[22px] font-normal tabular-nums">
                {counts.songs.data ?? t.common.emptyDash}
              </span>
            </Link>
            <Link
              to="/my-songs"
              className="flex min-h-[138px] flex-col justify-between rounded-[13px] border bg-card p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[22px] leading-snug font-normal">{t.dashboard.sections.yourSongs}</span>
                <CircleChevronRight size={24} aria-hidden="true" className="mt-1 shrink-0" />
              </span>
              <span className="text-[22px] font-normal tabular-nums">
                {(assigned ?? []).length}
              </span>
            </Link>
          </div>
        </>
      ) : (
        /* Candidate: "Le tue audizioni" instead of the 2x2 music grid */
        <section
          aria-labelledby="dashboard-auditions-title"
          className="rounded-[13px] border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="dashboard-auditions-title" className="text-2xl font-normal">
              {t.dashboard.sections.yourAuditions}
            </h2>
            <Link
              to="/auditions"
              aria-label={t.dashboard.goTo.auditions}
              className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <CircleChevronRight size={24} aria-hidden="true" />
            </Link>
          </div>
          {openAuditions.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">{t.dashboard.empty.auditions}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {openAuditions.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/auditions"
                    className="flex items-center justify-between gap-2 rounded-lg py-1 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span className="truncate font-normal">{a.title}</span>
                    <ExternalLink size={24} aria-hidden="true" className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
