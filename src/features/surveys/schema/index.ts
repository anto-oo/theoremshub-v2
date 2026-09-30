import { z } from 'zod'
import { strings as t } from '@/i18n'

const optionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1, t.validation.optionTextRequired),
})

const choiceQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['single_choice', 'multiple_choice']),
  text: z.string().min(1, t.validation.questionTextRequired),
  options: z.array(optionSchema).min(2, t.validation.minTwoOptions),
  min_select: z.number().int().min(0).optional(),
  max_select: z.number().int().min(1).optional(),
})

const openQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('open_text'),
  text: z.string().min(1, t.validation.questionTextRequired),
  options: z.array(optionSchema).max(0).optional().default([]),
})

export const surveyQuestionSchema = z.discriminatedUnion('type', [
  choiceQuestionSchema,
  openQuestionSchema,
])

export const surveySchema = z.object({
  title: z.string().min(1, t.validation.titleRequired).max(200),
  description: z.string().optional(),
  questions: z.array(surveyQuestionSchema),
  survey_type: z.enum(['open', 'logged_in']),
  collect_respondent: z.boolean().default(true),
  max_responses_per_user: z.number().int().min(1).nullable().default(1),
})
