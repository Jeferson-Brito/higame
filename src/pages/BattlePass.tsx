import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { BattlePassSeason, BattlePassReward, BattlePassProgress, BattlePassClaim, RarityTier } from '@/types'
import { Shield, Zap, Lock, CheckCircle2, Gift, Coins, Award, Star, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

// ============================================================
// RARITY CONFIG
// ============================================================

const RARITY_CONFIG: Record<RarityTier, {
  label: string; gradient: string; glow: string
  border: string; text: string; bg: string; pulse: boolean
}> = {
  common:    { label: 'Comum',    gradient: 'from-slate-400 to-slate-600',          glow: '',                                               border: 'border-slate-500/50', text: 'text-slate-300',  bg: 'bg-slate-800/60',    pulse: false },
  rare:      { label: 'Raro',     gradient: 'from-blue-400 to-blue-600',             glow: 'shadow-[0_0_14px_rgba(59,130,246,0.55)]',        border: 'border-blue-500/55',  text: 'text-blue-300',   bg: 'bg-blue-900/30',     pulse: false },
  epic:      { label: 'Épico',    gradient: 'from-purple-400 to-purple-600',         glow: 'shadow-[0_0_18px_rgba(168,85,247,0.65)]',        border: 'border-purple-500/65',text: 'text-purple-300', bg: 'bg-purple-900/30',   pulse: false },
  legendary: { label: 'Lendário', gradient: 'from-amber-400 to-amber-600',           glow: 'shadow-[0_0_22px_rgba(245,158,11,0.75)]',        border: 'border-amber-500/75', text: 'text-amber-300',  bg: 'bg-amber-900/30',    pulse: true  },
  mythic:    { label: 'Mítico',   gradient: 'from-rose-400 via-fuchsia-500 to-rose-600', glow: 'shadow-[0_0_28px_rgba(244,63,94,0.85)]',    border: 'border-rose-500/85',  text: 'text-rose-300',   bg: 'bg-rose-900/30',     pulse: true  },
}

const REWARD_TYPE_ICON: Record<string, any> = {
  coins: Coins, badge: Award, store_item: Star, custom: Gift,
}

// ============================================================
// Tipo auxiliar para jogadores na trilha
// ============================================================

interface PlayerOnTrack {
  id: string
  full_name: string
  avatar_url: string | null
  current_level: number
}

// ============================================================
// LEVEL UP MODAL
// ============================================================

function LevelUpModal({ level, reward, onClose }: { level: number; reward?: BattlePassReward; onClose: () => void }) {
  const cfg = reward ? RARITY_CONFIG[reward.rarity] : RARITY_CONFIG.common
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative max-w-sm w-full mx-4"
      >
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${cfg.gradient} opacity-20 blur-3xl scale-150`} />
        <div className={`relative rounded-3xl border-2 ${cfg.border} ${cfg.bg} backdrop-blur-xl p-8 text-center ${cfg.glow}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          <div className="relative mb-4">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: [0, Math.cos(i * 60 * Math.PI / 180) * 60], y: [0, Math.sin(i * 60 * Math.PI / 180) * 60] }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.8 }}
                className={`absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-gradient-to-r ${cfg.gradient}`}
              />
            ))}
            <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center ${cfg.glow} shadow-2xl`}>
              <span className="text-4xl font-black text-white">{level}</span>
            </div>
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${cfg.text}`}>Nível Atingido</p>
          <h2 className="text-3xl font-black text-white mb-2">Nível {level}! 🎉</h2>
          <p className="text-slate-300 text-sm mb-6">{reward ? `Você desbloqueou "${reward.name}"!` : 'Novas recompensas disponíveis!'}</p>
          {reward && (
            <div className={`p-4 rounded-2xl border ${cfg.border} ${cfg.bg} mb-6`}>
              <p className="text-2xl mb-1">{reward.icon || '🎁'}</p>
              <p className="font-bold text-white text-sm">{reward.name}</p>
              <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${cfg.text}`}>{cfg.label}</p>
            </div>
          )}
          <button onClick={onClose} className={`w-full py-3 rounded-xl font-black text-white bg-gradient-to-r ${cfg.gradient} ${cfg.glow} hover:scale-105 transition-transform`}>
            Incrível! 🔥
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// REWARD CARD — compacto
// ============================================================

function RewardCard({ reward, isUnlocked, isClaimed, onClaim, playersHere, isMyLevel }: {
  reward: BattlePassReward
  isUnlocked: boolean
  isClaimed: boolean
  onClaim: (r: BattlePassReward) => void
  playersHere: PlayerOnTrack[]
  isMyLevel: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const cfg = RARITY_CONFIG[reward.rarity]
  const Icon = REWARD_TYPE_ICON[reward.reward_type] || Gift
  const canClaim = isUnlocked && !isClaimed

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 72 }}>

      {/* Avatares dos jogadores neste nível */}
      <div className="h-9 flex items-end justify-center mb-1">
        {playersHere.slice(0, 3).map((p, idx) => (
          <div
            key={p.id}
            title={p.full_name}
            className="w-7 h-7 rounded-full border-2 border-slate-950 overflow-hidden flex-shrink-0 -ml-2 first:ml-0"
            style={{ zIndex: playersHere.length - idx }}
          >
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white text-[9px] font-black">
                {getInitials(p.full_name)}
              </div>
            )}
          </div>
        ))}
        {playersHere.length > 3 && (
          <div className="w-7 h-7 rounded-full border-2 border-slate-950 bg-slate-700 flex items-center justify-center text-[8px] font-black text-slate-300 -ml-2">
            +{playersHere.length - 3}
          </div>
        )}
      </div>

      {/* Card */}
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={canClaim ? { scale: 1.06, y: -3 } : {}}
        className={`
          relative rounded-xl border-2 flex flex-col items-center justify-between overflow-hidden cursor-default transition-all duration-200
          ${isClaimed
            ? 'border-emerald-500/50 bg-emerald-900/25'
            : isUnlocked
              ? `${cfg.border} ${cfg.bg} ${cfg.glow}`
              : 'border-white/8 bg-slate-900/50'}
          ${isMyLevel ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-slate-950' : ''}
        `}
        style={{ width: 68, height: 84, padding: '6px 4px 4px' }}
      >
        {/* Gradiente de fundo */}
        {isUnlocked && !isClaimed && (
          <div className={`absolute inset-0 bg-gradient-to-b ${cfg.gradient} opacity-8 pointer-events-none`} />
        )}

        {/* Badge de raridade */}
        <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r ${cfg.gradient} text-white leading-none`}>
          {cfg.label.substring(0, 3)}
        </span>

        {/* Ícone */}
        <div className="flex-1 flex items-center justify-center">
          {isClaimed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : !isUnlocked ? (
            <Lock className="w-4 h-4 text-slate-600" />
          ) : (
            <motion.div
              animate={cfg.pulse ? { scale: [1, 1.12, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-xl leading-none"
            >
              {reward.icon || <Icon className={`w-5 h-5 ${cfg.text}`} />}
            </motion.div>
          )}
        </div>

        {/* Nome truncado */}
        <p className={`text-[8px] font-bold text-center leading-tight w-full truncate px-0.5 ${isClaimed ? 'text-emerald-400' : isUnlocked ? 'text-white' : 'text-slate-600'}`}>
          {isClaimed ? '✓ OK' : reward.name}
        </p>

        {/* Tooltip ao hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-36 rounded-xl border ${cfg.border} ${cfg.bg} backdrop-blur-xl p-2.5 shadow-2xl pointer-events-none`}
            >
              <p className="text-[10px] font-black text-white mb-0.5">{reward.name}</p>
              {reward.description && <p className="text-[9px] text-slate-400 leading-snug">{reward.description}</p>}
              <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${cfg.text}`}>{cfg.label}</p>
              {reward.reward_type === 'coins' && reward.reward_value?.amount && (
                <p className="text-[9px] text-amber-400 font-bold mt-0.5">+{reward.reward_value.amount} HC</p>
              )}
              {/* Seta */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent`}
                style={{ borderTopColor: 'rgba(255,255,255,0.1)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Botão resgatar / status */}
      <div className="mt-1 h-5 flex items-center justify-center">
        {canClaim ? (
          <motion.button
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            onClick={() => onClaim(reward)}
            className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white bg-gradient-to-r ${cfg.gradient} hover:scale-110 transition-transform leading-none`}
          >
            Resgatar
          </motion.button>
        ) : isClaimed ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Lock className="w-3 h-3 text-slate-700" />
        )}
      </div>

      {/* Nível */}
      <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5 leading-none ${
        isMyLevel ? 'bg-white text-slate-950' : isUnlocked ? `bg-gradient-to-r ${cfg.gradient} text-white` : 'bg-slate-800 text-slate-500'
      }`}>
        {reward.level}
      </div>
    </div>
  )
}

// ============================================================
// CONNECTOR LINE between cards
// ============================================================

function Connector({ isUnlocked, gradient }: { isUnlocked: boolean; gradient: string }) {
  return (
    <div className="flex-shrink-0 flex items-center" style={{ width: 12, marginTop: 46 }}>
      <div className={`h-0.5 w-full ${isUnlocked ? `bg-gradient-to-r ${gradient}` : 'bg-slate-800'}`} />
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function BattlePass() {
  const { profile } = useAuth()
  const trackRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState<BattlePassSeason | null>(null)
  const [rewards, setRewards] = useState<BattlePassReward[]>([])
  const [progress, setProgress] = useState<BattlePassProgress | null>(null)
  const [claims, setClaims] = useState<BattlePassClaim[]>([])
  const [claiming, setClaming] = useState<string | null>(null)
  const [levelUpData, setLevelUpData] = useState<{ level: number; reward?: BattlePassReward } | null>(null)
  const [playersProgress, setPlayersProgress] = useState<PlayerOnTrack[]>([])

  const claimedIds = new Set(claims.map(c => c.reward_id))

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data: seasonData } = await supabase
        .from('battle_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (!seasonData) { setLoading(false); return }
      setSeason(seasonData as BattlePassSeason)

      const [rewardsRes, progressRes, claimsRes, allProgressRes] = await Promise.all([
        supabase.from('battle_pass_rewards').select('*').eq('season_id', seasonData.id).eq('is_active', true).order('level'),
        supabase.from('battle_pass_progress').select('*').eq('employee_id', profile.id).eq('season_id', seasonData.id).maybeSingle(),
        supabase.from('battle_pass_claims').select('*').eq('employee_id', profile.id),
        // Busca progresso de todos + perfil para os avatares
        supabase.from('battle_pass_progress')
          .select('employee_id, current_level, profile:profiles(id, full_name, avatar_url)')
          .eq('season_id', seasonData.id),
      ])

      setRewards((rewardsRes.data ?? []) as BattlePassReward[])
      setProgress(progressRes.data as BattlePassProgress | null)
      setClaims((claimsRes.data ?? []) as BattlePassClaim[])

      // Mapeia jogadores para exibição na trilha
      const players: PlayerOnTrack[] = (allProgressRes.data ?? []).map((row: any) => {
        const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile
        return {
          id: prof?.id ?? row.employee_id,
          full_name: prof?.full_name ?? 'Jogador',
          avatar_url: prof?.avatar_url ?? null,
          current_level: row.current_level,
        }
      })
      setPlayersProgress(players)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => { void fetchAll() }, [fetchAll])

  // Auto-scroll para o nível atual
  useEffect(() => {
    if (!progress || !trackRef.current) return
    const el = trackRef.current.querySelector(`[data-level="${progress.current_level}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [progress, rewards])

  const handleClaim = async (reward: BattlePassReward) => {
    if (!profile?.id || claiming) return
    setClaming(reward.id)
    try {
      const { data, error } = await supabase.rpc('claim_bp_reward', {
        p_employee_id: profile.id,
        p_reward_id: reward.id,
      })
      if (error) throw error
      if (!data.success) throw new Error(data.reason)
      toast.success(`🎁 "${reward.name}" resgatado!`, { duration: 4000 })
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resgatar recompensa.')
    } finally {
      setClaming(null)
    }
  }

  const scrollTrack = (dir: 'left' | 'right') => {
    trackRef.current?.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' })
  }

  const currentLevel = progress?.current_level ?? 0
  const currentXp    = progress?.current_xp    ?? 0
  const xpPerLevel   = season?.xp_per_level    ?? 1000
  const maxLevel     = season?.max_level        ?? 50
  const progressPct  = Math.min(100, (currentXp / xpPerLevel) * 100)
  const daysLeft     = season ? Math.max(0, Math.ceil((new Date(season.end_date).getTime() - Date.now()) / 86400000)) : 0
  const unclaimedCount = rewards.filter(r => r.level <= currentLevel && !claimedIds.has(r.id)).length

  // Agrupa jogadores por nível para exibir na trilha
  const playersByLevel: Record<number, PlayerOnTrack[]> = {}
  playersProgress.forEach(p => {
    if (!playersByLevel[p.current_level]) playersByLevel[p.current_level] = []
    playersByLevel[p.current_level].push(p)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-bold">Carregando Battle Pass...</p>
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-white/10 flex items-center justify-center">
          <Shield className="w-12 h-12 text-slate-600" />
        </div>
        <h2 className="text-2xl font-black text-white">Nenhum Battle Pass Ativo</h2>
        <p className="text-slate-400 max-w-sm">O próximo passe de batalha ainda não foi ativado. Fique de olho nas novidades!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <AnimatePresence>
        {levelUpData && (
          <LevelUpModal level={levelUpData.level} reward={levelUpData.reward} onClose={() => setLevelUpData(null)} />
        )}
      </AnimatePresence>

      {/* ── HEADER HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-purple-500/20 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />

        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-7">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                  Battle Pass
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{season.name}</h1>
              {season.description && <p className="text-slate-400 mt-1 text-sm">{season.description}</p>}
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10 min-w-[80px]">
                <Clock className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-xl font-black text-amber-400">{daysLeft}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">dias</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 min-w-[80px] shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Shield className="w-4 h-4 text-purple-400 mb-1" />
                <p className="text-xl font-black text-white">{currentLevel}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">nível</p>
              </div>
              {unclaimedCount > 0 && (
                <div className="flex flex-col items-center justify-center p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 min-w-[80px] shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Gift className="w-4 h-4 text-amber-400 mb-1 animate-bounce" />
                  <p className="text-xl font-black text-amber-400">{unclaimedCount}</p>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">resgatar</p>
                </div>
              )}
            </div>
          </div>

          {/* Barra de XP */}
          <div>
            <div className="flex justify-between items-center text-sm font-bold mb-2">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />{currentXp.toLocaleString()} BP XP
              </span>
              <span className="text-slate-500">
                {currentLevel >= maxLevel ? 'NÍVEL MÁXIMO!' : `${(xpPerLevel - currentXp).toLocaleString()} para Nv. ${currentLevel + 1}`}
              </span>
            </div>
            <div className="relative h-5 bg-slate-950 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-400 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </motion.div>
              {[25, 50, 75].map(p => (
                <div key={p} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${p}%` }} />
              ))}
              {progressPct > 5 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white drop-shadow">{Math.round(progressPct)}%</span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
              <span>Nv. {currentLevel}</span><span>Nv. {Math.min(maxLevel, currentLevel + 1)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── TRILHA DE RECOMPENSAS ── */}
      <div className="relative">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            Trilha de Recompensas
            {unclaimedCount > 0 && (
              <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
                {unclaimedCount} pra resgatar!
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {/* Legenda jogadores */}
            {playersProgress.length > 0 && (
              <span className="text-[10px] text-slate-500 hidden sm:flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 inline-block" />
                Fotos = posição dos jogadores
              </span>
            )}
            <button onClick={() => scrollTrack('left')}
              className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={() => scrollTrack('right')}
              className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        <div className="relative bg-slate-950/70 border border-white/5 rounded-3xl overflow-hidden">
          {/* Linha central da trilha */}
          <div className="absolute inset-0 flex items-center pointer-events-none px-6">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          {rewards.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma recompensa configurada ainda.</p>
            </div>
          ) : (
            <div
              ref={trackRef}
              className="flex items-end overflow-x-auto no-scrollbar scroll-smooth px-5 py-5"
              style={{ scrollSnapType: 'x mandatory', gap: 0 }}
            >
              {rewards.map((reward, i) => {
                const isUnlocked = currentLevel >= reward.level
                const isClaimed  = claimedIds.has(reward.id)
                const isMyLevel  = reward.level === currentLevel
                const playersHere = playersByLevel[reward.level] ?? []
                const cfg = RARITY_CONFIG[reward.rarity]
                const nextIsUnlocked = i + 1 < rewards.length && currentLevel >= rewards[i + 1].level

                return (
                  <div
                    key={reward.id}
                    data-level={reward.level}
                    style={{ scrollSnapAlign: 'start', display: 'flex', alignItems: 'flex-end' }}
                  >
                    <RewardCard
                      reward={reward}
                      isUnlocked={isUnlocked}
                      isClaimed={isClaimed}
                      onClaim={handleClaim}
                      playersHere={playersHere}
                      isMyLevel={isMyLevel}
                    />
                    {i < rewards.length - 1 && (
                      <Connector
                        isUnlocked={nextIsUnlocked}
                        gradient={cfg.gradient}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RANKING DE JOGADORES NO PASS ── */}
      {playersProgress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" /> Classificação — Battle Pass
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[...playersProgress]
              .sort((a, b) => b.current_level - a.current_level)
              .slice(0, 9)
              .map((p, idx) => {
                const isMe = p.id === profile?.id
                const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-600']
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isMe ? 'border-purple-500/40 bg-purple-900/20' : 'border-white/5 bg-white/2 hover:bg-white/4'
                    }`}
                  >
                    <span className={`text-sm font-black w-5 text-center ${rankColors[idx] ?? 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-black">
                          {getInitials(p.full_name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isMe ? 'text-purple-300' : 'text-white'}`}>
                        {p.full_name} {isMe && <span className="text-[10px] text-purple-400">(você)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-right flex-shrink-0">
                      <Shield className="w-3 h-3 text-purple-400" />
                      <span className="text-sm font-black text-white">{p.current_level}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>
      )}

      {/* ── INFO COMO GANHAR BP XP ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '🎯', label: 'Missões Diárias',  desc: 'Complete missões diárias para ganhar BP XP', color: 'border-blue-500/20 bg-blue-900/10' },
          { icon: '📅', label: 'Missões Semanais', desc: 'Missões semanais rendem mais BP XP',          color: 'border-purple-500/20 bg-purple-900/10' },
          { icon: '⭐', label: 'KPIs Ouro',         desc: 'Bater metas de ouro concede BP XP bônus',    color: 'border-amber-500/20 bg-amber-900/10' },
        ].map(item => (
          <div key={item.label} className={`p-3 rounded-2xl border ${item.color} flex items-center gap-3`}>
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-bold text-white text-sm">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
