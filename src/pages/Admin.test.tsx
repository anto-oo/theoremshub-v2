import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { strings as t } from '@/i18n'
import AdminSettings from './AdminSettings'
import Members from './Members'
import Bulletin from './Bulletin'
import { BadgeByCode } from './BadgePublic'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('AdminSettings', () => {
  it('renders the heading', () => {
    renderWithProviders(<AdminSettings />)
    expect(screen.getByText(t.adminSettings.title)).toBeInTheDocument()
  })
})

describe('Members', () => {
  it('renders the heading', () => {
    renderWithProviders(<Members />)
    expect(screen.getByText(t.members.title)).toBeInTheDocument()
  })
})

describe('Bulletin', () => {
  it('renders the heading', () => {
    renderWithProviders(<Bulletin />)
    expect(screen.getByText(t.bulletin.title)).toBeInTheDocument()
  })
})

describe('BadgeByCode', () => {
  it('renders the verification form', () => {
    renderWithProviders(<BadgeByCode />)
    expect(screen.getByText(t.badgePublic.title)).toBeInTheDocument()
  })
})
