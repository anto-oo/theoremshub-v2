import { describe, expect, it } from 'vitest'
import { formatDateIt, formatDateTimeIt, romeWallTimeToUtcIso } from './romeTime'

describe('romeTime', () => {
  it('converts Rome wall time to UTC (CEST +2, CET +1)', () => {
    expect(romeWallTimeToUtcIso('2026-07-01T10:00')).toBe('2026-07-01T08:00:00.000Z')
    expect(romeWallTimeToUtcIso('2026-01-15T10:00')).toBe('2026-01-15T09:00:00.000Z')
  })
  it('formats Italian date and datetime', () => {
    expect(formatDateIt('2026-07-01')).toBe('01/07/2026')
    expect(formatDateTimeIt('2026-07-01T08:00:00.000Z')).toBe('01/07/2026, 10:00')
  })
})
