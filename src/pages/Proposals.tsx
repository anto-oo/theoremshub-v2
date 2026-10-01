import { useState } from 'react'
import { Check, MessageSquare, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRole } from '@/hooks/useRole'
import {
  useAddProposalComment,
  useCreateProposal,
  useDeleteProposal,
  useProposalComments,
  useProposals,
  useUpdateProposalStatus,
} from '@/features/proposals/hooks'
import { AddButton, AddDialog } from '@/shared/components/AddDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MediaRow, RowIconButton } from '@/shared/components/MediaRow'
import { EmptyScreen } from '@/shared/components/StateFeedback'
import { formatDuration } from '@/lib/utils'
import SongSearch from '@/features/songs/components/SongSearch'
import { resolveSongMetadata, type DeezerTrackDetails } from '@/features/songs/api/deezer'
import { strings as t } from '@/i18n'

function Comments({ proposalId }: { proposalId: string }) {
  const { user } = useAuth()
  const { data: comments } = useProposalComments(proposalId)
  const addComment = useAddProposalComment()
  const [text, setText] = useState('')

  const handleAdd = async (): Promise<void> => {
    if (!user || text.trim() === '') return
    await addComment.mutateAsync({ proposal_id: proposalId, author_id: user, content: text.trim() })
    setText('')
  }

  return (
    <div className="mt-2 border-t pt-2">
      <ul className="space-y-1 text-sm">
        {(comments ?? []).map((c) => (
          <li key={c.id} className="text-slate-700">{c.content}</li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input placeholder={t.proposals.commentPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="button" size="sm" disabled={text.trim() === '' || addComment.isPending} onClick={handleAdd}>
          {t.proposals.send}
        </Button>
      </div>
    </div>
  )
}

export default function Proposals() {
  const { user } = useAuth()
  const role = useRole()
  const canModerate = role === 'admin' || role === 'manager'
  const { data: proposals, isLoading } = useProposals()
  const createProposal = useCreateProposal()
  const updateStatus = useUpdateProposalStatus()
  const deleteProposal = useDeleteProposal()

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [reason, setReason] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [quickAddPending, setQuickAddPending] = useState(false)

  const handleQuickAdd = async (tr: DeezerTrackDetails): Promise<void> => {
    if (!user) return
    setError('')
    setQuickAddPending(true)
    try {
      await createProposal.mutateAsync({
        proposer_id: user,
        title: tr.name.trim(),
        artist: tr.artist.trim(),
        ...(reason.trim() === '' ? {} : { reason: reason.trim() }),
        ...(tr.mbid ? { lastfm_id: tr.mbid } : {}),
        ...(tr.albumArtUrl ? { album_art_url: tr.albumArtUrl } : {}),
        ...(tr.album ? { album: tr.album } : {}),
        ...(typeof tr.durationSeconds === 'number' ? { duration_seconds: tr.durationSeconds } : {}),
      })
      setReason('')
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.proposals.error)
    } finally {
      setQuickAddPending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!user || title.trim() === '' || artist.trim() === '') return
    setError('')
    try {
      const meta = await resolveSongMetadata(title, artist)
      await createProposal.mutateAsync({
        proposer_id: user,
        title: title.trim(),
        artist: artist.trim(),
        ...(reason.trim() === '' ? {} : { reason: reason.trim() }),
        ...(meta?.mbid ? { lastfm_id: meta.mbid } : {}),
        ...(meta?.albumArtUrl ? { album_art_url: meta.albumArtUrl } : {}),
        ...(meta?.album ? { album: meta.album } : {}),
        ...(typeof meta?.durationSeconds === 'number' ? { duration_seconds: meta.durationSeconds } : {}),
      })
      setTitle('')
      setArtist('')
      setReason('')
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.proposals.error)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-normal">{t.proposals.title}</h1>
        <AddButton label={t.proposals.newProposal} onClick={() => setDialogOpen(true)} />
      </div>
      {error !== '' && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <AddDialog open={dialogOpen} onOpenChange={setDialogOpen} title={t.proposals.newProposal}>
        <div className="space-y-4">
          <SongSearch onSelect={handleQuickAdd} />
          {quickAddPending && <p aria-live="polite" className="text-sm text-slate-500">{t.common.loading}</p>}
          {error !== '' && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div><Label>{t.proposals.form.titleLabel}</Label><Input placeholder={t.proposals.form.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div><Label>{t.proposals.form.artistLabel}</Label><Input placeholder={t.proposals.form.artistPlaceholder} value={artist} onChange={(e) => setArtist(e.target.value)} required /></div>
            <div><Label>{t.proposals.form.reasonLabel}</Label><Input placeholder={t.proposals.form.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <Button type="submit" disabled={createProposal.isPending || title.trim() === '' || artist.trim() === ''}>
              {t.proposals.form.submit}
            </Button>
          </form>
        </div>
      </AddDialog>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">{t.proposals.listTitle}</h2>
        {isLoading && <p className="mt-2 text-sm text-slate-500">{t.common.loading}</p>}
        <ul className="mt-2 space-y-3">
          {(proposals ?? []).map((p) => (
            <MediaRow
              key={p.id}
              title={p.title}
              subtitle={[p.artist, p.album, formatDuration(p.duration_seconds)].filter((v): v is string => typeof v === 'string' && v !== '').join(' • ')}
              imageUrl={p.album_art_url}
              action={
                <>
                  <Badge variant="secondary">{t.proposals.status[p.status as keyof typeof t.proposals.status]}</Badge>
                  <RowIconButton
                    label={expanded === p.id ? t.proposals.closeCommentsOf(p.title) : t.proposals.commentsOf(p.title)}
                    onClick={() => setExpanded((v) => (v === p.id ? null : p.id))}
                  >
                    <MessageSquare size={16} aria-hidden="true" />
                  </RowIconButton>
                  {canModerate && p.status === 'pending' && (
                    <>
                      <RowIconButton
                        label={t.proposals.approve(p.title)}
                        onClick={() => updateStatus.mutate({ id: p.id, status: 'approved' })}
                        disabled={updateStatus.isPending}
                      >
                        <Check size={16} aria-hidden="true" />
                      </RowIconButton>
                      <RowIconButton
                        label={t.proposals.reject(p.title)}
                        onClick={() => updateStatus.mutate({ id: p.id, status: 'rejected' })}
                        disabled={updateStatus.isPending}
                      >
                        <X size={16} aria-hidden="true" />
                      </RowIconButton>
                    </>
                  )}
                  {(canModerate || (user && p.proposer_id === user)) && (
                    <RowIconButton
                      label={`${t.common.delete} ${p.title}`}
                      onClick={() => deleteProposal.mutate(p.id)}
                      disabled={deleteProposal.isPending}
                      tone="danger"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </RowIconButton>
                  )}
                </>
              }
            >
              {p.reason && <p className="mt-2 text-sm text-muted-foreground">{p.reason}</p>}
              {expanded === p.id && <Comments proposalId={p.id} />}
            </MediaRow>
          ))}
        </ul>
        {(proposals ?? []).length === 0 && !isLoading && (
          <EmptyScreen icon={<MessageSquare size={48} aria-hidden="true" className="mx-auto text-muted-foreground" />} title={t.proposals.empty} />
        )}
      </div>
    </div>
  )
}
