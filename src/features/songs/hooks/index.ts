import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { songsApi } from '@/features/songs/api'
import { searchDeezer } from '@/features/songs/api/deezer'
import type { Database } from '@/lib/supabase'

// Songs hooks
export function useSongs() {
  return useQuery({
    queryKey: ['songs'],
    queryFn: () => songsApi.list(),
  })
}

export function useSong(id: string) {
  return useQuery({
    queryKey: ['song', id],
    queryFn: () => songsApi.getById(id),
    enabled: !!id,
  })
}

export function useSongsByIds(ids: string[]) {
  const key = [...new Set(ids.filter(Boolean))].sort()
  return useQuery({
    queryKey: ['songs-by-ids', key.join(',')],
    queryFn: () => songsApi.getByIds(key),
    enabled: key.length > 0,
  })
}

export function useCreateSong() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: songsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs'] }),
  })
}

export function useUpdateSong(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Database['public']['Tables']['songs']['Update']) => songsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      queryClient.invalidateQueries({ queryKey: ['song', id] })
    },
  })
}

export function useArchiveSong() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => songsApi.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs'] }),
  })
}

export function useDeezerSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ['deezer-search', q],
    queryFn: () => searchDeezer(q),
    enabled: q.length >= 2,
    staleTime: 60_000,
  })
}
