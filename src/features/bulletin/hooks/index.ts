import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bulletinApi } from '@/features/bulletin/api'
import type { Database } from '@/lib/supabase'

export function useBulletinPage(page: number) {
  return useQuery({ queryKey: ['bulletin', page], queryFn: () => bulletinApi.listPage(page) })
}

export function useLatestBulletin(limit: number) {
  return useQuery({ queryKey: ['bulletinLatest', limit], queryFn: () => bulletinApi.latest(limit) })
}

export function useCreateBulletinPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: bulletinApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bulletin'] }),
  })
}

export function useUpdateBulletinPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; data: Database['public']['Tables']['bulletin_posts']['Update'] }) =>
      bulletinApi.update(input.id, input.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bulletin'] }),
  })
}

export function useDeleteBulletinPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bulletinApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bulletin'] }),
  })
}

export function useBulletinAttachments(postId: string) {
  return useQuery({
    queryKey: ['bulletinAttachments', postId],
    queryFn: () => bulletinApi.listAttachments(postId),
    enabled: postId !== '',
  })
}

export function useUploadBulletinAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { postId: string; file: File }) => bulletinApi.uploadAttachment(input.postId, input.file),
    onSuccess: (_, input) => qc.invalidateQueries({ queryKey: ['bulletinAttachments', input.postId] }),
  })
}
