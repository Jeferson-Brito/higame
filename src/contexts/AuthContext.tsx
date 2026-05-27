import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  isAdmin: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return

  const clearFromStorage = (storage: Storage) => {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i)
      if (!key) continue

      if (key.startsWith('sb-') && (key.includes('auth-token') || key.includes('code-verifier'))) {
        storage.removeItem(key)
      }
    }
  }

  try {
    clearFromStorage(window.localStorage)
    clearFromStorage(window.sessionStorage)
  } catch (err) {
    console.warn('Não foi possível limpar a sessão local do Supabase:', err)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearAuthState = useCallback(() => {
    setUser(null)
    setSession(null)
    setProfile(null)
    clearSupabaseAuthStorage()
  }, [])

  const forceSignOut = useCallback(async () => {
    clearAuthState()

    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (err) {
      console.warn('Erro ao encerrar sessão local:', err)
      clearSupabaseAuthStorage()
    }
  }, [clearAuthState])

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar perfil:', error)
        await forceSignOut()
        return null
      }

      if (!data || data.deleted_at || !data.is_active) {
        await forceSignOut()
        return null
      }

      const nextProfile = data as Profile
      setProfile(nextProfile)
      return nextProfile
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil:', err)
      await forceSignOut()
      return null
    }
  }, [forceSignOut])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
    }, 8000)

    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => {
        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)
          setProfile(null)
        } else {
          clearAuthState()
          setIsLoading(false)
        }
      })
      .catch(err => {
        console.error('Erro no getSession:', err)
        clearAuthState()
        setIsLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (nextSession?.user) {
          setIsLoading(true)
          setSession(nextSession)
          setUser(nextSession.user)
          setProfile(null)
        } else {
          clearAuthState()
          setIsLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [clearAuthState])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) return

    let isActive = true
    setIsLoading(true)

    fetchProfile(userId).finally(() => {
      if (isActive) setIsLoading(false)
    })

    return () => {
      isActive = false
    }
  }, [session?.user.id, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await forceSignOut()
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    isLoading,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
