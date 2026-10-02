import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/layouts/Layout'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Profile = lazy(() => import('@/pages/Profile'))
const Members = lazy(() => import('@/pages/Members'))
const MemberDetail = lazy(() => import('@/pages/MemberDetail'))
const Songs = lazy(() => import('@/pages/Songs'))
const MySongs = lazy(() => import('@/pages/MySongs'))
const Setlists = lazy(() => import('@/pages/Setlists'))
const Events = lazy(() => import('@/pages/Events'))
const Rehearsals = lazy(() => import('@/pages/Rehearsals'))
const Proposals = lazy(() => import('@/pages/Proposals'))
const Auditions = lazy(() => import('@/pages/Auditions'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Surveys = lazy(() => import('@/pages/Surveys'))
const SurveyPublic = lazy(() => import('@/pages/SurveyPublic'))
const MySurveys = lazy(() => import('@/pages/MySurveys'))
const AdminSettings = lazy(() => import('@/pages/AdminSettings'))
const Bulletin = lazy(() => import('@/pages/Bulletin'))
const { BadgeByToken, BadgeByCode } = { BadgeByToken: lazy(() => import('@/pages/BadgePublic').then((m) => ({ default: m.BadgeByToken }))), BadgeByCode: lazy(() => import('@/pages/BadgePublic').then((m) => ({ default: m.BadgeByCode }))) }

const queryClient = new QueryClient()

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin" size={32} />
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin" size={32} />
  if (!profile || profile.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function InventoryGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin" size={32} />
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin" size={32} />
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

// Auditions: candidates apply, admin/manager review. Members get dashboard
// (sidebar already hides the link for them).
function AuditionGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin" size={32} />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'user') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Candidates only get dashboard / auditions / bulletin. Everything else
// member-facing redirects them to dashboard (sidebar already hides it).
function MemberGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loader2 className="mx-auto mt-8 animate-spin" size={32} />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'candidate') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// AuthProvider must live inside the Router so useNavigate() works.
function AuthShell({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

const router = createBrowserRouter([
  {
    path: '/badge/:token',
    element: (
      <AuthShell>
        <Suspense fallback={<Loader2 className="mx-auto mt-8 animate-spin" size={32} />}>
          <BadgeByToken />
        </Suspense>
      </AuthShell>
    ),
  },
  {
    path: '/badge',
    element: (
      <AuthShell>
        <Suspense fallback={<Loader2 className="mx-auto mt-8 animate-spin" size={32} />}>
          <BadgeByCode />
        </Suspense>
      </AuthShell>
    ),
  },
  {
    path: '/',
    element: (
      <AuthShell>
        <Layout />
      </AuthShell>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'dashboard', element: <RoleGuard><Dashboard /></RoleGuard> },
      { path: 'profile', element: <MemberGuard><Profile /></MemberGuard> },
      { path: 'members', element: <ManagerGuard><Members /></ManagerGuard> },
      { path: 'members/:id', element: <ManagerGuard><MemberDetail /></ManagerGuard> },
      { path: 'songs', element: <MemberGuard><Songs /></MemberGuard> },
      { path: 'my-songs', element: <MemberGuard><MySongs /></MemberGuard> },
      { path: 'setlists', element: <MemberGuard><Setlists /></MemberGuard> },
      { path: 'events', element: <MemberGuard><Events /></MemberGuard> },
      { path: 'rehearsals', element: <MemberGuard><Rehearsals /></MemberGuard> },
      { path: 'proposals', element: <MemberGuard><Proposals /></MemberGuard> },
      { path: 'auditions', element: <AuditionGuard><Auditions /></AuditionGuard> },
      { path: 'inventory', element: <InventoryGuard><Inventory /></InventoryGuard> },
      { path: 'my-surveys', element: <RoleGuard><MySurveys /></RoleGuard> },
      { path: 'surveys', element: <AdminGuard><Surveys /></AdminGuard> },
      { path: 'admin/settings', element: <AdminGuard><AdminSettings /></AdminGuard> },
      { path: 'bulletin', element: <RoleGuard><Bulletin /></RoleGuard> },
      // No guard: open surveys stay answerable without login, like login/signup.
      { path: 's/:id', element: <SurveyPublic /> },
    ],
  },
])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<Loader2 className="mx-auto mt-8 animate-spin" size={32} />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  )
}

export default App
