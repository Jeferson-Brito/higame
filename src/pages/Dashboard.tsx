import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAppSettings } from '@/lib/ranking'
import { calculateLevel } from '@/lib/utils'
import type { Season, Ranking, AppSettings } from '@/types'
import { Flame, Target, Trophy, Star, ChevronRight, CheckCircle2, Lock, Shield, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================
// Mock Data para demonstração do WOW factor enquanto o DB enche
// ============================================================
const MOCK_QUESTS = [
  { id: 1, title: 'Bater meta de TME Diária', xp: 50, coins: 10, progress: 100, target: 100, completed: true, icon: Target },
  { id: 2, title: 'Resolver 15 chamados', xp: 30, coins: 5, progress: 12, target: 15, completed: false, icon: Shield },
  { id: 3, title: 'Não receber reabertura', xp: 100, coins: 20, progress: 1, target: 1, completed: false, icon: Crown },
]

const MOCK_BADGES = [
  { id: 1, name: 'Primeiro Ouro', rarity: 'rare', icon: '🏆', date: 'Hoje' },
  { id: 2, name: '7 Dias On Fire', rarity: 'epic', icon: '🔥', date: 'Ontem' },
  { id: 3, name: 'Máquina de TME', rarity: 'legendary', icon: '⚡', date: 'Há 3 dias' },
  { id: 4, name: 'Mestre Jedi', rarity: 'mythic', icon: '⚔️', date: 'Bloqueado' },
]

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-600 border-slate-400/30 text-slate-300',
  rare: 'from-blue-400 to-blue-600 border-blue-400/30 text-blue-300 shadow-glow-neon',
  epic: 'from-purple-400 to-purple-600 border-purple-400/30 text-purple-300 shadow-glow-purple',
  legendary: 'from-amber-400 to-amber-600 border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
  mythic: 'from-red-500 to-rose-700 border-red-500/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)]',
}

// ============================================================
// Dashboard Premium SaaS / RPG
// ============================================================

export default function Dashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  
  const profileId = profile?.id

  const fetchAll = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [settingsData, seasonData] = await Promise.all([
        getAppSettings(),
        supabase.from('seasons').select('*').eq('status', 'active').single(),
      ])
      setSettings(settingsData)
      const season = seasonData.data as Season | null

      if (!season) return

      const rankingData = await supabase
        .from('rankings')
        .select('*')
        .eq('employee_id', profileId)
        .eq('season_id', season.id)
        .single()

      setRanking(rankingData.data as Ranking | null)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const handleClaimQuest = (id: number) => {
    const quest = MOCK_QUESTS.find(item => item.id === id)
    toast.success(`+${quest?.xp ?? 0} XP Ganhos!`, { icon: '✨' })
    // Aqui virá a lógica real de claim
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-higame-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalXp = ranking?.total_xp ?? 0
  const xpPerLevel = settings?.xp_per_level ?? 1000
  const level = calculateLevel(totalXp, xpPerLevel)
  const currentLevelXp = totalXp % xpPerLevel
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXp / xpPerLevel) * 100))
  
  // Mock de Streak
  const streak = profile?.current_streak ?? 14

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* =========================================================
          1. HERO SECTION (BATTLE PASS STYLE)
      ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl"
      >
        {/* Banners e Glows Fundo */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-higame-purple/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-higame-neon/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="relative p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start z-10">
          
          {/* Avatar e Moldura */}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-higame-neon via-higame-purple to-higame-neon opacity-70 blur-md group-hover:opacity-100 transition duration-500 animate-pulse-glow" />
            <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-2 border-white/20 bg-slate-900">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-blurple text-4xl font-outfit font-black text-white">
                  {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'HG'}
                </div>
              )}
            </div>
            {/* Level Badge Flutuante */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-higame-neon text-white px-4 py-1 rounded-full font-outfit font-black text-lg shadow-glow-neon flex items-center gap-1">
              <Star className="w-4 h-4 text-higame-neon fill-higame-neon" />
              {level}
            </div>
          </div>

          {/* Info Principal */}
          <div className="flex-1 text-center md:text-left mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5" /> Streak: {streak} dias
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-outfit font-black text-white mb-1 tracking-tight">
              {profile?.full_name ?? 'Colaborador'}
            </h1>
            <p className="text-higame-neon font-medium text-lg mb-6">Mestre da Qualidade</p>

            {/* Barra de XP Premium */}
            <div className="max-w-xl">
              <div className="flex justify-between text-sm font-inter font-bold text-slate-300 mb-2">
                <span>XP Total: <span className="text-white">{totalXp.toLocaleString()}</span></span>
                <span>Faltam {xpPerLevel - currentLevelXp} XP</span>
              </div>
              
              <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-higame-purple to-higame-neon relative"
                >
                  {/* Shimmer Effect dentro da barra */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Rank Badge */}
          <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md min-w-[140px]">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Rank Atual</p>
            {ranking?.rank_position ? (
              <div className="text-4xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-500">
                #{ranking.rank_position}
              </div>
            ) : (
              <div className="text-2xl font-outfit font-black text-slate-500">--</div>
            )}
            <p className="text-xs text-slate-400 mt-2">Temporada 1</p>
          </div>
        </div>
      </motion.div>

      {/* =========================================================
          2. MISSÕES DIÁRIAS (QUESTS)
      ========================================================= */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <Target className="w-6 h-6 text-higame-neon" />
          <h2 className="text-2xl font-outfit font-bold text-white">Missões de Hoje</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MOCK_QUESTS.map((quest, i) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`relative overflow-hidden rounded-2xl p-5 border ${
                quest.completed 
                  ? 'bg-higame-success/10 border-higame-success/30' 
                  : 'glass-card'
              }`}
            >
              {quest.completed && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-higame-success/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
              )}
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-2 rounded-xl ${quest.completed ? 'bg-higame-success/20 text-higame-success' : 'bg-slate-800 text-higame-neon'}`}>
                  <quest.icon className="w-5 h-5" />
                </div>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-higame-purple bg-higame-purple/20 px-2 py-1 rounded-md">+{quest.xp} XP</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/20 px-2 py-1 rounded-md">+{quest.coins} 💰</span>
                </div>
              </div>

              <h3 className="font-outfit font-bold text-white mb-4 relative z-10">{quest.title}</h3>

              <div className="relative z-10">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Progresso</span>
                  <span>{quest.progress} / {quest.target}</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${quest.completed ? 'bg-higame-success' : 'bg-higame-neon'}`} 
                    style={{ width: `${(quest.progress / quest.target) * 100}%` }} 
                  />
                </div>
              </div>

              {quest.completed && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-higame-success/5 backdrop-blur-[2px] flex items-center justify-center z-20"
                >
                  <button 
                    onClick={() => handleClaimQuest(quest.id)}
                    className="flex items-center gap-2 px-6 py-2 bg-higame-success text-slate-950 font-bold rounded-xl hover:scale-105 transition-transform shadow-glow-green"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Resgatar
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* =========================================================
          3. VITRINE DE CONQUISTAS (BADGES)
      ========================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-outfit font-bold text-white">Minhas Conquistas</h2>
          </div>
          <button className="text-sm font-inter font-bold text-higame-neon hover:text-white transition-colors flex items-center gap-1">
            Ver todas <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MOCK_BADGES.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className={`relative overflow-hidden rounded-2xl p-6 border bg-slate-900/50 backdrop-blur-md flex flex-col items-center text-center group cursor-pointer ${
                badge.rarity === 'mythic' ? 'opacity-50 grayscale' : ''
              }`}
            >
              {/* Background Glow baseado na raridade */}
              <div className={`absolute inset-0 bg-gradient-to-b ${RARITY_COLORS[badge.rarity]} opacity-5 group-hover:opacity-10 transition-opacity`} />
              
              {/* Badge Icon Box */}
              <div className={`w-16 h-16 rounded-2xl border-2 mb-3 flex items-center justify-center text-3xl transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 bg-gradient-to-br ${RARITY_COLORS[badge.rarity]}`}>
                {badge.icon}
              </div>

              <h3 className="font-outfit font-bold text-white text-sm mb-1">{badge.name}</h3>
              
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {badge.rarity === 'mythic' ? (
                  <><Lock className="w-3 h-3" /> Bloqueado</>
                ) : (
                  <>{badge.date}</>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  )
}
