import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { membersAdminApi, settingsApi, instrumentsApi, memberInstrumentsApi } from '@/features/admin/api'
import type { Database } from '@/lib/supabase'
import type { AppRole } from '@/lib/supabase'

export function useAppSettings(pollMs?: number) {
  return useQuery({
    queryKey: ['appSettings'],
    queryFn: () => settingsApi.get(),
    ...(pollMs === undefined ? {} : { refetchInterval: pollMs }),
  })
}

export function useUpdateAppSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Database['public']['Tables']['app_settings']['Update']) => settingsApi.update(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appSettings'] }),
  })
}

export function useInstruments() {
  return useQuery({ queryKey: ['instruments'], queryFn: () => instrumentsApi.list() })
}

export function useCreateInstrument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => instrumentsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instruments'] }),
  })
}

export function useDeleteInstrument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => instrumentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instruments'] }),
  })
}

export function useMembersAdmin() {
  return useQuery({ queryKey: ['membersAdmin'], queryFn: () => membersAdminApi.list() })
}

// Map of memberId -> instrument names (primary first) for the members list.
export function useMemberInstruments() {
  return useQuery({
    queryKey: ['memberInstruments'],
    queryFn: async () => {
      const [{ data: links, error: linkError }, { data: roles, error: roleError }] = await Promise.all([
        supabase.from('member_instruments').select('member_id, instrument_role_id, is_primary'),
        supabase.from('instrument_roles').select('id, name'),
      ])
      if (linkError) throw linkError
      if (roleError) throw roleError
      const names = new Map((roles ?? []).map((r) => [r.id, r.name]))
      const byMember = new Map<string, string[]>()
      const ordered = [...(links ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
      for (const l of ordered) {
        const name = names.get(l.instrument_role_id)
        if (!name) continue
        byMember.set(l.member_id, [...(byMember.get(l.member_id) ?? []), name])
      }
      return byMember
    },
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; patch: Database['public']['Tables']['profiles']['Update'] }) =>
      membersAdminApi.update(input.id, input.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['membersAdmin'] }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => membersAdminApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['membersAdmin'] }),
  })
}

export function useMemberInstrumentIds(memberId: string | null) {
  return useQuery({
    queryKey: ['memberInstrumentIds', memberId],
    queryFn: () => memberInstrumentsApi.listIds(memberId as string),
    enabled: memberId !== null,
  })
}

export function useSetMemberInstruments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { memberId: string; instrumentIds: number[]; primaryId: number | null }) =>
      memberInstrumentsApi.set(input.memberId, input.instrumentIds, input.primaryId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['memberInstruments'] })
      qc.invalidateQueries({ queryKey: ['memberInstrumentIds', v.memberId] })
    },
  })
}

export function useSetTemporaryPassword() {
  return useMutation({
    mutationFn: (input: { memberId: string; password: string }) =>
      membersAdminApi.setTemporaryPassword(input.memberId, input.password),
  })
}

export function useBulkAssignRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userIds: string[]; role: AppRole }) => membersAdminApi.bulkAssignRoles(input.userIds, input.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['membersAdmin'] }),
  })
}
