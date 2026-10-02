import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { strings as t } from '@/i18n'
import Inventory from './Inventory'
import Surveys from './Surveys'
import MySurveys from './MySurveys'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('Inventory', () => {
  it('renders the heading', () => {
    renderWithProviders(<Inventory />)
    expect(screen.getByText(t.inventory.title)).toBeInTheDocument()
  })
})

describe('Surveys', () => {
  it('renders the heading', () => {
    renderWithProviders(<Surveys />)
    expect(screen.getByText(t.surveys.title)).toBeInTheDocument()
  })
})

describe('MySurveys', () => {
  it('renders the heading', () => {
    renderWithProviders(<MySurveys />)
    expect(screen.getByText(t.mySurveys.title)).toBeInTheDocument()
  })
})
