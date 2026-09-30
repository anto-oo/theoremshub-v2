import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { setlistsApi, setlistSongsApi, assignmentsApi } from '@/features/setlists/api'

export function useSetlists() {
  return useQuery({ queryKey: ['setlists'], queryFn: () => setlistsApi.list() })
}

export function useCreateSetlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setlistsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setlists'] }),
  })
}

export function useArchiveSetlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setlistsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setlists'] }),
  })
}

export function useDeleteSetlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setlistsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setlists'] }),
  })
}

export function useSetlistSongs(setlistId: string) {
  return useQuery({
    queryKey: ['setlistSongs', setlistId],
    queryFn: () => setlistSongsApi.listBySetlist(setlistId),
    enabled: !!setlistId,
  })
}

export function useAddSetlistSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { setlistId: string; songId: string; instrumentRoleId: number; position: number }) =>
      setlistSongsApi.add(params.setlistId, params.songId, params.instrumentRoleId, params.position),
    onSuccess: (_, params) => qc.invalidateQueries({ queryKey: ['setlistSongs', params.setlistId] }),
  })
}

export function useRemoveSetlistSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; setlistId: string }) => setlistSongsApi.remove(params.id),
    onSuccess: (_, params) => qc.invalidateQueries({ queryKey: ['setlistSongs', params.setlistId] }),
  })
}

export function useUpdateSetlistSongPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; position: number }) => setlistSongsApi.updatePosition(params.id, params.position),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setlistSongs'] }),
  })
}

export function useReorderSetlistSongs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { setlistId: string; positions: { id: string; position: number }[] }) =>
      setlistSongsApi.updatePositions(params.setlistId, params.positions),
    onSuccess: (_, params) => qc.invalidateQueries({ queryKey: ['setlistSongs', params.setlistId] }),
  })
}

export function useAssignments(setlistSongId: string | null) {
  return useQuery({
    queryKey: ['assignments', setlistSongId],
    queryFn: () => assignmentsApi.listBySetlistSong(setlistSongId as string),
    enabled: setlistSongId !== null,
  })
}

export function useAddAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { setlistSongId: string; memberId: string; instrumentRoleId: number }) =>
      assignmentsApi.add(params.setlistSongId, params.memberId, params.instrumentRoleId),
    onSuccess: (_, params) => qc.invalidateQueries({ queryKey: ['assignments', params.setlistSongId] }),
  })
}

export function useRemoveAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; setlistSongId: string }) => assignmentsApi.remove(params.id),
    onSuccess: (_, params) => qc.invalidateQueries({ queryKey: ['assignments', params.setlistSongId] }),
  })
}
