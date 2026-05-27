import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Trophy, History, User, Users, Calendar, BarChart3, ClipboardList } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const EMPLOYEE_NAV = [
  { icon: LayoutDashboard, label: 'Home',     to: '/dashboard' },
  { icon: Trophy,          label: 'Ranking',  to: '/ranking' },
  { icon: History,         label: 'Histórico',to: '/seasons' },
  { icon: User,            label: 'Perfil',   to: '/profile' },
]

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Início',    to: '/admin' },
  { icon: Users,           label: 'Equipe',    to: '/admin/employees' },
  { icon: Calendar,        label: 'Temporadas',to: '/admin/seasons' },
  { icon: ClipboardList,   label: 'Resultados',to: '/admin/results' },
  { icon: BarChart3,       label: 'Ranking',   to: '/admin/ranking' },
]

export function BottomNav() {
  const { isAdmin } = useAuth()
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-higame-surface/95 backdrop-blur-md border-t border-higame-border">
      <div className="flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-3 px-3 rounded-xl transition-all duration-200 min-w-0 flex-1',
                isActive
                  ? 'text-higame-purple'
                  : 'text-higame-muted'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  'w-5 h-5 transition-all duration-200',
                  isActive && 'drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]'
                )} />
                <span className="text-[10px] font-inter font-medium truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
