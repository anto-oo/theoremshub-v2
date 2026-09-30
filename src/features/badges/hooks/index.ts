import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { badgesApi } from '@/features/badges/api'

export function useMemberBadges(memberId: string) {
  return useQuery({
    queryKey: ['memberBadges', memberId],
    queryFn: () => badgesApi.listByMember(memberId),
    enabled: memberId !== '',
  })
}

export function useOwnBadges() {
  return useQuery({ queryKey: ['ownBadges'], queryFn: () => badgesApi.listOwn() })
}

export function useCreateBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { memberId: string; createdBy: string; adminNote?: string }) =>
      badgesApi.create(input.memberId, input.createdBy, input.adminNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberBadges'] })
      qc.invalidateQueries({ queryKey: ['ownBadges'] })
    },
  })
}

export function useRevokeBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => badgesApi.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberBadges'] })
      qc.invalidateQueries({ queryKey: ['ownBadges'] })
    },
  })
}
