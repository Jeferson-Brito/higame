import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getAppSettings } from '@/lib/ranking'
import { calculateLevel } from '@/lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import type { Season, Ranking, AppSettings, BattlePassSeason, BattlePassProgress, BattlePassReward } from '@/types'
import { Trophy, Star, Shield, Target, Play, ChevronRight, Menu, Users, ShoppingCart, Newspaper, LogOut } from 'lucide-react'
import { PremiumToastContainer } from '@/components/PremiumToast'
import { usePremiumToasts } from '@/hooks/usePremiumToasts'

// Tipos para os retornos do DB
interface EmployeeQuest {
  id: string
  progress: number
  completed: boolean
  quest: { name: string; target_value: number }
}

interface TopPlayer {
  employee_id: string
  total_xp: number
  total_trophies: number
  rank_position: number
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const prevLevelRef = useRef<number | null>(null)
  const { toasts, dismissToast, showLevelUp } = usePremiumToasts()
  
  // Real data state
  const [season, setSeason] = useState<Season | null>(null)
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<TopPlayer[]>([])
  const [firstQuest, setFirstQuest] = useState<EmployeeQuest | null>(null)
  const [bpSeason, setBpSeason] = useState<BattlePassSeason | null>(null)
  const [bpProgress, setBpProgress] = useState<BattlePassProgress | null>(null)
  const [gameOver, setGameOver] = useState(false)
  
  const profileId = profile?.id

  const fetchAll = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    try {
      const [settingsData, seasonData] = await Promise.all([
        getAppSettings(),
        supabase.from('seasons').select('*').eq('status', 'active').single(),
      ])
      
      setSettings(settingsData)
      const currentSeason = seasonData.data as Season | null
      setSeason(currentSeason)

      let rankingData: any = null
      if (currentSeason) {
        const result = await supabase
          .from('rankings')
          .select('*')
          .eq('employee_id', profileId)
          .eq('season_id', currentSeason.id)
          .single()
        rankingData = result
        setRanking(result.data as Ranking | null)

        // Fetch ALL employees and their rankings
        const [profilesRes, rankingsRes, bpSeasonRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, avatar_url').eq('role', 'employee'),
          supabase.from('rankings').select('employee_id, total_xp, rank_position').eq('season_id', currentSeason.id),
          supabase.from('battle_pass_seasons').select('id').eq('is_active', true).is('deleted_at', null).maybeSingle()
        ])

        const allEmps = profilesRes.data ?? []
        const seasonRanks = rankingsRes.data ?? []
        const activeBpId = bpSeasonRes.data?.id

        let bpProgresses: any[] = []
        if (activeBpId) {
          const progRes = await supabase.from('battle_pass_progress').select('employee_id, total_bp_xp').eq('season_id', activeBpId)
          bpProgresses = progRes.data ?? []
        }

        // Map and merge
        const mappedPlayers: TopPlayer[] = allEmps.map((emp: any) => {
          const r = seasonRanks.find((rank: any) => rank.employee_id === emp.id)
          const bp = bpProgresses.find((p: any) => p.employee_id === emp.id)
          return {
            employee_id: emp.id,
            total_xp: r ? r.total_xp : 0,
            total_trophies: bp ? bp.total_bp_xp : 0,
            rank_position: r ? r.rank_position : 999,
            profile: emp
          }
        })

        // Sort by total_trophies desc
        mappedPlayers.sort((a, b) => b.total_trophies - a.total_trophies)

        setAllPlayers(mappedPlayers)
        setTopPlayers(mappedPlayers.slice(0, 3))
      }

      // Fetch First Incomplete Quest
      const { data: questsData } = await supabase
        .from('employee_quests')
        .select(`
          id, progress, completed,
          quest:quests(name, target_value)
        `)
        .eq('employee_id', profileId)
        .eq('completed', false)
        .limit(1)

      if (questsData && questsData.length > 0) {
        setFirstQuest({
          ...questsData[0],
          quest: Array.isArray(questsData[0].quest) ? questsData[0].quest[0] : questsData[0].quest
        } as EmployeeQuest)
      }

      // Fetch Battle Pass
      const { data: bpSeasonData } = await supabase
        .from('battle_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (bpSeasonData) {
        setBpSeason(bpSeasonData as BattlePassSeason)
        const bpProgressRes = await supabase.from('battle_pass_progress')
            .select('*')
            .eq('employee_id', profileId)
            .eq('season_id', bpSeasonData.id)
            .maybeSingle()
        setBpProgress(bpProgressRes.data as BattlePassProgress | null)
      }

      // Detect Level Up
      const xpPerLevelCalc = settingsData.xp_per_level
      const rankDataFetched = rankingData?.data as Ranking | null
      if (rankDataFetched) {
        const newLevel = calculateLevel(rankDataFetched.total_xp, xpPerLevelCalc)
        if (prevLevelRef.current !== null && newLevel > prevLevelRef.current) {
          showLevelUp(newLevel)
        }
        prevLevelRef.current = newLevel
      }

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
      <div className="h-screen w-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-higame-neon border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalXp = ranking?.total_xp ?? 0
  const totalTrophies = bpProgress?.total_bp_xp ?? 0
  const xpPerLevel = settings?.xp_per_level ?? 1000
  const level = calculateLevel(totalXp, xpPerLevel)
  const coins = profile?.coins_balance ?? 0

  const handleLogout = () => {
    setGameOver(true)
    setTimeout(() => {
      signOut()
    }, 2500)
  }

  return (
    <div className="h-screen w-screen bg-[#0a0f1c] overflow-hidden relative font-outfit text-white">
      {/* Background */}
      <img src="/assets/lobby_bg.png" alt="Lobby BG" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c]/50 pointer-events-none" />

      {/* Premium Toast Container */}
      <PremiumToastContainer toasts={toasts} onDismiss={dismissToast} />

      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm"
          >
            <motion.h1 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
              className="text-7xl md:text-9xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]"
            >
              GAME OVER
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 text-xl font-bold text-red-400 animate-pulse tracking-widest"
            >
              SALVANDO PROGRESSO...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP BAR --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-40 pointer-events-none">
        
        {/* Profile Badge (Clickable) */}
        <div 
          onClick={() => navigate('/profile')} 
          className="pointer-events-auto cursor-pointer bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-4 shadow-lg hover:bg-slate-800 transition-colors"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-higame-neon bg-slate-800">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold">{profile?.full_name?.charAt(0) || 'U'}</div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-higame-neon text-[#0a0f1c] text-[10px] sm:text-xs font-black text-center py-0.5 uppercase tracking-wider">
              LVL {level}
            </div>
          </div>
          <div className="pr-4">
            <h3 className="text-lg sm:text-xl font-black tracking-tight">{profile?.full_name?.split(' ')[0]}</h3>
            <div className="flex items-center gap-1.5 text-amber-400 text-sm font-black">
              <Trophy className="w-4 h-4" /> {totalTrophies.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Right Currencies & Menu */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Trophies */}
          <div className="hidden sm:flex bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 items-center gap-2 shadow-lg">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="font-black text-base">{totalTrophies.toLocaleString()}</span>
          </div>
          {/* Coins (HC) */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <Star className="w-5 h-5 text-higame-neon fill-higame-neon" />
            <span className="font-black text-base">{coins.toLocaleString()} HC</span>
          </div>
          {/* Menu Btn */}
          <button onClick={handleLogout} className="w-12 h-12 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors ml-2">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* --- LEFT SIDEBAR (Navigation) --- */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
        {[
          { icon: ShoppingCart, label: 'LOJA', path: '/store', color: 'from-blue-500 to-cyan-400' },
          { icon: Users, label: 'JOGADORES', path: '/players', color: 'from-purple-500 to-pink-500' },
          { icon: Trophy, label: 'RANKING', path: '/ranking', color: 'from-amber-500 to-orange-500' },
          { icon: Newspaper, label: 'NEWS', path: '/dashboard', color: 'from-emerald-500 to-teal-400' },
        ].map((item, i) => (
          <Link key={i} to={item.path} className="group flex flex-col items-center">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} p-[2px] shadow-lg group-hover:scale-105 transition-transform cursor-pointer`}>
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20`} />
                <item.icon className="w-6 h-6 text-white relative z-10" />
              </div>
            </div>
            <span className="text-[10px] font-black mt-1 tracking-wider text-slate-300 drop-shadow-md group-hover:text-white transition-colors">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* --- RIGHT SIDEBAR (Players/Friends) --- */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-16 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl py-4 flex flex-col items-center gap-3 z-40">
        <span className="text-[9px] font-black text-slate-400 tracking-widest -rotate-90 my-6">PLAYERS</span>
        {allPlayers.map((player) => (
          <div key={player.employee_id} className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full border-2 border-slate-700 overflow-hidden bg-slate-800 hover:border-higame-neon transition-colors">
              {player.profile.avatar_url ? (
                <img src={player.profile.avatar_url} alt="P" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-xs font-bold">{player.profile.full_name?.charAt(0)}</span>
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              <p className="text-xs font-bold text-white">{player.profile.full_name}</p>
              <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <Trophy className="w-3 h-3" /> {player.total_trophies.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* --- CENTER PODIUM --- */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pt-10">
        
        {/* Title */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-center mb-8 relative"
        >
          <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20" />
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ WebkitTextStroke: '2px #7c2d12' }}>
            PÓDIO
          </h1>
          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mt-[-10px]" style={{ WebkitTextStroke: '1px #1e293b' }}>
            TEMPORADA #{season?.id?.substring(0,2) || '1'}
          </h2>
          {ranking && (
             <div className="absolute -right-10 top-0 bg-higame-purple border border-white/20 text-white px-3 py-1 rounded-lg text-xs font-black shadow-xl rotate-12">
               RANK ATUAL<br/>
               <span className="text-2xl text-amber-300">#{ranking.rank_position}</span>
             </div>
          )}
        </motion.div>

        {/* Podium Structure */}
        <div className="flex items-end justify-center h-48 md:h-64 mt-4 relative z-20 w-full max-w-2xl px-16">
          
          {/* Top 2 */}
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-1/3 flex flex-col items-center relative z-10">
             {topPlayers[1] && (
               <div className="relative mb-2 flex flex-col items-center">
                 <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-full border-4 border-slate-300 overflow-hidden shadow-[0_0_15px_rgba(203,213,225,0.5)] z-20">
                   {topPlayers[1].profile.avatar_url && <img src={topPlayers[1].profile.avatar_url} className="w-full h-full object-cover" />}
                 </div>
                 <div className="bg-slate-900 border border-slate-300 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full -mt-3 z-30 shadow-md whitespace-nowrap flex flex-col items-center">
                    <span>{topPlayers[1].profile.full_name.split(' ')[0]}</span>
                    <span className="text-[9px] text-amber-400 flex items-center gap-1"><Trophy className="w-2.5 h-2.5" /> {topPlayers[1].total_trophies.toLocaleString()}</span>
                  </div>
               </div>
             )}
             <div className="w-full h-24 md:h-32 bg-gradient-to-b from-slate-400 to-slate-600 rounded-t-lg border-t-4 border-slate-300 flex items-center justify-center relative shadow-2xl">
               <span className="text-4xl font-black text-slate-200/50">2</span>
             </div>
          </motion.div>

          {/* Top 1 */}
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-1/3 flex flex-col items-center relative z-20">
             {topPlayers[0] && (
               <div className="relative mb-2 flex flex-col items-center">
                 <div className="absolute -top-6 text-amber-400 text-3xl animate-bounce">👑</div>
                 <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-800 rounded-full border-4 border-amber-400 overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.6)] z-20">
                   {topPlayers[0].profile.avatar_url && <img src={topPlayers[0].profile.avatar_url} className="w-full h-full object-cover" />}
                 </div>
                 <div className="bg-amber-500 border border-amber-200 text-slate-900 text-xs md:text-sm font-black px-3 py-1 rounded-full -mt-4 z-30 shadow-lg whitespace-nowrap flex flex-col items-center">
                    <span>{topPlayers[0].profile.full_name.split(' ')[0]}</span>
                    <span className="text-[10px] font-black flex items-center gap-1"><Trophy className="w-3 h-3 text-slate-800" /> {topPlayers[0].total_trophies.toLocaleString()}</span>
                  </div>
               </div>
             )}
             <div className="w-full h-32 md:h-44 bg-gradient-to-b from-amber-400 to-orange-600 rounded-t-lg border-t-4 border-amber-200 flex items-center justify-center relative shadow-2xl">
               <span className="text-6xl font-black text-amber-200/50">1</span>
             </div>
          </motion.div>

          {/* Top 3 */}
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="w-1/3 flex flex-col items-center relative z-10">
             {topPlayers[2] && (
               <div className="relative mb-2 flex flex-col items-center">
                 <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-full border-4 border-amber-700 overflow-hidden shadow-[0_0_15px_rgba(180,83,9,0.5)] z-20">
                   {topPlayers[2].profile.avatar_url && <img src={topPlayers[2].profile.avatar_url} className="w-full h-full object-cover" />}
                 </div>
                 <div className="bg-slate-900 border border-amber-700 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full -mt-3 z-30 shadow-md whitespace-nowrap flex flex-col items-center">
                    <span>{topPlayers[2].profile.full_name.split(' ')[0]}</span>
                    <span className="text-[9px] text-amber-400 flex items-center gap-1"><Trophy className="w-2.5 h-2.5" /> {topPlayers[2].total_trophies.toLocaleString()}</span>
                  </div>
               </div>
             )}
             <div className="w-full h-16 md:h-24 bg-gradient-to-b from-amber-700 to-amber-900 rounded-t-lg border-t-4 border-amber-600 flex items-center justify-center relative shadow-2xl">
               <span className="text-3xl font-black text-amber-500/50">3</span>
             </div>
          </motion.div>
          
        </div>
      </div>

      {/* --- BOTTOM SECTION --- */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-40 pointer-events-none">
        
        {/* Battle Pass Widget */}
        <Link to="/battle-pass" className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-3 w-56 flex items-center gap-3 shadow-lg hover:border-purple-400 transition-colors group">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.4)] group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-white leading-tight mb-1">BATTLE PASS</h4>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/10 relative">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-higame-neon" 
                style={{ width: bpProgress && bpSeason ? `${Math.min(100, (bpProgress.current_xp / bpSeason.xp_per_level)*100)}%` : '0%' }}
              />
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-1 text-right">LVL {bpProgress?.current_level ?? 0}</p>
          </div>
        </Link>

        {/* Quests Widget */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-3 w-64 shadow-lg flex flex-col cursor-default">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Missão Ativa</h4>
          </div>
          {firstQuest ? (
            <>
              <p className="text-xs font-bold text-white truncate mb-2">{firstQuest.quest.name}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                <span>Progresso</span>
                <span>{firstQuest.progress} / {firstQuest.quest.target_value}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (firstQuest.progress / firstQuest.quest.target_value)*100)}%` }} />
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">Nenhuma missão ativa</p>
          )}
        </div>

        {/* The Play Button was removed per user request */}

      </div>

    </div>
  )
}
