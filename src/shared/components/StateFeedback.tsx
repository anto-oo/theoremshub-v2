import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { strings as t } from '@/i18n'

export function ErrorAlert({ message, className }: { message: string; className?: string }) {
  if (!message) return null
  return (
    <p role="alert" className={cn('rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive', className)}>
      {message}
    </p>
  )
}

export function LoadingState({ label = t.common.loading }: { label?: string }) {
  return (
    <p aria-busy="true" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-current" />
      {label}
    </p>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      {icon && <div aria-hidden="true" className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
