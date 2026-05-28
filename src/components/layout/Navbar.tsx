import { Bell, ChevronDown, Coins, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials, calculateLevel } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getAppSettings } from '@/lib/ranking'
import { AvatarFrame } from '@/components/ui/AvatarFrame'
import toast from 'react-hot-toast'

export function Navbar() {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [xpPerLevel, setXpPerLevel] = useState(1000)
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile?.id) return

    async function fetchStats() {
      try {
        const settings = await getAppSettings()
        setXpPerLevel(settings.xp_per_level)

        const { data: season } = await supabase
          .from('seasons').select('id').eq('status', 'active').single()
        
        if (season) {
          const { data: rank } = await supabase
            .from('rankings').select('total_xp').eq('employee_id', profile!.id).eq('season_id', season.id).single()
          
          if (rank) setTotalXp(rank.total_xp)
        }

        // Fetch Notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('profile_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (notifs) {
          setNotifications(notifs)
          setUnreadCount(notifs.filter(n => !n.is_read).length)
        }
      } catch (err) {
        console.error(err)
      }
    }
    
    void fetchStats()
  }, [profile?.id])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    toast.success('Até logo! 👋', {
      style: { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }
    })
    navigate('/login')
  }

  const markAllAsRead = async () => {
    if (unreadCount === 0 || !profile?.id) return
    await supabase.from('notifications').update({ is_read: true }).eq('profile_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
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

      {/* Direita: stats + notificação + avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Stats (Level & Coins) */}
        {profile?.role === 'employee' && (
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-higame-surface2 border border-higame-border rounded-xl shadow-inner">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-outfit font-bold text-white">Nível {calculateLevel(totalXp, xpPerLevel)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-higame-surface2 border border-amber-500/20 rounded-xl shadow-glow-gold/10">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-outfit font-bold text-amber-400">{profile.coins_balance.toLocaleString()} HC</span>
            </div>
          </div>
        )}

        {/* Notificações */}
        <div className="relative">
          <button 
            onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false) }}
            className="w-9 h-9 rounded-xl bg-higame-surface2 border border-higame-border
                             flex items-center justify-center text-higame-muted
                             hover:text-higame-text hover:border-higame-border2 transition-all duration-200 relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-higame-purple shadow-glow-purple" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-higame-surface2
                              border border-higame-border shadow-card z-50 overflow-hidden flex flex-col max-h-[400px]">
                <div className="p-3 border-b border-higame-border flex justify-between items-center bg-slate-900/50">
                  <span className="text-sm font-bold text-white">Notificações</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-higame-purple hover:text-white transition-colors">
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">Nenhuma notificação.</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.is_read && markAsRead(n.id)}
                        className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-higame-purple/5' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-higame-purple' : 'bg-transparent'}`} />
                          <div>
                            <p className={`text-sm ${!n.is_read ? 'text-white font-bold' : 'text-slate-300'}`}>{n.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar + Menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-higame-surface2
                       border border-higame-border hover:border-higame-border2
                       transition-all duration-200"
          >
            {/* Avatar */}
            <AvatarFrame 
              avatarUrl={profile?.avatar_url}
              fullName={profile?.full_name || 'Usuário'}
              size="sm"
              frameRarity={profile?.active_frame?.rarity}
            />
            <div className="hidden sm:flex flex-col items-start min-w-0 ml-1">
              <span className="text-xs font-outfit font-semibold text-higame-text leading-tight truncate max-w-[120px]">
                {profile?.full_name ?? 'Usuário'}
              </span>
              {profile?.active_title && (
                <span className="text-[9px] font-bold text-higame-purple tracking-widest uppercase">
                  {profile.active_title.name}
                </span>
              )}
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
