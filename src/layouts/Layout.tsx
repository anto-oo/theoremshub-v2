import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AudioLines,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Megaphone,
  Menu,
  Mic2,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  User,
  Users,
  BarChart3,
  Repeat,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings, useUpdateAppSettings } from '@/features/admin/hooks'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddDialog } from '@/shared/components/AddDialog'
import { useSidebarItems } from '@/hooks/useRole'
import { cn } from '@/lib/utils'
import { strings as t } from '@/i18n'

const ICONS: Record<string, typeof LayoutDashboard> = {
  '/dashboard': LayoutDashboard,
  '/bulletin': Megaphone,
  '/songs': AudioLines,
  '/my-songs': AudioLines,
  '/setlists': ListMusic,
  '/proposals': ClipboardList,
  '/auditions': Mic2,
  '/events': CalendarDays,
  '/rehearsals': Repeat,
  '/surveys': BarChart3,
  '/inventory': Package,
  '/members': Users,
  '/admin/settings': Settings,
}

const SECTION_ORDER = [t.layout.sections.main, t.layout.sections.music, t.layout.sections.community, t.layout.sections.management]

const ROLE_LABELS: Record<string, string> = {
  admin: t.layout.roles.admin,
  manager: t.layout.roles.manager,
  user: t.layout.roles.member,
  candidate: t.layout.roles.candidate,
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const sidebarItems = useSidebarItems()
  // Maintenance mode is polled every 30s. It gates authenticated non-admin
  // sessions only, so admins can always log in to disable it; public routes
  // (login, /s/:id, /badge*) stay reachable.
  const { data: settings } = useAppSettings(30000)
  const updateSettings = useUpdateAppSettings()
  const role = profile?.role ?? null
  const [maintOpen, setMaintOpen] = useState(false)
  const [maintEnabled, setMaintEnabled] = useState(false)
  const [maintMsg, setMaintMsg] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const openMaintDialog = () => {
    setMaintEnabled(settings?.maintenance_mode === true)
    setMaintMsg(settings?.maintenance_message ?? '')
    setMaintOpen(true)
  }

  const saveMaintDialog = async () => {
    await updateSettings.mutateAsync({ maintenance_mode: maintEnabled, maintenance_message: maintMsg })
    setMaintOpen(false)
  }

  // Close the mobile drawer and the account menu on every navigation.
  useEffect(() => {
    setSidebarOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  // Allow Escape to close the mobile drawer or the account menu.
  // Close the account menu on outside click.
  useEffect(() => {
    if (!sidebarOpen && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setMenuOpen(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [sidebarOpen, menuOpen])

  if (user && role && role !== 'admin' && settings?.maintenance_mode === true) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">{t.layout.maintenanceTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {settings.maintenance_message !== '' ? settings.maintenance_message : t.layout.maintenanceFallback}
          </p>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  // Figma top bar carries the sidebar toggle on every screen: on mobile it
  // opens the drawer, on desktop it collapses the in-flow sidebar.
  const toggleMenu = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setCollapsed((v) => !v)
    } else {
      setSidebarOpen((v) => !v)
    }
  }

  const avatarInitial = (
    profile?.first_name?.trim()?.[0] ??
    profile?.username?.trim()?.[0] ??
    '?'
  ).toUpperCase()

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: sidebarItems.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0)

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-5">
        <Link to="/dashboard" className="text-lg font-bold tracking-tight rounded focus-visible:outline-2 focus-visible:outline-offset-2">
          {t.layout.appName}
        </Link>
      </div>
      <nav aria-label={t.layout.mainNavLabel} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {grouped.map((group) => (
          <div key={group.section} className="mb-4 last:mb-0">
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.path] ?? LayoutDashboard
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      aria-current={undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                          isActive
                            ? 'bg-white/15 text-white'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={18} aria-hidden="true" className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {isActive && <span className="sr-only">{t.layout.currentPage}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        {t.layout.skipToContent}
      </a>

      <div className="flex">
        {/* Desktop sidebar — in-flow, sticky, scrollable, collapsible via top bar */}
        <aside className={cn('sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card text-white md:block', collapsed && 'md:hidden')}>
          {sidebarContent}
        </aside>

        {/* Mobile drawer */}
        <div className={cn('md:hidden', !sidebarOpen && 'pointer-events-none')}>
          <div
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'fixed inset-0 z-40 bg-black/50 transition-opacity',
              sidebarOpen ? 'opacity-100' : 'opacity-0',
            )}
          />
          <aside
            id="app-sidebar"
            aria-hidden={!sidebarOpen}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r bg-card text-white shadow-xl transition-transform duration-200',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {sidebarContent}
          </aside>
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Global top bar — Figma: sidebar toggle left, maintenance badge
              + profile avatar right. Rendered on every screen. */}
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4">
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              aria-label={sidebarOpen ? t.layout.closeMenu : t.layout.openMenu}
              className="rounded-lg p-2.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="md:hidden">
                {sidebarOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </span>
              <span className="hidden md:block">
                {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
              </span>
            </button>
            <Link to="/dashboard" className="font-bold rounded focus-visible:outline-2 focus-visible:outline-offset-2">
              {t.layout.appShortName}
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {role === 'admin' && user && (
                <>
                  {settings?.maintenance_mode === true && (
                    <Badge variant="destructive">{t.layout.maintenanceBadge}</Badge>
                  )}
                  <button
                    type="button"
                    onClick={openMaintDialog}
                    aria-label={t.layout.maintenanceSettings}
                    title={t.layout.maintenanceActive}
                    className={cn(
                      'rounded-lg p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2',
                      settings?.maintenance_mode === true
                        ? 'bg-[#AB0F0F]/75 text-white'
                        : 'hover:bg-muted',
                    )}
                  >
                    <ShieldAlert size={20} aria-hidden="true" />
                  </button>
                </>
              )}
              {user && profile ? (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label={t.layout.accountMenu}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    className="rounded-full bg-white p-[2px] focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6F939A] text-lg font-semibold text-white"
                    >
                      {avatarInitial}
                    </span>
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label={t.layout.accountMenu}
                      className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-card shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                        <span className="truncate text-sm font-medium">{profile.username}</span>
                        <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
                      </div>
                      {role !== 'candidate' && (
                        <Link
                          to="/profile"
                          role="menuitem"
                          className="flex min-h-10 items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2"
                        >
                          <User size={16} aria-hidden="true" /> {t.nav.profile}
                        </Link>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex min-h-10 w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2"
                      >
                        <LogOut size={16} aria-hidden="true" /> {t.layout.logout}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {t.layout.login}
                </Link>
              )}
            </div>
          </header>

          <AddDialog open={maintOpen} onOpenChange={setMaintOpen} title={t.layout.maintenanceSettings}>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={maintEnabled} onChange={setMaintEnabled} aria-label={t.adminSettings.maintenanceModeLabel} />
                {t.adminSettings.maintenanceModeLabel}
              </label>
              <div>
                <Label>{t.adminSettings.maintenanceMessageLabel}</Label>
                <Input value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)} />
              </div>
              <Button type="button" disabled={updateSettings.isPending} onClick={saveMaintDialog}>
                {t.adminSettings.save}
              </Button>
            </div>
          </AddDialog>

          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-8">
              <Outlet />
            </div>
          </main>

          {/* Global footer — Figma: full-width bar on every screen. */}
          <footer className="border-t py-3 text-center text-xs text-muted-foreground">
            {t.layout.footerPrefix} <a href='http://instagram.com/antooo.fusco_'>{t.layout.footerMadeBy}</a> {t.layout.footerAnd} <a href='https://instagram.com/_irenedorsi_'>{t.layout.footerNex}</a> {t.layout.footerSuffix}
          </footer>
        </div>
      </div>
    </div>
  )
}
