import { describe, expect, it } from 'vitest'
import { computeSurveyResults, validateAnswers, type SurveyQuestion } from './results'

const questions: SurveyQuestion[] = [
  {
    id: 'q1',
    type: 'single_choice',
    text: 'Preferenza?',
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
  },
  {
    id: 'q2',
    type: 'multiple_choice',
    text: 'Scegli',
    options: [
      { id: 'x', text: 'X' },
      { id: 'y', text: 'Y' },
      { id: 'z', text: 'Z' },
    ],
    min_select: 1,
    max_select: 2,
  },
]

describe('computeSurveyResults', () => {
  it('computes per-option counts and percentages', () => {
    const results = computeSurveyResults(questions, [
      { answers: { q1: 'a', q2: ['x', 'y'] } },
      { answers: { q1: 'b', q2: ['x'] } },
    ])
    const q1 = results.find((r) => r.questionId === 'q1')
    expect(q1?.total).toBe(2)
    expect(q1?.options.find((o) => o.optionId === 'a')).toMatchObject({ count: 1, pct: 50 })
    const q2 = results.find((r) => r.questionId === 'q2')
    expect(q2?.options.find((o) => o.optionId === 'x')).toMatchObject({ count: 2, pct: 100 })
    expect(q2?.options.find((o) => o.optionId === 'z')).toMatchObject({ count: 0, pct: 0 })
  })

  it('returns zero percentages with no responses', () => {
    const results = computeSurveyResults(questions, [])
    expect(results[0]?.total).toBe(0)
    expect(results[0]?.options[0]?.pct).toBe(0)
  })
})

describe('validateAnswers', () => {
  it('rejects missing single choice and out-of-range multiple choice', () => {
    expect(validateAnswers(questions, { q1: 'a', q2: ['x'] }).ok).toBe(true)
    expect(validateAnswers(questions, { q2: ['x'] }).ok).toBe(false)
    expect(validateAnswers(questions, { q1: 'a', q2: ['x', 'y', 'z'] }).ok).toBe(false)
    expect(validateAnswers(questions, { q1: 'a', q2: [] }).ok).toBe(false)
  })

  it('collects open-text answers and never blocks on them', () => {
    const open: SurveyQuestion = { id: 'q3', type: 'open_text', text: 'Perché?', options: [] }
    const results = computeSurveyResults([open], [
      { answers: { q3: '  Ciao  ' } },
      { answers: { q3: '' } },
      { answers: {} },
    ])
    expect(results[0]?.texts).toEqual(['Ciao'])
    expect(validateAnswers([open], {}).ok).toBe(true)
  })
})
