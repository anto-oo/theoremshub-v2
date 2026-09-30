import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMySurveyResponses, useSubmitSurveyResponse, useSurvey } from '@/features/surveys/hooks'
import { validateAnswers, type SurveyAnswers, type SurveyQuestion } from '@/features/surveys/lib/results'
import { strings as t } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Radio } from '@/components/ui/radio'
import { Card, CardContent } from '@/components/ui/card'

function asQuestions(value: unknown): SurveyQuestion[] {
  if (!Array.isArray(value)) return []
  return value as SurveyQuestion[]
}

function readAnonCount(key: string): number {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : raw === '1' ? 1 : 0
  } catch {
    return 0
  }
}

// Survey answer page inside the app shell — same UI as the rest of the site.
// The route itself has no auth guard so open surveys stay answerable anonymously.
// Anti-abuse: server trigger enforces max_responses_per_user for identified
// answers; anonymous re-submission is only discouraged via a localStorage counter.
export default function SurveyPublic() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: survey, isLoading } = useSurvey(id ?? '')
  const submit = useSubmitSurveyResponse()

  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const doneKey = `survey_done_${id ?? ''}`

  // Legacy rows pre-migration have no columns: default to identified, max 1.
  const collect = (survey?.collect_respondent ?? true) as boolean
  const max = (survey?.max_responses_per_user ?? 1) as number | null
  const identified = collect && user !== null

  const { data: mine } = useMySurveyResponses(id ?? '', identified ? (user as string) : null)
  const myCount = identified ? (mine?.length ?? 0) : readAnonCount(doneKey)
  // Identified: NULL = unlimited (server-enforced). Anonymous: same setting as
  // a frontend per-browser limit, defaulting to 1 when unset.
  const cap = max ?? (identified ? null : 1)
  const limitReached = cap !== null && myCount >= cap
  const remaining = cap === null ? null : Math.max(0, cap - myCount - (sent ? 1 : 0))
  const canAnswerMore = remaining === null || remaining > 0

  const questions = useMemo(() => asQuestions(survey?.questions), [survey])

  const setSingle = (qid: string, oid: string): void => {
    setAnswers((a) => ({ ...a, [qid]: oid }))
  }

  const setText = (qid: string, value: string): void => {
    setAnswers((a) => ({ ...a, [qid]: value }))
  }

  const toggleMulti = (qid: string, oid: string): void => {
    setAnswers((a) => {
      const cur = a[qid]
      const list = Array.isArray(cur) ? cur : []
      return { ...a, [qid]: list.includes(oid) ? list.filter((x) => x !== oid) : [...list, oid] };
    })
  }

  const handleSubmit = async (): Promise<void> => {
    if (!id) return
    const v = validateAnswers(questions, answers)
    setErrors(v.errors)
    if (!v.ok) return
    // Cover every question key (open questions may be untouched).
    const full: SurveyAnswers = { ...answers }
    for (const q of questions) {
      if (!(q.id in full)) full[q.id] = ''
    }
    setSubmitError('')
    try {
      await submit.mutateAsync({
        survey_id: id,
        ...(identified ? { respondent_id: user as string } : {}),
        answers: full,
      })
    } catch {
      setSubmitError(t.surveys.limitReached)
      return
    }
    try {
      window.localStorage.setItem(doneKey, String(readAnonCount(doneKey) + 1))
    } catch {
      // localStorage unavailable: submission already recorded server-side
    }
    setSent(true)
    setAnswers({})
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">{t.surveyPublic.loading}</p>
  if (!survey || survey.status !== 'open') {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t.surveyPublic.unavailable}</p>
        </CardContent>
      </Card>
    )
  }
  if ((sent && !canAnswerMore) || (!sent && limitReached)) {
    return (
      <div>
        <h1 className="text-[32px] leading-tight font-normal">{survey.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {identified || (cap !== null && myCount >= cap) ? t.surveys.limitReached : t.surveys.alreadySubmitted}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-[32px] leading-tight font-normal">{survey.title}</h1>
      {survey.description && <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>}
      {sent && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t.surveys.alreadySubmitted}
          {remaining !== null && remaining > 0 && ` ${t.surveys.remaining(remaining)}`}
        </p>
      )}
      {!sent && remaining !== null && remaining > 0 && myCount > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">{t.surveys.remaining(remaining)}</p>
      )}
      {sent && canAnswerMore ? (
        <Button type="button" className="mt-4" onClick={() => setSent(false)}>
          {t.surveys.answerAgain}
        </Button>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardContent className="pt-4">
                  <p className="font-medium">{q.text}</p>
                  {q.type === 'open_text' ? (
                    <textarea
                      className="mt-2 min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                      placeholder={t.surveys.form.answerPlaceholder}
                      value={typeof answers[q.id] === 'string' ? answers[q.id] : ''}
                      onChange={(e) => setText(q.id, e.target.value)}
                    />
                  ) : (
                    <div className="mt-2 space-y-1">
                      {q.options.map((o) => {
                        const cur = answers[q.id]
                        const checked = Array.isArray(cur) ? cur.includes(o.id) : cur === o.id
                        return (
                          <label key={o.id} className="flex items-center gap-2 text-sm">
                            {q.type === 'single_choice' ? (
                              <Radio
                                name={q.id}
                                checked={checked}
                                onChange={() => setSingle(q.id, o.id)}
                                aria-label={o.text}
                              />
                            ) : (
                              <Checkbox
                                checked={checked}
                                onChange={() => toggleMulti(q.id, o.id)}
                                aria-label={o.text}
                              />
                            )}
                            {o.text}
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {errors[q.id] && <p className="mt-1 text-sm text-destructive">{errors[q.id]}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          {submitError !== '' && <p className="mt-2 text-sm text-destructive">{submitError}</p>}
          <Button type="button" className="mt-4" disabled={submit.isPending} onClick={handleSubmit}>
            {t.surveyPublic.submit}
          </Button>
        </>
      )}
    </div>
  )
}
