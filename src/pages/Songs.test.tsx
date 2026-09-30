import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { strings as t } from '@/i18n'
import Songs from './Songs'
import Setlists from './Setlists'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('Songs', () => {
  it('renders the heading', () => {
    renderWithProviders(<Songs />)
    expect(screen.getByText(t.songs.title)).toBeInTheDocument()
  })
})

describe('Setlists', () => {
  it('renders the heading', () => {
    renderWithProviders(<Setlists />)
    expect(screen.getByText(t.setlists.title)).toBeInTheDocument()
  })
})
