import { Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/lib/utils'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface NavbarProps {
  sidebarCollapsed: boolean
}

export function Navbar({ sidebarCollapsed }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    toast.success('Até logo! 👋', {
      style: { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }
    })
    navigate('/login')
  }

  return (
    <header
      className="h-16 bg-higame-surface/80 backdrop-blur-glass
                 border border-higame-border flex items-center justify-between px-4 sm:px-6
                 transition-all duration-300 rounded-2xl shadow-glass"
    >
      {/* Mobile: logo */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-higame flex items-center justify-center">
          <span className="text-white font-outfit font-black text-xs">HG</span>
        </div>
        <span className="font-outfit font-black text-gradient text-lg">HIGAME</span>
      </div>

      {/* Desktop: espaço vazio ou breadcrumb futuro */}
      <div className="hidden lg:block" />

      {/* Direita: notificação + avatar */}
      <div className="flex items-center gap-3">

        {/* Notificações */}
        <button className="w-9 h-9 rounded-xl bg-higame-surface2 border border-higame-border
                           flex items-center justify-center text-higame-muted
                           hover:text-higame-text hover:border-higame-border2 transition-all duration-200 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-higame-purple" />
        </button>

        {/* Avatar + Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-higame-surface2
                       border border-higame-border hover:border-higame-border2
                       transition-all duration-200"
          >
            {/* Avatar */}
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-7 h-7 rounded-lg object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-higame flex items-center justify-center
                              text-white font-outfit font-bold text-xs">
                {getInitials(profile?.full_name ?? 'HG')}
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-xs font-outfit font-semibold text-higame-text leading-tight truncate max-w-[120px]">
                {profile?.full_name ?? 'Usuário'}
              </span>
              <span className="text-[10px] font-inter text-higame-muted capitalize">
                {profile?.role === 'admin' ? 'Admin' : profile?.position ?? 'Colaborador'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-higame-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-higame-surface2
                              border border-higame-border shadow-card z-50 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile') }}
                  className="w-full px-4 py-2.5 text-left text-sm font-inter text-higame-text2
                             hover:text-higame-text hover:bg-higame-surface3 transition-colors"
                >
                  Meu Perfil
                </button>
                <div className="border-t border-higame-border" />
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2.5 text-left text-sm font-inter text-higame-danger
                             hover:bg-higame-danger/10 transition-colors"
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
