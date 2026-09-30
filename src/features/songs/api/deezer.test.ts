import { vi, describe, it, expect } from 'vitest'
import { getDeezerTrackInfo, type DeezerTrack } from './deezer'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke } },
}))

const base: DeezerTrack = {
  name: 'Song',
  artist: 'Artist',
  mbid: null,
  url: 'http://example.com',
  listeners: 5,
  albumArtUrl: 'http://example.com/small.jpg',
}

describe('getDeezerTrackInfo', () => {
  it('merges detail data, preferring hi-res art', async () => {
    invoke.mockResolvedValue({
      data: {
        track: {
          name: 'Song',
          artist: 'Artist',
          album: 'Album',
          mbid: '123',
          url: 'http://example.com',
          listeners: 10,
          durationSeconds: 200,
          albumArtUrl: 'http://example.com/xl.jpg',
        },
      },
      error: null,
    })
    const details = await getDeezerTrackInfo(base)
    expect(details.album).toBe('Album')
    expect(details.durationSeconds).toBe(200)
    expect(details.albumArtUrl).toBe('http://example.com/xl.jpg')
    expect(details.mbid).toBe('123')
  })

  it('falls back to search data when detail invoke returns an error (never throws)', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Deezer not configured') })
    const details = await getDeezerTrackInfo(base)
    expect(details).toEqual({ ...base, album: null, durationSeconds: null })
  })

  it('falls back to search data when detail invoke rejects (never throws)', async () => {
    invoke.mockRejectedValueOnce(new Error('network'))
    const details = await getDeezerTrackInfo({ ...base, mbid: '123' })
    expect(details).toEqual({ ...base, mbid: '123', album: null, durationSeconds: null })
  })
})
