import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import App from '@/App'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'

describe('Search flow (Landing → DateRange)', () => {
  it('shows the prompt before user types', () => {
    renderWithProviders(<App />, { initialEntries: ['/'] })
    expect(screen.getByRole('heading', { name: '급식 정보 조회' })).toBeInTheDocument()
    expect(screen.getByText('학교 이름을 입력해 주세요.')).toBeInTheDocument()
  })

  it('searches schools after debounce and lists them', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/'] })

    await user.type(screen.getByPlaceholderText('예: 서울고등학교'), '서울')

    expect(await screen.findByText('서울고등학교')).toBeInTheDocument()
    expect(screen.getByText('서울중학교')).toBeInTheDocument()
    expect(screen.getAllByText(/서울특별시교육청/).length).toBeGreaterThan(0)
  })

  it('shows empty-state message when no schools match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/'] })
    await user.type(screen.getByPlaceholderText('예: 서울고등학교'), '없는학교')
    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument()
  })

  it('shows error message when API fails', async () => {
    server.use(
      http.get('/api/schools', () =>
        HttpResponse.json({ detail: 'NEIS down' }, { status: 502 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/'] })
    await user.type(screen.getByPlaceholderText('예: 서울고등학교'), '서울')
    expect(await screen.findByText(/오류:/)).toBeInTheDocument()
  })

  it('navigates to date range page on selecting a school', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/'] })
    await user.type(screen.getByPlaceholderText('예: 서울고등학교'), '서울')
    const card = await screen.findByText('서울고등학교')
    await user.click(card)

    // DateRangePage should show its title with the picked school name
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '서울고등학교' }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('날짜 범위 선택')).toBeInTheDocument()
  })
})
