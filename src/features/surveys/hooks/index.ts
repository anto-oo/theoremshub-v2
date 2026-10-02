import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { surveysApi, surveyResponsesApi } from '@/features/surveys/api'
import type { Database } from '@/lib/supabase'

export function useSurveys() {
  return useQuery({ queryKey: ['surveys'], queryFn: () => surveysApi.list() })
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: surveysApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export function useUpdateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; data: Database['public']['Tables']['surveys']['Update'] }) => surveysApi.update(input.id, input.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export function useDeleteSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => surveysApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export function useSurveyResponses(surveyId: string) {
  return useQuery({
    queryKey: ['surveyResponses', surveyId],
    queryFn: () => surveyResponsesApi.listBySurvey(surveyId),
    enabled: !!surveyId,
  })
}

export function useMySurveyResponses(surveyId: string, userId: string | null) {
  return useQuery({
    queryKey: ['mySurveyResponses', surveyId, userId],
    queryFn: () => surveyResponsesApi.listMine(surveyId, userId as string),
    enabled: !!surveyId && !!userId,
  })
}

export function useAllMySurveyResponses(userId: string | null) {
  return useQuery({
    queryKey: ['mySurveyResponses', 'all', userId],
    queryFn: () => surveyResponsesApi.listAllMine(userId as string),
    enabled: !!userId,
  })
}

export function useSubmitSurveyResponse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: surveyResponsesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveyResponses'] })
      qc.invalidateQueries({ queryKey: ['mySurveyResponses'] })
    },
  })
}
