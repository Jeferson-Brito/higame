import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

interface PrivateRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-higame-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-higame-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-higame-muted font-inter text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    // Redireciona admin para /admin, employee para /dashboard
    const redirectTo = profile?.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
