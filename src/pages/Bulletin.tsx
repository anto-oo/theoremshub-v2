import { useState } from 'react'
import { format } from 'date-fns'
import { Paperclip, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useBulletinAttachments,
  useBulletinPage,
  useCreateBulletinPost,
  useDeleteBulletinPost,
  useUpdateBulletinPost,
  useUploadBulletinAttachment,
} from '@/features/bulletin/hooks'
import { bulletinApi, PAGE_SIZE } from '@/features/bulletin/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { RowIconButton } from '@/shared/components/MediaRow'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { strings as t } from '@/i18n'

const ALL_ROLES = ['admin', 'manager', 'user', 'candidate'] as const

function roleLabel(r: string): string {
  if (r === 'user') return t.layout.roles.member
  if (r === 'admin') return t.layout.roles.admin
  if (r === 'manager') return t.layout.roles.manager
  return t.layout.roles.candidate
}

function formatPostDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return format(d, 'dd/MM/yyyy HH:mm')
}

function isModified(createdAt: string, updatedAt: string): boolean {
  return new Date(updatedAt).getTime() > new Date(createdAt).getTime()
}

function Attachments({ postId }: { postId: string }) {
  const { data } = useBulletinAttachments(postId)
  if (!data || data.length === 0) return null
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {data.map((a) => (
        <li key={a.id}>
          <a className="inline-flex items-center gap-1.5 underline underline-offset-2" href={bulletinApi.attachmentUrl(a.storage_path)} target="_blank" rel="noreferrer">
            <Paperclip size={14} aria-hidden="true" className="shrink-0" />
            {a.file_name}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function Bulletin() {
  const { user, profile } = useAuth()
  const role = useRole()
  const isAdmin = role === 'admin'
  const [page, setPage] = useState(0)
  const { data, isLoading } = useBulletinPage(page)
  const createPost = useCreateBulletinPost()
  const updatePost = useUpdateBulletinPost()
  const deletePost = useDeleteBulletinPost()
  const uploadAttachment = useUploadBulletinAttachment()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [visibleRoles, setVisibleRoles] = useState<string[]>([...ALL_ROLES])
  const [file, setFile] = useState<File | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; title: string; body: string } | null>(null)
  const [error, setError] = useState('')

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE))

  const toggleRole = (r: string): void => {
    setVisibleRoles((v) => (v.includes(r) ? v.filter((x) => x !== r) : [...v, r]))
  }

  const handleCreate = async (): Promise<void> => {
    if (!user || title.trim() === '') return
    setError('')
    try {
      const post = await createPost.mutateAsync({
        title: title.trim(),
        body,
        author_id: user,
        author_name: profile?.first_name?.trim() || profile?.username || '',
        pinned,
        visible_roles: visibleRoles,
      })
      if (file) await uploadAttachment.mutateAsync({ postId: post.id, file })
      setTitle('')
      setBody('')
      setPinned(false)
      setVisibleRoles([...ALL_ROLES])
      setFile(null)
      setDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.errorCreate)
    }
  }

  const handleSaveEdit = async (): Promise<void> => {
    if (!editing || editing.title.trim() === '') return
    setError('')
    try {
      await updatePost.mutateAsync({
        id: editing.id,
        data: { title: editing.title.trim(), body: editing.body },
      })
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.errorCreate)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-normal">{t.bulletin.title}</h1>
        {isAdmin && <AddButton label={t.bulletin.newPost} onClick={() => setDialogOpen(true)} />}
      </div>
      {error !== '' && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {isAdmin && (
        <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.bulletin.newPost}>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="bulletin-title">{t.bulletin.form.titleLabel}</Label><Input id="bulletin-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="bulletin-body">{t.bulletin.form.textLabel}</Label><textarea id="bulletin-body" className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={pinned} onChange={setPinned} aria-label={t.bulletin.form.pinnedLabel} />
              {t.bulletin.form.pinnedLabel}
            </label>
            <div className="flex flex-wrap gap-2 text-sm">
              {ALL_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1">
                  <Checkbox checked={visibleRoles.includes(r)} onChange={() => toggleRole(r)} aria-label={roleLabel(r)} />
                  {roleLabel(r)}
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulletin-file">{t.bulletin.form.attachmentLabel}</Label>
              <Input
                id="bulletin-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="button" disabled={title.trim() === '' || createPost.isPending} onClick={handleCreate}>
              {t.bulletin.form.submit}
            </Button>
          </div>
        </AddDialog>
      )}

      {isAdmin && (
        <AddDialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null) }} title={t.bulletin.editPost}>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="bulletin-edit-title">{t.bulletin.form.titleLabel}</Label><Input id="bulletin-edit-title" value={editing?.title ?? ''} onChange={(e) => setEditing((v) => v && { ...v, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bulletin-edit-body">{t.bulletin.form.textLabel}</Label><textarea id="bulletin-edit-body" className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={6} value={editing?.body ?? ''} onChange={(e) => setEditing((v) => v && { ...v, body: e.target.value })} /></div>
            <Button type="button" disabled={!editing || editing.title.trim() === '' || updatePost.isPending} onClick={handleSaveEdit}>
              {t.common.save}
            </Button>
          </div>
        </AddDialog>
      )}

      <div className="mt-4">
        {isLoading && <p aria-busy="true" aria-live="polite" className="text-sm text-muted-foreground">{t.common.loading}</p>}
        <ul className="space-y-3">
          {(data?.posts ?? []).map((p) => (
            <li key={p.id}>
              <Card className="rounded-[13px]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-normal">{p.title}</p>
                    {p.pinned && <Badge variant="secondary">{t.bulletin.pinned}</Badge>}
                    {isAdmin && (
                      <span className="flex shrink-0 items-center gap-2">
                        <RowIconButton
                          label={`${t.common.edit} ${p.title}`}
                          onClick={() => setEditing({ id: p.id, title: p.title, body: p.body })}
                          disabled={updatePost.isPending}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </RowIconButton>
                        <RowIconButton
                          label={p.pinned ? t.bulletin.unpin : t.bulletin.pin}
                          onClick={() => updatePost.mutate({ id: p.id, data: { pinned: !p.pinned } })}
                          disabled={updatePost.isPending}
                        >
                          {p.pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
                        </RowIconButton>
                        <RowIconButton
                          label={`${t.common.delete} ${p.title}`}
                          onClick={() => deletePost.mutate(p.id)}
                          disabled={deletePost.isPending}
                          tone="danger"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </RowIconButton>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {[
                      p.author_name !== '' ? p.author_name : null,
                      formatPostDateTime(p.created_at),
                      isModified(p.created_at, p.updated_at) ? t.bulletin.edited(formatPostDateTime(p.updated_at)) : null,
                    ].filter((v): v is string => v !== null && v !== '').join(' • ')}
                  </p>
                  {p.body !== '' && <p className="mt-2 text-sm whitespace-pre-wrap">{p.body}</p>}
                  <Attachments postId={p.id} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        {(data?.posts ?? []).length === 0 && !isLoading && (
          <p className="mt-2 text-sm text-muted-foreground">{t.dashboard.empty.posts}</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          {t.common.previous}
        </Button>
        <span className="text-muted-foreground">{t.bulletin.page(page + 1, totalPages)}</span>
        <Button type="button" size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
          {t.common.next}
        </Button>
      </div>
    </div>
  )
}
