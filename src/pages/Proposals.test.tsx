import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { strings as t } from '@/i18n'
import Proposals from './Proposals'
import Auditions from './Auditions'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('Proposals', () => {
  it('renders the heading', () => {
    renderWithProviders(<Proposals />)
    expect(screen.getByText(t.proposals.title)).toBeInTheDocument()
  })
})

describe('Auditions', () => {
  it('renders the heading', () => {
    renderWithProviders(<Auditions />)
    expect(screen.getAllByRole('heading', { name: t.auditions.title }).length).toBeGreaterThan(0)
  })
})
