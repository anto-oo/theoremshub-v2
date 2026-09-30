import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Forces iOS Safari to zoom back out after password autofill focuses a <16px input.
export function resetZoomAfterLogin(): void {
  if (typeof document === 'undefined') return
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  const original = meta.getAttribute('content') ?? 'width=device-width, initial-scale=1.0'
  meta.setAttribute('content', `${original}, maximum-scale=1`)
  const restore = () => meta.setAttribute('content', original)
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(restore)
  else setTimeout(restore, 0)
}

// ponytail: naive m:ss, no hours support — extend if tracks > 1h appear
export function formatDuration(totalSeconds: number | null | undefined): string | null {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds < 0) return null
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
