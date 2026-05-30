import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

interface RenderProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  client?: QueryClient
}

export function renderWithProviders(
  ui: ReactNode,
  { initialEntries = ['/'], client, ...rest }: RenderProvidersOptions = {},
) {
  const queryClient = client ?? createTestQueryClient()
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </QueryClientProvider>,
      rest,
    ),
  }
}
