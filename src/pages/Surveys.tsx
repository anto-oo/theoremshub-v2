import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCreateSurvey,
  useDeleteSurvey,
  useSurveyResponses,
  useSurveys,
  useUpdateSurvey,
} from '@/features/surveys/hooks'
import { computeSurveyResults, type SurveyAnswers, type SurveyQuestion } from '@/features/surveys/lib/results'
import { strings as t } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Radio } from '@/components/ui/radio'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { Badge } from '@/components/ui/badge'

function asQuestions(value: unknown): SurveyQuestion[] {
  if (!Array.isArray(value)) return []
  return value as SurveyQuestion[]
}

function asAnswers(value: unknown): SurveyAnswers {
  if (typeof value !== 'object' || value === null) return {}
  return value as SurveyAnswers
}

export default function Surveys() {
  const { user } = useAuth()
  const { data: surveys } = useSurveys()
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [surveyType, setSurveyType] = useState<'open' | 'logged_in'>('logged_in')
  const [collectRespondent, setCollectRespondent] = useState(true)
  const [maxResponses, setMaxResponses] = useState('1')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [qText, setQText] = useState('')
  const [qKind, setQKind] = useState<'single_choice' | 'multiple_choice' | 'open_text'>('single_choice')
  const [qOptions, setQOptions] = useState<string[]>(['', ''])
  const [qMin, setQMin] = useState('0')
  const [qMax, setQMax] = useState('1')
  const [preview, setPreview] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [draftCollect, setDraftCollect] = useState(true)
  const [draftMax, setDraftMax] = useState('')
  // Which open-text result lists are expanded (show all answers).
  const [expandedTexts, setExpandedTexts] = useState<Record<string, boolean>>({})

  const selected = useMemo(
    () => (surveys ?? []).find((s) => s.id === selectedId) ?? null,
    [surveys, selectedId],
  )
  const questions = useMemo(() => (selected ? asQuestions(selected.questions) : []), [selected])
  const { data: responses } = useSurveyResponses(selectedId ?? '')

  useEffect(() => {
    setDraftCollect(selected?.collect_respondent ?? true)
    setDraftMax(selected?.max_responses_per_user != null ? String(selected.max_responses_per_user) : '')
  }, [selected?.id])

  const results = useMemo(() => {
    if (!selected) return []
    return computeSurveyResults(
      questions,
      (responses ?? []).map((r) => ({ answers: asAnswers(r.answers) })),
    )
  }, [selected, questions, responses])

  const handleCreate = async (): Promise<void> => {
    if (!user || title.trim() === '') return
    setError('')
    // Empty = unlimited (NULL). Otherwise must be >= 1.
    const max = maxResponses.trim() === '' ? null : Math.max(1, Math.floor(Number(maxResponses)))
    if (maxResponses.trim() !== '' && (!Number.isFinite(max) || (max as number) < 1)) {
      setError(t.surveys.form.maxResponsesLabel)
      return
    }
    try {
      const created = await createSurvey.mutateAsync({
        title: title.trim(),
        ...(description.trim() === '' ? {} : { description: description.trim() }),
        questions: [],
        survey_type: surveyType,
        collect_respondent: collectRespondent,
        // Same cap for identified (server-enforced) and anonymous
        // (frontend localStorage limit) answers.
        max_responses_per_user: max,
        created_by: user,
      })
      setTitle('')
      setDescription('')
      setSelectedId(created.id)
      setDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.errorCreate)
    }
  }

  const handleAddQuestion = async (): Promise<void> => {
    if (!selected || qText.trim() === '') return
    const isOpen = qKind === 'open_text'
    const options = isOpen
      ? []
      : qOptions.map((o) => o.trim()).filter((o) => o !== '')
    if (!isOpen && options.length < 2) {
      setError(t.surveys.form.minTwoOptions)
      return
    }
    const question: SurveyQuestion = {
      id: crypto.randomUUID(),
      type: qKind,
      text: qText.trim(),
      options: options.map((text) => ({ id: crypto.randomUUID(), text })),
      ...(qKind === 'multiple_choice'
        ? { min_select: Number(qMin), max_select: Number(qMax) }
        : {}),
    }
    setError('')
    await updateSurvey.mutateAsync({ id: selected.id, data: { questions: [...questions, question] } })
    setQText('')
    setQOptions(['', ''])
  }

  const handleSaveSettings = async (): Promise<void> => {
    if (!selected) return
    setError('')
    const raw = draftMax.trim()
    const next = raw === '' ? null : Math.max(1, Math.floor(Number(raw)))
    if (raw !== '' && (!Number.isFinite(next) || (next as number) < 1)) {
      setError(t.surveys.form.maxResponsesLabel)
      return
    }
    await updateSurvey.mutateAsync({
      id: selected.id,
      data: { collect_respondent: draftCollect, max_responses_per_user: next },
    })
  }

  const handleCopyLink = async (id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`)
      setCopyMsg(t.surveys.copied)
    } catch {
      setCopyMsg(t.surveys.copyFailed)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.surveys.title}</h1>
        <AddButton label={t.surveys.newSurvey} onClick={() => setDialogOpen(true)} />
      </div>
      {error !== '' && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {copyMsg !== '' && <p className="mt-2 text-sm text-slate-600">{copyMsg}</p>}

      <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.surveys.newSurvey}>
        <div className="space-y-2">
          <div><Label>{t.surveys.form.titleLabel}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>{t.surveys.form.descriptionLabel}</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div>
            <Label>{t.surveys.form.typeLabel}</Label>
            <Select
              value={surveyType}
              onValueChange={(v) => setSurveyType(v === 'open' ? 'open' : 'logged_in')}
              options={[
                { value: 'logged_in', label: t.surveys.form.loggedInType },
                { value: 'open', label: t.surveys.form.openType },
              ]}
              className="w-full"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={collectRespondent}
                onChange={setCollectRespondent}
              />
              {t.surveys.form.collectRespondent}
            </label>
            <p className="mt-1 text-xs text-slate-500">{t.surveys.form.collectHint}</p>
          </div>
          <div>
            <Label>{t.surveys.form.maxResponsesLabel}</Label>
            <Input
              type="number"
              min={1}
              placeholder={t.surveys.form.unlimited}
              value={maxResponses}
              onChange={(e) => setMaxResponses(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">{t.surveys.form.maxResponsesHint}</p>
          </div>
          <Button type="button" disabled={title.trim() === '' || createSurvey.isPending} onClick={handleCreate}>
            {t.surveys.form.submit}
          </Button>
        </div>
      </AddDialog>

      <div className="mt-4 space-y-2">
        {(surveys ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <span className="font-medium">{s.title}</span>
              <span className="ml-2"><Badge variant="secondary">{t.surveys.status[s.status]}</Badge></span>
              <span className="ml-2"><Badge variant="secondary">{t.surveys.type[s.survey_type]}</Badge></span>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedId(s.id); setPreview(false) }}>
                {t.surveys.edit}
              </Button>
              {s.status === 'open' && s.survey_type === 'open' && (
                <Button type="button" size="sm" variant="outline" onClick={() => handleCopyLink(s.id)}>
                  {t.surveys.copyLink}
                </Button>
              )}
              <Button type="button" size="sm" variant="destructive" onClick={() => deleteSurvey.mutate(s.id)}>
                {t.surveys.delete}
              </Button>
            </div>
          </div>
        ))}
        {(surveys ?? []).length === 0 && (
          <EmptyScreen icon={<ClipboardList size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.surveys.empty} />
        )}
      </div>

      {selected && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{selected.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>
                {t.surveys.preview}
              </Button>
              {selected.status === 'draft' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => updateSurvey.mutate({ id: selected.id, data: { status: 'open' } })}
                >
                  {t.surveys.publish}
                </Button>
              )}
              {selected.status === 'open' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateSurvey.mutate({ id: selected.id, data: { status: 'closed' } })}
                >
                  {t.surveys.close}
                </Button>
              )}
              {selected.status === 'closed' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateSurvey.mutate({ id: selected.id, data: { status: 'open' } })}
                >
                  {t.surveys.reopen}
                </Button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3 border-t pt-3">
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draftCollect}
                    onChange={setDraftCollect}
                  />
                  {t.surveys.form.collectRespondent}
                </label>
              </div>
              <div>
                <Label>{t.surveys.form.maxResponsesLabel}</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-32"
                  placeholder={t.surveys.form.unlimited}
                  value={draftMax}
                  onChange={(e) => setDraftMax(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={updateSurvey.isPending}
                onClick={handleSaveSettings}
              >
                {t.common.save}
              </Button>
            </div>

            {preview ? (
              <div className="mt-4 space-y-3 border-t pt-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border p-3">
                    <p className="font-medium">{q.text}</p>
                    {q.type === 'open_text' ? (
                      <textarea
                        className="mt-2 min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        placeholder={t.surveys.form.answerPlaceholder}
                        disabled
                      />
                    ) : (
                      <div className="mt-2 space-y-1">
                        {q.options.map((o) => (
                          <label key={o.id} className="flex items-center gap-2 text-sm">
                            {q.type === 'single_choice' ? (
                              <Radio checked={false} onChange={() => {}} disabled aria-label={o.text} />
                            ) : (
                              <Checkbox checked={false} onChange={() => {}} disabled aria-label={o.text} />
                            )}
                            {o.text}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {questions.length === 0 && <p className="text-sm text-slate-500">{t.surveys.form.noQuestions}</p>}
              </div>
            ) : (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div><Label>{t.surveys.form.questionText}</Label><Input value={qText} onChange={(e) => setQText(e.target.value)} /></div>
                <div>
                  <Label>{t.surveys.form.typeLabel}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['single_choice', t.surveys.form.singleChoice],
                        ['multiple_choice', t.surveys.form.multipleChoice],
                        ['open_text', t.surveys.form.openEnded],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={qKind === value ? 'default' : 'outline'}
                        onClick={() => setQKind(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                {qKind !== 'open_text' && (
                  <div className="space-y-2">
                    {qOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder={t.surveys.form.optionPlaceholder(i + 1)}
                          value={opt}
                          onChange={(e) =>
                            setQOptions((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`${t.surveys.form.remove} ${i + 1}`}
                          disabled={qOptions.length <= 2}
                          onClick={() => setQOptions((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <X size={16} aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setQOptions((prev) => [...prev, ''])}
                    >
                      <Plus size={16} aria-hidden="true" /> {t.surveys.form.addOption}
                    </Button>
                  </div>
                )}
                {qKind === 'multiple_choice' && (
                  <div className="flex gap-2">
                    <div><Label>{t.surveys.form.minLabel}</Label><Input type="number" min={0} value={qMin} onChange={(e) => setQMin(e.target.value)} /></div>
                    <div><Label>{t.surveys.form.maxLabel}</Label><Input type="number" min={1} value={qMax} onChange={(e) => setQMax(e.target.value)} /></div>
                  </div>
                )}
                <Button type="button" disabled={qText.trim() === ''} onClick={handleAddQuestion}>
                  {t.surveys.form.addQuestion}
                </Button>
                <ul className="space-y-1">
                  {questions.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="mr-2"><Badge variant="secondary">{q.type === 'open_text' ? t.surveys.form.openEnded : q.type === 'single_choice' ? t.surveys.form.singleChoice : t.surveys.form.multipleChoice}</Badge></span>
                        <span className="truncate">{q.text}</span>
                        {q.type !== 'open_text' && (
                          <span className="text-slate-500"> {t.surveys.form.optionsCount(q.options.length)}</span>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          updateSurvey.mutate({ id: selected.id, data: { questions: questions.filter((x) => x.id !== q.id) } })
                        }}
                      >
                        {t.surveys.form.remove}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold">
                {t.surveys.results} ({responses?.length ?? 0} {t.surveys.responses})
              </h3>
              {(responses?.length ?? 0) === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{t.surveys.noResponses}</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {results.map((r) => {
                    const q = questions.find((x) => x.id === r.questionId)
                    if (!q) return null
                    const expanded = expandedTexts[r.questionId] ?? false
                    const visibleTexts = expanded ? r.texts : r.texts.slice(0, 5)
                    return (
                      <Card key={r.questionId}>
                        <CardContent className="pt-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium">{q.text}</p>
                            <span className="shrink-0 text-xs text-slate-500">
                              {q.type === 'open_text'
                                ? t.surveys.answersCount(r.texts.length)
                                : t.surveys.answersCount(r.total)}
                            </span>
                          </div>
                          {q.type === 'open_text' ? (
                            r.texts.length === 0 ? (
                              <p className="mt-1 text-sm text-slate-500">{t.surveys.form.noTextAnswers}</p>
                            ) : (
                              <>
                                <ul className="mt-2 divide-y divide-border">
                                  {visibleTexts.map((text, i) => (
                                    <li key={i} className="py-2 text-sm whitespace-pre-wrap">{text}</li>
                                  ))}
                                </ul>
                                {r.texts.length > 5 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() =>
                                      setExpandedTexts((prev) => ({ ...prev, [r.questionId]: !expanded }))
                                    }
                                  >
                                    {expanded
                                      ? t.surveys.showLess
                                      : t.surveys.showAll(r.texts.length)}
                                  </Button>
                                )}
                              </>
                            )
                          ) : (
                            <div className="mt-2 space-y-2">
                              {r.options.map((o) => (
                                <div key={o.optionId} className="text-sm">
                                  <div className="flex justify-between gap-2">
                                    <span className="min-w-0 truncate">{o.text}</span>
                                    <span className="shrink-0 tabular-nums text-slate-600">
                                      {o.count} · {o.pct}%
                                    </span>
                                  </div>
                                  <div
                                    className="mt-1 h-2 overflow-hidden rounded bg-slate-200"
                                    role="progressbar"
                                    aria-valuenow={o.pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={o.text}
                                  >
                                    <div className="h-2 rounded bg-slate-800" style={{ width: `${o.pct}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
