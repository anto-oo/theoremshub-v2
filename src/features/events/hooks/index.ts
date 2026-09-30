import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, eventSetlistsApi, rehearsalsApi, rehearsalAttendanceApi } from '@/features/events/api'
import type { Database } from '@/lib/supabase'

export function useEvents() {
  return useQuery({ queryKey: ['events'], queryFn: () => eventsApi.list() })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: eventsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }) })
}

export function useArchiveEvent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => eventsApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }) })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Database['public']['Tables']['events']['Update'] }) =>
      eventsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => eventsApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }) })
}

export function useEventSetlistsMap() {
  return useQuery({
    queryKey: ['eventSetlists'],
    queryFn: async () => {
      const rows = await eventSetlistsApi.listAll()
      const map: Record<string, string[]> = {}
      for (const r of rows ?? []) {
        if (!map[r.event_id]) map[r.event_id] = []
        map[r.event_id].push(r.setlist_id)
      }
      return map
    },
  })
}

export function useSaveEventSetlists() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, setlistIds }: { eventId: string; setlistIds: string[] }) =>
      eventSetlistsApi.saveForEvent(eventId, setlistIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventSetlists'] }),
  })
}

export function useRehearsals() {
  return useQuery({ queryKey: ['rehearsals'], queryFn: () => rehearsalsApi.list() })
}

export function useCreateRehearsal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: rehearsalsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['rehearsals'] }) })
}

export function useArchiveRehearsal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => rehearsalsApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['rehearsals'] }) })
}

export function useRehearsalAttendance(rehearsalId: string) {
  return useQuery({
    queryKey: ['rehearsalAttendance', rehearsalId],
    queryFn: () => rehearsalAttendanceApi.listByRehearsal(rehearsalId),
    enabled: !!rehearsalId,
  })
}

export function useUpsertAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Database['public']['Tables']['rehearsal_attendance']['Insert']) => rehearsalAttendanceApi.upsert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rehearsalAttendance'] }),
  })
}
