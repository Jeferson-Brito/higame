import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Trophy, History, User,
  Users, Calendar, Settings, BarChart3,
  LogOut, Zap, ChevronLeft, ChevronRight,
  ClipboardList, Store, Award, Target
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ============================================================
// Navegação por role
// ============================================================

const EMPLOYEE_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    to: '/dashboard' },
  { icon: Trophy,          label: 'Ranking',      to: '/ranking' },
  { icon: Users,           label: 'Jogadores',    to: '/players' },
  { icon: History,         label: 'Temporadas',   to: '/seasons' },
  { icon: User,            label: 'Meu Perfil',   to: '/profile' },
  { icon: Award,           label: 'Medalhas',     to: '/badges' },
  { icon: Store,           label: 'Loja',         to: '/store' },
]

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Painel',        to: '/admin' },
  { icon: Users,           label: 'Colaboradores', to: '/admin/employees' },
  { icon: Target,          label: 'Missões',       to: '/admin/quests' },
  { icon: Award,           label: 'Medalhas',      to: '/admin/badges' },
  { icon: Calendar,        label: 'Temporadas',    to: '/admin/seasons' },
  { icon: ClipboardList,   label: 'Resultados',    to: '/admin/results' },
  { icon: Trophy,          label: 'Ranking',       to: '/admin/ranking' },
  { icon: Store,           label: 'Loja',          to: '/admin/store' },
]

// ============================================================
// Sidebar Component
// ============================================================

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV

  const handleSignOut = async () => {
    await signOut()
    toast.success('Até logo! 👋', {
      style: { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }
    })
    navigate('/login')
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col bg-higame-surface/80 backdrop-blur-glass border border-higame-border
                 fixed left-4 top-4 bottom-4 z-40 rounded-3xl overflow-hidden shadow-glass"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-higame-border flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-higame flex items-center justify-center flex-shrink-0 shadow-glow-purple">
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-outfit font-black text-gradient whitespace-nowrap"
            >
              HIGAME
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-inter font-medium transition-all duration-200 cursor-pointer',
                isActive
                  ? 'text-higame-text bg-higame-purple/10 border border-higame-purple/20 shadow-glow-purple/20'
                  : 'text-higame-text2 hover:text-higame-text hover:bg-higame-surface2'
              )
            }
            title={collapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-higame-purple' : 'text-higame-muted'
                )} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-higame-border flex-shrink-0 space-y-1">
        {/* Perfil */}
        <div className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl',
          !collapsed && 'bg-higame-surface2'
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-higame flex items-center justify-center flex-shrink-0 text-xs font-outfit font-bold text-white">
            {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'HG'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-outfit font-semibold text-higame-text truncate">
                  {profile?.full_name ?? 'Usuário'}
                </p>
                <p className="text-xs font-inter text-higame-muted capitalize">
                  {profile?.role === 'admin' ? 'Administrador' : profile?.position ?? 'Colaborador'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sair' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-inter
                     font-medium text-higame-muted hover:text-higame-danger hover:bg-higame-danger/10
                     transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-10 w-6 h-6 bg-higame-blurple text-white
                   rounded-full flex items-center justify-center shadow-glow-purple
                   hover:scale-110 transition-all duration-200 z-50 border-2 border-slate-900"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>
    </motion.aside>
  )
}
