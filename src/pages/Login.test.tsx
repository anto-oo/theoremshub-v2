import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { strings as t } from '@/i18n'
import Login from './Login'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('Login', () => {
  it('renders the login form', () => {
    renderWithProviders(<Login />)
    expect(screen.getByRole('heading', { name: t.auth.login.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.auth.login.submit })).toBeInTheDocument()
  })
})
