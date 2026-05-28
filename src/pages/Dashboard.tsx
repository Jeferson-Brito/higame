import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAppSettings } from '@/lib/ranking'
import { calculateLevel } from '@/lib/utils'
import { Link } from 'react-router-dom'
import type { Season, Ranking, AppSettings } from '@/types'
import { Flame, Target, Trophy, Star, ChevronRight, CheckCircle2, Lock, Shield, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

// Tipos para os retornos do DB
interface EmployeeQuest {
  id: string
  progress: number
  completed: boolean
  quest: {
    id: string
    name: string
    description: string
    xp_reward: number
    coin_reward: number
    target_value: number
    frequency: string
  }
}

interface EmployeeBadge {
  id: string
  unlocked_at: string
  badge: {
    id: string
    name: string
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  }
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-600 border-slate-400/30 text-slate-300',
  rare: 'from-blue-400 to-blue-600 border-blue-400/30 text-blue-300 shadow-glow-neon',
  epic: 'from-purple-400 to-purple-600 border-purple-400/30 text-purple-300 shadow-glow-purple',
  legendary: 'from-amber-400 to-amber-600 border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
  mythic: 'from-red-500 to-rose-700 border-red-500/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)]',
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  
  // Real data state
  const [quests, setQuests] = useState<EmployeeQuest[]>([])
  const [badges, setBadges] = useState<EmployeeBadge[]>([])
  
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

      if (season) {
        const rankingData = await supabase
          .from('rankings')
          .select('*')
          .eq('employee_id', profileId)
          .eq('season_id', season.id)
          .single()
        setRanking(rankingData.data as Ranking | null)
      }

      // Fetch Quests (do dia/semana que o colaborador precisa fazer)
      const { data: questsData } = await supabase
        .from('employee_quests')
        .select(`
          id, progress, completed,
          quest:quests(id, name, description, xp_reward, coin_reward, target_value, frequency)
        `)
        .eq('employee_id', profileId)
        .order('completed', { ascending: true }) // não completadas primeiro

      // As vezes o TS reclama quando é join de uma linha 
      const mappedQuests = (questsData ?? []).map((q: any) => ({
        ...q,
        quest: Array.isArray(q.quest) ? q.quest[0] : q.quest
      })) as EmployeeQuest[]

      setQuests(mappedQuests)

      // Fetch Badges (apenas as que ele já tem para mostrar na vitrine)
      const { data: badgesData } = await supabase
        .from('employee_badges')
        .select(`
          id, unlocked_at,
          badge:badges(id, name, icon, rarity)
        `)
        .eq('employee_id', profileId)
        .order('unlocked_at', { ascending: false })
        .limit(4) // mostra as 4 últimas

      const mappedBadges = (badgesData ?? []).map((b: any) => ({
        ...b,
        badge: Array.isArray(b.badge) ? b.badge[0] : b.badge
      })) as EmployeeBadge[]

      setBadges(mappedBadges)

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

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
  const streak = profile?.current_streak ?? 0

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. HERO SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-higame-purple/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-higame-neon/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="relative p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start z-10">
          
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
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-higame-neon text-white px-4 py-1 rounded-full font-outfit font-black text-lg shadow-glow-neon flex items-center gap-1">
              <Star className="w-4 h-4 text-higame-neon fill-higame-neon" />
              {level}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5" /> Streak: {streak} dias
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-outfit font-black text-white mb-1 tracking-tight">
              {profile?.full_name ?? 'Colaborador'}
            </h1>
            <p className="text-higame-neon font-medium text-lg mb-6">{profile?.position ?? 'Sem Cargo'}</p>

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
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md min-w-[140px]">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Rank Atual</p>
            {ranking?.rank_position ? (
              <div className="text-4xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-500">
                #{ranking.rank_position}
              </div>
            ) : (
              <div className="text-2xl font-outfit font-black text-slate-500">--</div>
            )}
            <p className="text-xs text-slate-400 mt-2">Temporada Ativa</p>
          </div>
        </div>
      </motion.div>

      {/* 2. MISSÕES (QUESTS) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <Target className="w-6 h-6 text-higame-neon" />
          <h2 className="text-2xl font-outfit font-bold text-white">Minhas Missões</h2>
        </div>
        
        {quests.length === 0 ? (
          <div className="glass-card p-10 text-center border-dashed border-white/10 text-slate-400">
            Você não possui missões ativas no momento. Seu gestor logo enviará novas missões!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quests.map((eq, i) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`relative overflow-hidden rounded-2xl p-5 border flex flex-col justify-between ${
                  eq.completed 
                    ? 'bg-higame-success/10 border-higame-success/30' 
                    : 'glass-card'
                }`}
              >
                {eq.completed && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-higame-success/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
                )}
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`p-2 rounded-xl ${eq.completed ? 'bg-higame-success/20 text-higame-success' : 'bg-slate-800 text-higame-neon'}`}>
                    {eq.completed ? <CheckCircle2 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                  </div>
                  <div className="flex gap-2">
                    {eq.quest.xp_reward > 0 && (
                      <span className="text-[10px] font-bold text-higame-purple bg-higame-purple/20 px-2 py-1 rounded-md whitespace-nowrap">
                        +{eq.quest.xp_reward} XP
                      </span>
                    )}
                    {eq.quest.coin_reward > 0 && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/20 px-2 py-1 rounded-md whitespace-nowrap">
                        +{eq.quest.coin_reward} HC
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-outfit font-bold text-white mb-2 relative z-10">{eq.quest.name}</h3>
                <p className="text-xs text-slate-400 font-inter mb-4 flex-1">{eq.quest.description}</p>

                <div className="relative z-10">
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>Progresso</span>
                    <span>{eq.progress} / {eq.quest.target_value}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${eq.completed ? 'bg-higame-success' : 'bg-higame-neon'}`} 
                      style={{ width: `${Math.min(100, (eq.progress / eq.quest.target_value) * 100)}%` }} 
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 3. VITRINE DE CONQUISTAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-outfit font-bold text-white">Minhas Conquistas</h2>
          </div>
          <Link to="/badges" className="text-sm font-inter font-bold text-higame-neon hover:text-white transition-colors flex items-center gap-1">
            Ver todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {badges.length === 0 ? (
          <div className="glass-card p-10 text-center border-dashed border-white/10 text-slate-400">
            Você ainda não possui nenhuma medalha. Continue se esforçando para desbloqueá-las!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {badges.map((eb, i) => (
              <motion.div
                key={eb.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="relative overflow-hidden rounded-2xl p-6 border bg-slate-900/50 backdrop-blur-md flex flex-col items-center text-center group"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${RARITY_COLORS[eb.badge.rarity]} opacity-5 group-hover:opacity-10 transition-opacity`} />
                
                <div className={`w-16 h-16 rounded-2xl border-2 mb-3 flex items-center justify-center text-3xl transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 bg-gradient-to-br ${RARITY_COLORS[eb.badge.rarity]}`}>
                  {eb.badge.icon}
                </div>

                <h3 className="font-outfit font-bold text-white text-sm mb-1">{eb.badge.name}</h3>
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {new Date(eb.unlocked_at).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
