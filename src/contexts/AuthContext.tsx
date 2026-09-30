import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

interface SignUpDetails {
  firstName?: string
  lastName?: string
  classe?: string
}

interface AuthContextType {
  user: string | null
  profile: Database['public']['Tables']['profiles']['Row'] | null
  loading: boolean
  signUp: (username: string, password: string, details?: SignUpDetails) => Promise<void>
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
})

// Synthetic domain used to map usernames to emails for Supabase Auth.
// IMPORTANT: the domain is part of the stored auth email, so changing it
// after users exist orphans those accounts (sign-in maps to a different
// email). Override only via VITE_AUTH_EMAIL_DOMAIN before launch.
// NOTE: Supabase validates (incl. DNS) an address when it tries to SEND
// mail to it, so the hosted project must have "Confirm email" OFF —
// synthetic addresses have no mailbox and can never confirm.
const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'theorems.local'

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user.id)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData ?? null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user.id)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profileData ?? null)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (username: string, password: string, details?: SignUpDetails) => {
    const normalizedUsername = username.trim().toLowerCase()
    const email = usernameToEmail(normalizedUsername)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const firstName = details?.firstName?.trim() || null
      const lastName = details?.lastName?.trim() || null
      const classe = details?.classe?.trim() || null
      const fullName =
        [firstName, lastName].filter(Boolean).join(' ') || null
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        role: 'candidate',
        username: normalizedUsername,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        classe,
        auth_id: data.user.id,
      })
    }
  }

  const signIn = async (username: string, password: string) => {
    const email = usernameToEmail(username)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      setProfile(profileData ?? null)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
