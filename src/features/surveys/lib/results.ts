import { strings as t } from '@/i18n'

export interface SurveyOption {
  id: string
  text: string
}

export interface SurveyQuestion {
  id: string
  type: 'single_choice' | 'multiple_choice' | 'open_text'
  text: string
  options: SurveyOption[]
  min_select?: number
  max_select?: number
}

export type SurveyAnswers = Record<string, string | string[]>

export interface OptionResult {
  optionId: string
  text: string
  count: number
  pct: number
}

export interface QuestionResult {
  questionId: string
  total: number
  options: OptionResult[]
  texts: string[]
}

// Per-option counts and percentages over all submitted responses.
// Open-text answers are collected verbatim in `texts`.
export function computeSurveyResults(
  questions: SurveyQuestion[],
  responses: { answers: SurveyAnswers }[],
): QuestionResult[] {
  return questions.map((q) => {
    if (q.type === 'open_text') {
      const texts: string[] = []
      for (const r of responses) {
        const a = r.answers[q.id]
        const v = typeof a === 'string' ? a.trim() : Array.isArray(a) ? a.join(' ').trim() : ''
        if (v !== '') texts.push(v)
      }
      return { questionId: q.id, total: responses.length, options: [], texts }
    }

    const counts = new Map<string, number>()
    for (const opt of q.options) counts.set(opt.id, 0)

    for (const r of responses) {
      const a = r.answers[q.id]
      const selected = Array.isArray(a) ? a : a !== undefined ? [a] : []
      for (const s of selected) {
        if (counts.has(s)) counts.set(s, (counts.get(s) as number) + 1)
      }
    }

    const total = responses.length
    return {
      questionId: q.id,
      total,
      options: q.options.map((opt) => {
        const count = counts.get(opt.id) ?? 0
        return {
          optionId: opt.id,
          text: opt.text,
          count,
          pct: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      }),
      texts: [],
    }
  })
}

export function validateAnswers(
  questions: SurveyQuestion[],
  answers: SurveyAnswers,
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  for (const q of questions) {
    // Open questions are optional free text — never blocking.
    if (q.type === 'open_text') continue
    const a = answers[q.id]
    const selected = Array.isArray(a) ? a : a !== undefined && a !== '' ? [a] : []

    if (q.type === 'single_choice') {
      if (selected.length !== 1) errors[q.id] = t.surveys.validation.selectOne
    } else {
      const min = q.min_select ?? 0
      const max = q.max_select ?? q.options.length
      if (selected.length < min) errors[q.id] = t.surveys.validation.selectMin(min)
      else if (selected.length > max) errors[q.id] = t.surveys.validation.selectMax(max)
      for (const s of selected) {
        if (!q.options.some((o) => o.id === s)) {
          errors[q.id] = t.surveys.validation.invalidOption
          break
        }
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors }
}
