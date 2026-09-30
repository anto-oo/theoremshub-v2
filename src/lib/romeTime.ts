export const ROME_TZ = 'Europe/Rome'

function romeOffsetMs(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ROME_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === '24' ? '0' : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - utcMs
}

/** "YYYY-MM-DDTHH:mm" wall time in Europe/Rome -> UTC ISO string. */
export function romeWallTimeToUtcIso(local: string): string {
  const [d, t] = local.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = (t ?? '00:00').split(':').map(Number)
  const wallAsUtc = Date.UTC(y, mo - 1, da, h, mi)
  // ponytail: two-pass fixed-point for DST edge, exact unless wall time is skipped/ambiguous
  const utc = wallAsUtc - romeOffsetMs(wallAsUtc - romeOffsetMs(wallAsUtc))
  return new Date(utc).toISOString()
}

/** DATE ("YYYY-MM-DD") or ISO -> "gg/mm/aaaa". Parses DATE without TZ shift. */
export function formatDateIt(value: string | null | undefined): string {
  if (!value) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { timeZone: ROME_TZ })
}

/** ISO instant -> "gg/mm/aaaa, hh:mm" in Europe/Rome. */
export function formatDateTimeIt(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('it-IT', {
    timeZone: ROME_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
