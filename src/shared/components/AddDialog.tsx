import type { ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Dialog } from '@base-ui/react/dialog'
import { strings as t } from '@/i18n'

// "+" button for the top-right corner of subpages. Opens the creation dialog.
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card text-white shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Plus size={20} aria-hidden="true" />
    </button>
  )
}

// Separate dialog hosting a creation form. Controlled by the page so the
// form can close it on success.
export function AddDialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup className={`fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[13px] border bg-card p-5 shadow-xl focus:outline-none ${className ?? ''}`}>
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-2xl font-normal">{title}</Dialog.Title>
            <Dialog.Close
              aria-label={t.common.close}
              className="rounded-full p-1.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
