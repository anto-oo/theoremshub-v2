import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { strings as t } from '@/i18n'
import Events from './Events'
import Rehearsals from './Rehearsals'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('Events', () => {
  it('renders the heading', () => {
    renderWithProviders(<Events />)
    expect(screen.getByText(t.events.title)).toBeInTheDocument()
  })
})

describe('Rehearsals', () => {
  it('renders the heading', () => {
    renderWithProviders(<Rehearsals />)
    expect(screen.getByText(t.rehearsals.title)).toBeInTheDocument()
  })
})
