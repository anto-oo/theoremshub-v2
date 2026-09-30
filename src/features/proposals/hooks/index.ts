import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proposalsApi, proposalCommentsApi, proposalSettingsApi } from '@/features/proposals/api'
import type { Database } from '@/lib/supabase'

export function useProposals() {
  return useQuery({ queryKey: ['proposals'], queryFn: () => proposalsApi.list() })
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  })
}

export function useUpdateProposalStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; status: 'pending' | 'approved' | 'rejected' }) =>
      proposalsApi.updateStatus(params.id, params.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      qc.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}

export function useDeleteProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => proposalsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  })
}

export function useProposalComments(proposalId: string) {
  return useQuery({
    queryKey: ['proposalComments', proposalId],
    queryFn: () => proposalCommentsApi.listByProposal(proposalId),
    enabled: !!proposalId,
  })
}

export function useAddProposalComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: proposalCommentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposalComments'] }),
  })
}

export function useProposalSettings() {
  return useQuery({ queryKey: ['proposalSettings'], queryFn: () => proposalSettingsApi.get() })
}

export function useUpdateProposalSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Database['public']['Tables']['proposal_settings']['Update']) => proposalSettingsApi.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposalSettings'] }),
  })
}
