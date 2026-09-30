import type { CSSProperties, ReactNode, Ref } from 'react'
import type { AppRole } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Figma song-section row (node 42:878): full-width card 88px, radius 13,
// 67px rounded-12 thumb, title 15px + subtitle 11px, 28px dark action chip.
interface MediaRowProps {
  title: string
  titleBadge?: ReactNode
  subtitle?: string
  imageUrl?: string | null | undefined
  hideImage?: boolean
  action?: ReactNode
  actionClassName?: string
  footer?: ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
  ref?: Ref<HTMLLIElement>
}

export function MediaRow({ title, titleBadge, subtitle, imageUrl, hideImage, action, actionClassName, footer, children, className, style, ref }: MediaRowProps) {
  const initial = (title.trim()[0] ?? '?').toUpperCase()
  return (
    <li ref={ref} style={style} className={cn('rounded-[13px] border bg-card p-2.5 shadow-sm', className)}>
      <div className={cn('flex gap-3', !hideImage && 'min-h-[67px]')}>
        {!hideImage && (imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-[67px] w-[67px] shrink-0 self-start rounded-[12px] object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-[67px] w-[67px] shrink-0 self-start items-center justify-center rounded-[12px] bg-[#d9d9d9] text-2xl font-semibold text-[#0c1222]"
          >
            {initial}
          </span>
        ))}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[15px] font-normal">{title}</p>
            {titleBadge}
          </div>
          {subtitle !== undefined && subtitle !== '' && (
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          )}
          {footer && <div className="mt-auto pt-1">{footer}</div>}
        </div>
        {action && <div className={cn('flex shrink-0 self-center items-center gap-2', actionClassName)}>{action}</div>}
      </div>
      {children}
    </li>
  )
}

// Figma members row (node 76:141): pill 20px, radius 11, text 11px.
// Admin red, manager purple, member standard blue, candidate light grey.
const ROLE_STYLES: Record<AppRole, string> = {
  admin: 'bg-[#b3261e] text-white',
  manager: 'bg-[#7b1fa2] text-white',
  user: 'bg-[#253d7c] text-white',
  candidate: 'bg-[#d9d9d9] text-[#0c1222]',
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'Membro',
  candidate: 'Candidato',
}

export function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-[11px] px-2.5 text-[11px] font-normal whitespace-nowrap',
        ROLE_STYLES[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

// Instruments always use the standard blue.
export function InstrumentBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-[11px] bg-[#253d7c] px-2.5 text-[11px] font-normal whitespace-nowrap text-white">
      {name}
    </span>
  )
}

// Figma 28px chip (radius 5) for row actions: dark navy by default
// (edit/manage), Figma red #AB0F0F for delete.
export function RowIconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-[5px] text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50',
        tone === 'danger' ? 'bg-[#ab0f0f] hover:bg-[#7d0b0b]' : 'bg-[#050a16] hover:bg-[#1b2542]',
      )}
    >
      {children}
    </button>
  )
}
