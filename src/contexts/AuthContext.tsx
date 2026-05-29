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
        .select('*, active_title:store_items!fk_active_title(name), active_frame:store_items!fk_active_frame(rarity, asset_url), active_banner:store_items!fk_active_banner(asset_url)')
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

      const formattedProfile = {
        ...data,
        active_title: data?.active_title ? (Array.isArray(data.active_title) ? data.active_title[0] : data.active_title) : null,
        active_frame: data?.active_frame ? (Array.isArray(data.active_frame) ? data.active_frame[0] : data.active_frame) : null,
        active_banner: data?.active_banner ? (Array.isArray(data.active_banner) ? data.active_banner[0] : data.active_banner) : null,
      } as Profile

      // --- Lógica de Daily Streak ---
      if (formattedProfile.role === 'employee') {
        const now = new Date()
        const lastLoginStr = formattedProfile.last_login
        
        let needsUpdate = false
        let newStreak = formattedProfile.current_streak || 0
        let newLongest = formattedProfile.longest_streak || 0
        
        if (!lastLoginStr) {
          needsUpdate = true
          newStreak = 1
          newLongest = 1
        } else {
          const lastLoginDate = new Date(lastLoginStr)
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const lastLoginDay = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate())
          
          const diffTime = today.getTime() - lastLoginDay.getTime()
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays === 1) {
            // Logou no dia seguinte consecutivo
            needsUpdate = true
            newStreak += 1
            if (newStreak > newLongest) newLongest = newStreak
          } else if (diffDays > 1) {
            // Quebrou o streak
            needsUpdate = true
            newStreak = 1
          }
        }
        
        if (needsUpdate) {
          formattedProfile.current_streak = newStreak
          formattedProfile.longest_streak = newLongest
          formattedProfile.last_login = now.toISOString()
          
          // Fire and forget update
          supabase.from('profiles').update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_login: now.toISOString()
          }).eq('id', userId).then()
          
          // Evento de feed para marcos importantes de streak (ex: múltiplos de 7)
          if (newStreak > 1 && newStreak % 7 === 0) {
            supabase.from('feed_events').insert({
              profile_id: userId,
              event_type: 'streak_milestone',
              event_data: { streak: newStreak }
            }).then()
          }
        }
      }
      // ------------------------------

      setProfile(formattedProfile)
      return formattedProfile
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
      (event, nextSession) => {
        if (event === 'SIGNED_OUT') {
          clearAuthState()
          setIsLoading(false)
        } else if (nextSession?.user) {
          if (event === 'SIGNED_IN') {
            setIsLoading(true)
            setProfile(null)
          }
          setSession(nextSession)
          setUser(nextSession.user)
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
