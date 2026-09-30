import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auditionsApi, auditionApplicationsApi, auditionApplicationInstrumentsApi, auditionInstrumentsApi } from '@/features/auditions/api'
import type { Database } from '@/lib/supabase'

export function useAuditions() {
  return useQuery({ queryKey: ['auditions'], queryFn: () => auditionsApi.list() })
}

export function useAudition(id: string) {
  return useQuery({
    queryKey: ['audition', id],
    queryFn: () => auditionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateAudition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: auditionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditions'] }),
  })
}

export function useArchiveAudition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => auditionsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditions'] }),
  })
}

export function useAuditionApplications(auditionId: string) {
  return useQuery({
    queryKey: ['auditionApplications', auditionId],
    queryFn: () => auditionApplicationsApi.listByAudition(auditionId),
    enabled: !!auditionId,
  })
}

export function useCreateAuditionApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: auditionApplicationsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditionApplications'] }),
  })
}

export function useUpdateAuditionApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; status: 'pending' | 'admitted' | 'rejected'; responseNotes?: string }) =>
      auditionApplicationsApi.updateStatus(params.id, params.status, params.responseNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditionApplications'] }),
  })
}

export function useAdmitAuditionApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => auditionApplicationsApi.admit(applicationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auditionApplications'] })
      qc.invalidateQueries({ queryKey: ['membersAdmin'] })
      qc.invalidateQueries({ queryKey: ['memberInstruments'] })
    },
  })
}

export function useJudgeAuditionInstrument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; decision: 'admitted' | 'rejected' }) =>
      auditionApplicationInstrumentsApi.judge(params.id, params.decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auditionApplicationInstruments'] })
      qc.invalidateQueries({ queryKey: ['auditionApplications'] })
      qc.invalidateQueries({ queryKey: ['membersAdmin'] })
      qc.invalidateQueries({ queryKey: ['memberInstruments'] })
    },
  })
}

export function useAuditionInstruments(auditionId: string) {
  return useQuery({
    queryKey: ['auditionInstruments', auditionId],
    queryFn: () => auditionInstrumentsApi.listByAudition(auditionId),
    enabled: !!auditionId,
  })
}

export function useAuditionApplicationInstruments(applicationId: string) {
  return useQuery({
    queryKey: ['auditionApplicationInstruments', applicationId],
    queryFn: () => auditionApplicationInstrumentsApi.listByApplication(applicationId),
    enabled: !!applicationId,
  })
}

export function useAddAuditionApplicationInstrument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Database['public']['Tables']['audition_application_instruments']['Insert']) =>
      auditionApplicationInstrumentsApi.add(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditionApplicationInstruments'] }),
  })
}
