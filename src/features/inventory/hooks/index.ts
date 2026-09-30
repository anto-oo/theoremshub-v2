import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/features/inventory/api'

export function useInventoryCategories() {
  return useQuery({ queryKey: ['inventoryCategories'], queryFn: () => inventoryApi.getCategories() })
}

export function useInventoryItems() {
  return useQuery({ queryKey: ['inventoryItems'], queryFn: () => inventoryApi.getItems() })
}

export function useCreateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; category_id: number | null }) => inventoryApi.createItem(input.name, input.category_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryItems'] }),
  })
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; name?: string; category_id?: number | null }) => inventoryApi.updateItem(input.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryItems'] }),
  })
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => inventoryApi.deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryItems'] }),
  })
}

export function useCreateInventoryCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => inventoryApi.createCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryCategories'] }),
  })
}

export function useDeleteInventoryCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => inventoryApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventoryCategories'] }),
  })
}

export function useInventorySnapshots() {
  return useQuery({ queryKey: ['inventorySnapshots'], queryFn: () => inventoryApi.getSnapshots() })
}

export function useSnapshotItems(snapshotId: string) {
  return useQuery({
    queryKey: ['snapshotItems', snapshotId],
    queryFn: () => inventoryApi.getSnapshotItems(snapshotId),
    enabled: !!snapshotId,
  })
}

export function useCreateSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { items: { item_id: string; quantity: number }[]; createdBy: string; note?: string }) =>
      inventoryApi.createSnapshot(input.items, input.createdBy, input.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventorySnapshots'] }),
  })
}
