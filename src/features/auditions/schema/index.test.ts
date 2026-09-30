import { needsAuditionSong } from './index'

describe('needsAuditionSong', () => {
  it('exempts altro regardless of case or whitespace', () => {
    expect(needsAuditionSong('altro')).toBe(false)
    expect(needsAuditionSong('Altro')).toBe(false)
    expect(needsAuditionSong('  ALTRO  ')).toBe(false)
  })

  it('requires a song for every other role', () => {
    expect(needsAuditionSong('voice')).toBe(true)
    expect(needsAuditionSong('guitar')).toBe(true)
    expect(needsAuditionSong('technician')).toBe(true)
    expect(needsAuditionSong('')).toBe(true)
  })
})
