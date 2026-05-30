import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import App from '@/App'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'

const buildUrl = () => {
  const params = new URLSearchParams({
    eduOfficeCode: 'B10',
    schoolName: '서울고등학교',
    eduOfficeName: '서울특별시교육청',
    from: '2024-03-01',
    to: '2024-03-03',
  })
  return `/school/7010806/meals?${params.toString()}`
}

describe('Meals result flow', () => {
  it('renders meal cards for each day in range', async () => {
    server.use(
      http.get('/api/meals', () =>
        HttpResponse.json([
          {
            date: '2024-03-01',
            dishes: ['쌀밥', '김치찌개'],
            calorie: '850 Kcal',
            origin: ['쌀: 국내산'],
            nutrition: ['탄수화물 (g) : 80'],
            servings: 120.5,
          },
        ]),
      ),
    )

    renderWithProviders(<App />, { initialEntries: [buildUrl()] })

    expect(
      await screen.findByRole('heading', { name: '서울고등학교' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/중식 \(점심\)/),
    ).toBeInTheDocument()

    // 3 day cards (2024-03-01 ~ 2024-03-03)
    expect(await screen.findByText(/^2024-03-01/)).toBeInTheDocument()
    expect(screen.getByText(/^2024-03-02/)).toBeInTheDocument()
    expect(screen.getByText(/^2024-03-03/)).toBeInTheDocument()

    // The first day has data
    expect(screen.getByText('쌀밥')).toBeInTheDocument()
    expect(screen.getByText('김치찌개')).toBeInTheDocument()
    expect(screen.getByText('쌀: 국내산')).toBeInTheDocument()

    // Days without data show "급식 정보 없음"
    expect(screen.getAllByText('급식 정보 없음').length).toBe(2)
  })

  it('shows error message when /api/meals fails', async () => {
    server.use(
      http.get('/api/meals', () =>
        HttpResponse.json(
          { detail: { code: 'ERROR-290', message: 'Authentication key invalid.' } },
          { status: 502 },
        ),
      ),
    )

    renderWithProviders(<App />, { initialEntries: [buildUrl()] })

    expect(await screen.findByText(/오류:/)).toBeInTheDocument()
    expect(screen.getByText(/Authentication key invalid\./)).toBeInTheDocument()
  })

  it('renders all days as "no data" when API returns []', async () => {
    server.use(
      http.get('/api/meals', () => HttpResponse.json([])),
    )
    renderWithProviders(<App />, { initialEntries: [buildUrl()] })

    expect(await screen.findByText(/^2024-03-01/)).toBeInTheDocument()
    expect(screen.getAllByText('급식 정보 없음').length).toBe(3)
  })

  it('exposes a back link to date range page', async () => {
    renderWithProviders(<App />, { initialEntries: [buildUrl()] })
    const back = await screen.findByRole('link', { name: /날짜 다시 선택/ })
    expect(back).toHaveAttribute(
      'href',
      expect.stringContaining('/school/7010806?'),
    )
    // It should preserve school context in query
    const href = back.getAttribute('href') ?? ''
    expect(href).toContain('eduOfficeCode=B10')
    expect(href).toContain('schoolName=')
  })
})

describe('DateRange page guards', () => {
  it('shows error when school context is missing', () => {
    // No query params -> eduOfficeCode is empty
    renderWithProviders(<App />, { initialEntries: ['/school/7010806'] })
    expect(screen.getByText('학교 정보가 없습니다.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '처음으로 돌아가기' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders the calendar when school context is provided', async () => {
    const params = new URLSearchParams({
      eduOfficeCode: 'B10',
      schoolName: '서울고등학교',
      eduOfficeName: '서울특별시교육청',
    })
    renderWithProviders(<App />, {
      initialEntries: [`/school/7010806?${params.toString()}`],
    })
    expect(
      await screen.findByRole('heading', { name: '서울고등학교' }),
    ).toBeInTheDocument()
    expect(screen.getByText('날짜 범위 선택')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '급식 정보 조회' })).toBeInTheDocument()
    // Just ensure the calendar root is in the DOM
    const calendar = document.querySelector('.rdp-root')
    expect(calendar).not.toBeNull()
  })
})
