import { useAuth } from '@/contexts/AuthContext'
import type { AppRole } from '@/lib/supabase'
import { strings as t } from '@/i18n'

export function useRole(): AppRole | null {
  const { profile } = useAuth()
  return profile?.role ?? null
}

export function useCan(permission: string): boolean {
  const role = useRole()
  if (!role) return false
  const permissions: Record<string, AppRole[]> = {
    view_dashboard: ['admin', 'manager', 'user', 'candidate'],
    manage_members: ['admin', 'manager'],
    manage_content: ['admin', 'manager'],
    manage_auditions: ['admin', 'manager'],
    manage_inventory: ['admin'],
    manage_badges: ['admin'],
    delete_member: ['admin'],
    reset_password: ['admin'],
    view_all_proposals: ['admin', 'manager'],
  }
  return permissions[permission]?.includes(role) ?? false
}

interface RouteGuardConfig {
  allowedRoles: AppRole[]
}

export function useRouteGuard(config: RouteGuardConfig): boolean {
  const { profile } = useAuth()
  if (!profile) return false
  return config.allowedRoles.includes(profile.role)
}

export interface SidebarItem {
  label: string
  path: string
  roles: AppRole[]
  section: 'Principale' | 'Musica' | 'Comunità' | 'Gestione'
}

export function useSidebarItems(): SidebarItem[] {
  const role = useRole()
  if (!role) return []

  const items: SidebarItem[] = [
    { label: t.nav.dashboard, path: '/dashboard', roles: ['admin', 'manager', 'user', 'candidate'] as AppRole[], section: t.layout.sections.main },
    { label: t.nav.bulletin, path: '/bulletin', roles: ['admin', 'manager', 'user', 'candidate'] as AppRole[], section: t.layout.sections.main },
    { label: t.nav.songs, path: '/songs', roles: ['admin', 'manager', 'user'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.mySongs, path: '/my-songs', roles: ['admin', 'manager', 'user'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.setlists, path: '/setlists', roles: ['admin', 'manager', 'user'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.proposals, path: '/proposals', roles: ['admin', 'manager', 'user'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.auditions, path: '/auditions', roles: ['admin', 'manager', 'candidate'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.events, path: '/events', roles: ['admin', 'manager', 'user'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.rehearsals, path: '/rehearsals', roles: ['admin', 'manager', 'user'] as AppRole[], section: t.layout.sections.music },
    { label: t.nav.surveys, path: '/surveys', roles: ['admin'] as AppRole[], section: t.layout.sections.community },
    { label: t.nav.inventory, path: '/inventory', roles: ['admin', 'manager'] as AppRole[], section: t.layout.sections.community },
    { label: t.nav.members, path: '/members', roles: ['admin', 'manager'] as AppRole[], section: t.layout.sections.management },
    { label: t.nav.settings, path: '/admin/settings', roles: ['admin'] as AppRole[], section: t.layout.sections.management },
  ]

  return items.filter(item => item.roles.includes(role))
}
