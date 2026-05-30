import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { searchSchools, getMeals } from './api'

const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = vi.fn()
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function mockResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('searchSchools', () => {
  it('builds the correct URL with encoded query', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse([]),
    )
    await searchSchools('서울 고등')
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(calledUrl).toBe('/api/schools?name=%EC%84%9C%EC%9A%B8+%EA%B3%A0%EB%93%B1')
  })

  it('returns the parsed payload on 200', async () => {
    const payload = [{ schoolCode: 'x' }]
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse(payload),
    )
    await expect(searchSchools('서울')).resolves.toEqual(payload)
  })

  it('throws with detail string on error response', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse({ detail: 'name required' }, { status: 422 }),
    )
    await expect(searchSchools('x')).rejects.toThrow('name required')
  })

  it('throws with detail.message when detail is an object', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse(
        { detail: { code: 'ERROR-300', message: '필수 값 누락' } },
        { status: 502 },
      ),
    )
    await expect(searchSchools('x')).rejects.toThrow('필수 값 누락')
  })

  it('falls back to a generic message when no detail can be parsed', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('not json', { status: 500 }),
    )
    await expect(searchSchools('x')).rejects.toThrow('Request failed (500)')
  })
})

describe('getMeals', () => {
  it('passes all four params in the query string', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockResponse([]),
    )
    await getMeals({
      eduOfficeCode: 'B10',
      schoolCode: '7010806',
      from: '2024-03-01',
      to: '2024-03-07',
    })
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    const url = new URL(calledUrl, 'http://localhost')
    expect(url.pathname).toBe('/api/meals')
    expect(url.searchParams.get('eduOfficeCode')).toBe('B10')
    expect(url.searchParams.get('schoolCode')).toBe('7010806')
    expect(url.searchParams.get('from')).toBe('2024-03-01')
    expect(url.searchParams.get('to')).toBe('2024-03-07')
  })
})
