import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { BattlePassSeason, BattlePassReward, BattlePassProgress, BattlePassClaim, RarityTier } from '@/types'
import { Shield, Zap, Lock, CheckCircle2, Gift, Coins, Award, Star, ChevronLeft, ChevronRight, X, Clock, Trophy } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

// ============================================================
// RARITY CONFIG
// ============================================================

const RARITY_CONFIG: Record<RarityTier, {
  label: string; gradient: string; glow: string; glowColor: string
  border: string; text: string; bg: string; cardBg: string; pulse: boolean
}> = {
  common: {
    label: 'Comum', gradient: 'from-slate-300 to-slate-500',
    glow: 'shadow-[0_0_0px_transparent]', glowColor: 'rgba(148,163,184,0)',
    border: 'border-slate-500/40', text: 'text-slate-300', bg: 'bg-slate-700/30',
    cardBg: 'bg-gradient-to-b from-slate-800/90 to-slate-900/90', pulse: false,
  },
  rare: {
    label: 'Raro', gradient: 'from-blue-300 to-blue-600',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]', glowColor: 'rgba(59,130,246,0.35)',
    border: 'border-blue-400/60', text: 'text-blue-300', bg: 'bg-blue-900/40',
    cardBg: 'bg-gradient-to-b from-blue-900/60 to-slate-900/90', pulse: false,
  },
  epic: {
    label: 'Épico', gradient: 'from-purple-300 to-purple-600',
    glow: 'shadow-[0_0_28px_rgba(168,85,247,0.7)]', glowColor: 'rgba(168,85,247,0.4)',
    border: 'border-purple-400/70', text: 'text-purple-300', bg: 'bg-purple-900/40',
    cardBg: 'bg-gradient-to-b from-purple-900/60 to-slate-900/90', pulse: false,
  },
  legendary: {
    label: 'Lendário', gradient: 'from-amber-300 to-orange-500',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,0.8)]', glowColor: 'rgba(245,158,11,0.5)',
    border: 'border-amber-400/80', text: 'text-amber-300', bg: 'bg-amber-900/40',
    cardBg: 'bg-gradient-to-b from-amber-900/60 to-slate-900/90', pulse: true,
  },
  mythic: {
    label: 'Mítico', gradient: 'from-rose-300 via-fuchsia-400 to-rose-600',
    glow: 'shadow-[0_0_45px_rgba(244,63,94,0.9)]', glowColor: 'rgba(244,63,94,0.55)',
    border: 'border-rose-400/90', text: 'text-rose-300', bg: 'bg-rose-900/40',
    cardBg: 'bg-gradient-to-b from-rose-900/60 to-slate-900/90', pulse: true,
  },
}

const REWARD_TYPE_ICON: Record<string, any> = {
  coins: Coins, badge: Award, store_item: Star, custom: Gift,
}

interface PlayerOnTrack {
  id: string; full_name: string; avatar_url: string | null; current_level: number
}

// ============================================================
// LEVEL UP MODAL
// ============================================================

function LevelUpModal({ level, reward, onClose }: { level: number; reward?: BattlePassReward; onClose: () => void }) {
  const cfg = reward ? RARITY_CONFIG[reward.rarity] : RARITY_CONFIG.common
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.5, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={e => e.stopPropagation()} className="relative max-w-sm w-full mx-4">
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${cfg.gradient} opacity-20 blur-3xl scale-150`} />
        <div className={`relative rounded-3xl border-2 ${cfg.border} ${cfg.bg} backdrop-blur-xl p-8 text-center ${cfg.glow}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          <div className="relative mb-4">
            {[...Array(8)].map((_, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: [0, Math.cos(i * 45 * Math.PI / 180) * 70], y: [0, Math.sin(i * 45 * Math.PI / 180) * 70] }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.9 }}
                className={`absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-gradient-to-r ${cfg.gradient}`}
              />
            ))}
            <div className={`w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center ${cfg.glow} shadow-2xl`}>
              <span className="text-5xl font-black text-white">{level}</span>
            </div>
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${cfg.text}`}>Nível Atingido</p>
          <h2 className="text-3xl font-black text-white mb-2">Nível {level}! 🎉</h2>
          <p className="text-slate-300 text-sm mb-6">{reward ? `Você desbloqueou "${reward.name}"!` : 'Novas recompensas disponíveis!'}</p>
          {reward && (
            <div className={`p-4 rounded-2xl border ${cfg.border} ${cfg.bg} mb-6`}>
              <p className="text-3xl mb-1">{reward.icon || '🎁'}</p>
              <p className="font-bold text-white">{reward.name}</p>
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
// REWARD CARD — estilo game premium
// ============================================================

function RewardCard({ reward, isUnlocked, isClaimed, onClaim, playersHere, isMyLevel, isMilestone }: {
  reward: BattlePassReward; isUnlocked: boolean; isClaimed: boolean
  onClaim: (r: BattlePassReward) => void; playersHere: PlayerOnTrack[]
  isMyLevel: boolean; isMilestone: boolean
}) {
  const [tooltip, setTooltip] = useState(false)
  const cfg = RARITY_CONFIG[reward.rarity]
  const Icon = REWARD_TYPE_ICON[reward.reward_type] || Gift
  const canClaim = isUnlocked && !isClaimed

  const cardHeight = isMilestone ? 110 : 90
  const cardWidth  = isMilestone ? 80 : 68

  return (
    <div className="flex flex-col items-center flex-shrink-0 relative" style={{ width: cardWidth }}>

      {/* Avatares dos jogadores neste nível */}
      <div className="h-8 flex items-end justify-center mb-1.5 relative z-10">
        {playersHere.slice(0, 4).map((p, idx) => (
          <div key={p.id} title={p.full_name}
            className="w-6 h-6 rounded-full border-2 border-slate-950 overflow-hidden flex-shrink-0 -ml-1.5 first:ml-0"
            style={{ zIndex: 10 - idx }}>
            {p.avatar_url
              ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white text-[8px] font-black">{getInitials(p.full_name)}</div>
            }
          </div>
        ))}
        {playersHere.length > 4 && (
          <div className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-700 flex items-center justify-center text-[7px] font-black text-slate-300 -ml-1.5">
            +{playersHere.length - 4}
          </div>
        )}
      </div>

      {/* CARD */}
      <motion.div
        onHoverStart={() => setTooltip(true)}
        onHoverEnd={() => setTooltip(false)}
        whileHover={canClaim ? { y: -6, scale: 1.05 } : isUnlocked ? { y: -3 } : {}}
        className={`
          relative rounded-2xl border-2 flex flex-col items-center justify-between overflow-hidden cursor-default transition-all duration-300
          ${isClaimed
            ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-900/50 to-slate-900/90'
            : isUnlocked
              ? `${cfg.border} ${cfg.cardBg} ${cfg.glow}`
              : 'border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/90'
          }
          ${isMyLevel ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-slate-950' : ''}
          ${isMilestone && isUnlocked && !isClaimed ? 'ring-1 ring-offset-1 ring-offset-slate-950 ' + cfg.border : ''}
        `}
        style={{ width: cardWidth, height: cardHeight, padding: '7px 5px 5px' }}
      >
        {/* Efeito de partícula/glow no fundo do card */}
        {isUnlocked && !isClaimed && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.glowColor} 0%, transparent 70%)` }}
          />
        )}

        {/* Badge de raridade */}
        <div className={`w-full text-center relative z-10`}>
          <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white leading-none
            ${isClaimed ? 'bg-emerald-600/80' : `bg-gradient-to-r ${cfg.gradient}`}`}>
            {isClaimed ? '✓' : isMilestone ? cfg.label : cfg.label.substring(0, 3)}
          </span>
        </div>

        {/* Ícone / emoji */}
        <div className="flex-1 flex items-center justify-center relative z-10 py-1">
          {isClaimed ? (
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </motion.div>
          ) : (
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={isUnlocked && cfg.pulse ? { scale: [1, 1.15, 1], filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] } : {}}
                transition={{ repeat: Infinity, duration: 2.2 }}
                className={`${isMilestone ? 'text-3xl' : 'text-2xl'} ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}
              >
                {reward.icon || <Icon className={`${isMilestone ? 'w-7 h-7' : 'w-5 h-5'} ${!isUnlocked ? 'text-slate-500' : cfg.text}`} />}
              </motion.div>
              
              {!isUnlocked && (
                <div className="absolute -bottom-1 -right-2 bg-slate-900/80 backdrop-blur rounded-full p-0.5 border border-white/10">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nome */}
        <p className={`text-[8px] font-bold text-center leading-tight w-full truncate px-0.5 relative z-10
          ${isClaimed ? 'text-emerald-400' : isUnlocked ? 'text-white' : 'text-slate-600'}`}>
          {reward.name}
        </p>

        {/* Shimmer para lendário/mítico */}
        {isUnlocked && !isClaimed && cfg.pulse && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer pointer-events-none" />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-40 rounded-2xl border ${cfg.border} bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl pointer-events-none ${cfg.glow}`}
            >
              <div className={`text-base mb-1 ${reward.icon ? '' : 'hidden'}`}>{reward.icon}</div>
              <p className="text-[11px] font-black text-white mb-0.5">{reward.name}</p>
              {reward.description && <p className="text-[9px] text-slate-400 leading-snug mb-1">{reward.description}</p>}
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
                {reward.reward_type === 'coins' && reward.reward_value?.amount && (
                  <span className="text-[9px] text-amber-400 font-black">+{reward.reward_value.amount} HC</span>
                )}
              </div>
              <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent`}
                style={{ borderTopColor: 'rgba(148,163,184,0.15)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Botão resgatar */}
      <div className="mt-1.5 h-5 flex items-center justify-center">
        {canClaim ? (
          <motion.button
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            onClick={() => onClaim(reward)}
            className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white bg-gradient-to-r ${cfg.gradient} hover:scale-110 transition-transform leading-none shadow-lg`}
          >
            Resgatar!
          </motion.button>
        ) : isClaimed ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        ) : null}
      </div>

      {/* Badge de nível */}
      <div className={`
        text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 leading-none border
        ${isMyLevel
          ? 'bg-white text-slate-950 border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
          : isClaimed
            ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/30'
            : isUnlocked
              ? `bg-gradient-to-r ${cfg.gradient} text-white border-transparent`
              : 'bg-slate-900 text-slate-600 border-white/5'
        }
      `}>
        {isMilestone ? `★ ${reward.level}` : reward.level}
      </div>
    </div>
  )
}

// ============================================================
// TRACK CONNECTOR — luminoso entre cards
// ============================================================

function TrackConnector({ isUnlocked, gradient, glowColor }: { isUnlocked: boolean; gradient: string; glowColor: string }) {
  return (
    <div className="flex-shrink-0 self-center" style={{ width: 16, marginTop: 18 }}>
      {isUnlocked ? (
        <div
          className={`h-1 w-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{ boxShadow: `0 0 6px ${glowColor}` }}
        />
      ) : (
        <div className="h-0.5 w-full bg-slate-800 rounded-full" />
      )}
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
        .from('battle_pass_seasons').select('*')
        .eq('is_active', true).is('deleted_at', null).maybeSingle()

      if (!seasonData) { setLoading(false); return }
      setSeason(seasonData as BattlePassSeason)

      const [rewardsRes, progressRes, claimsRes, allProgressRes] = await Promise.all([
        supabase.from('battle_pass_rewards').select('*').eq('season_id', seasonData.id).eq('is_active', true).order('level'),
        supabase.from('battle_pass_progress').select('*').eq('employee_id', profile.id).eq('season_id', seasonData.id).maybeSingle(),
        supabase.from('battle_pass_claims').select('*').eq('employee_id', profile.id),
        supabase.from('battle_pass_progress').select('employee_id, current_level, profile:profiles(id, full_name, avatar_url)').eq('season_id', seasonData.id),
      ])

      setRewards((rewardsRes.data ?? []) as BattlePassReward[])
      setProgress(progressRes.data as BattlePassProgress | null)
      setClaims((claimsRes.data ?? []) as BattlePassClaim[])

      const players: PlayerOnTrack[] = (allProgressRes.data ?? []).map((row: any) => {
        const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile
        return { id: prof?.id ?? row.employee_id, full_name: prof?.full_name ?? 'Jogador', avatar_url: prof?.avatar_url ?? null, current_level: row.current_level }
      })
      setPlayersProgress(players)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [profile?.id])

  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!progress || !trackRef.current) return
    const el = trackRef.current.querySelector(`[data-level="${progress.current_level}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [progress, rewards])

  const handleClaim = async (reward: BattlePassReward) => {
    if (!profile?.id || claiming) return
    setClaming(reward.id)
    try {
      const { data, error } = await supabase.rpc('claim_bp_reward', { p_employee_id: profile.id, p_reward_id: reward.id })
      if (error) throw error
      if (!data.success) throw new Error(data.reason)
      toast.success(`🎁 "${reward.name}" resgatado!`, { duration: 4000 })
      await fetchAll()
    } catch (err: any) { toast.error(err.message || 'Erro ao resgatar.') }
    finally { setClaming(null) }
  }

  const scrollTrack = (dir: 'left' | 'right') =>
    trackRef.current?.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' })

  const currentLevel = progress?.current_level ?? 0
  const currentXp    = progress?.current_xp    ?? 0
  const xpPerLevel   = season?.xp_per_level    ?? 1000
  const maxLevel     = season?.max_level        ?? 50
  const progressPct  = Math.min(100, (currentXp / xpPerLevel) * 100)
  const daysLeft     = season ? Math.max(0, Math.ceil((new Date(season.end_date).getTime() - Date.now()) / 86400000)) : 0
  const unclaimedCount = rewards.filter(r => r.level <= currentLevel && !claimedIds.has(r.id)).length

  const playersByLevel: Record<number, PlayerOnTrack[]> = {}
  playersProgress.forEach(p => { if (!playersByLevel[p.current_level]) playersByLevel[p.current_level] = []; playersByLevel[p.current_level].push(p) })

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
        <p className="text-slate-400 max-w-sm">O próximo passe de batalha ainda não foi ativado. Fique de olho!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <AnimatePresence>
        {levelUpData && <LevelUpModal level={levelUpData.level} reward={levelUpData.reward} onClose={() => setLevelUpData(null)} />}
      </AnimatePresence>

      {/* ── HERO HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-purple-500/25 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950" />
        <div className="absolute top-0 right-0 w-[700px] h-[500px] bg-purple-600/20 rounded-full blur-[130px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-blue-600/15 rounded-full blur-[110px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />

        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-7">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.6)]">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/25 px-3 py-1.5 rounded-full">
                  ⚔️ Battle Pass
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{season.name}</h1>
              {season.description && <p className="text-slate-400 mt-1.5 text-sm">{season.description}</p>}
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10 min-w-[84px]">
                <Clock className="w-4 h-4 text-amber-400 mb-1" />
                <p className="text-xl font-black text-amber-400">{daysLeft}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">dias</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-purple-500/10 rounded-2xl border border-purple-500/25 min-w-[84px] shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Shield className="w-4 h-4 text-purple-400 mb-1" />
                <p className="text-xl font-black text-white">{currentLevel}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">nível</p>
              </div>
              {unclaimedCount > 0 && (
                <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  className="flex flex-col items-center justify-center p-4 bg-amber-500/15 rounded-2xl border border-amber-500/40 min-w-[84px] shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Gift className="w-4 h-4 text-amber-400 mb-1" />
                  <p className="text-xl font-black text-amber-400">{unclaimedCount}</p>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">resgatar</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* XP Bar */}
          <div>
            <div className="flex justify-between items-center text-sm font-bold mb-2">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />{currentXp.toLocaleString()} BP XP
              </span>
              <span className="text-slate-500">
                {currentLevel >= maxLevel ? '🏆 NÍVEL MÁXIMO!' : `faltam ${(xpPerLevel - currentXp).toLocaleString()} para Nv.${currentLevel + 1}`}
              </span>
            </div>
            <div className="relative h-5 bg-slate-950 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-400 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
              </motion.div>
              {[25, 50, 75].map(p => <div key={p} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${p}%` }} />)}
              {progressPct > 6 && (
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
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            Trilha de Recompensas
            {unclaimedCount > 0 && (
              <motion.span animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                {unclaimedCount} disponível!
              </motion.span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {playersProgress.length > 0 && (
              <span className="text-[10px] text-slate-500 hidden sm:flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 inline-block" />
                Avatares = posição dos jogadores
              </span>
            )}
            <button onClick={() => scrollTrack('left')} className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={() => scrollTrack('right')} className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Track container — fundo temático de jogo */}
        <div className="relative rounded-3xl overflow-hidden border border-white/8" style={{
          background: 'linear-gradient(180deg, #0a0a1a 0%, #0d0d24 40%, #08081a 100%)',
          boxShadow: 'inset 0 0 80px rgba(88,28,235,0.08), 0 0 0 1px rgba(255,255,255,0.04)'
        }}>
          {/* Estrelas de fundo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: Math.random() * 2 + 1,
                  height: Math.random() * 2 + 1,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.4 + 0.05,
                }}
              />
            ))}
          </div>

          {/* Linha de trilha estilizada */}
          <div className="absolute left-0 right-0 pointer-events-none" style={{ top: '55%', transform: 'translateY(-50%)' }}>
            <div style={{
              height: 3,
              background: 'linear-gradient(90deg, transparent 0%, rgba(88,28,235,0.3) 10%, rgba(88,28,235,0.15) 50%, rgba(88,28,235,0.3) 90%, transparent 100%)',
              boxShadow: '0 0 20px rgba(88,28,235,0.2)',
            }} />
          </div>

          {/* Brilho lateral esquerdo */}
          <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #0a0a1a 0%, transparent 100%)' }} />
          {/* Brilho lateral direito */}
          <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
            style={{ background: 'linear-gradient(-90deg, #0a0a1a 0%, transparent 100%)' }} />

          {rewards.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma recompensa configurada ainda.</p>
            </div>
          ) : (
            <div
              ref={trackRef}
              className="flex items-center overflow-x-auto no-scrollbar scroll-smooth px-6 py-6"
              style={{ scrollSnapType: 'x mandatory', gap: 0, minHeight: 200 }}
            >
              {rewards.map((reward, i) => {
                const isUnlocked  = currentLevel >= reward.level
                const isClaimed   = claimedIds.has(reward.id)
                const isMyLevel   = reward.level === currentLevel
                const isMilestone = reward.level % 5 === 0
                const playersHere = playersByLevel[reward.level] ?? []
                const cfg = RARITY_CONFIG[reward.rarity]
                const nextIsUnlocked = i + 1 < rewards.length && currentLevel >= rewards[i + 1].level

                return (
                  <div
                    key={reward.id}
                    data-level={reward.level}
                    className="flex items-center"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.6) }}
                    >
                      <RewardCard
                        reward={reward}
                        isUnlocked={isUnlocked}
                        isClaimed={isClaimed}
                        onClaim={handleClaim}
                        playersHere={playersHere}
                        isMyLevel={isMyLevel}
                        isMilestone={isMilestone}
                      />
                    </motion.div>
                    {i < rewards.length - 1 && (
                      <TrackConnector
                        isUnlocked={nextIsUnlocked}
                        gradient={cfg.gradient}
                        glowColor={cfg.glowColor}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RANKING DE JOGADORES ── */}
      {playersProgress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Classificação — Battle Pass
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[...playersProgress]
              .sort((a, b) => b.current_level - a.current_level)
              .slice(0, 9)
              .map((p, idx) => {
                const isMe = p.id === profile?.id
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isMe ? 'border-purple-500/40 bg-purple-900/20' : 'border-white/5 bg-white/2 hover:bg-white/4'}`}>
                    <span className="text-sm w-5 text-center">{medals[idx] ?? <span className="text-slate-600 font-black text-xs">{idx + 1}</span>}</span>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-black">{getInitials(p.full_name)}</div>
                      }
                    </div>
                    <p className={`text-sm font-bold truncate flex-1 ${isMe ? 'text-purple-300' : 'text-white'}`}>
                      {p.full_name}{isMe && <span className="text-[10px] text-purple-400 ml-1">(você)</span>}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Shield className="w-3 h-3 text-purple-400" />
                      <span className="text-sm font-black text-white">{p.current_level}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>
      )}

      {/* ── COMO GANHAR BP XP ── */}
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
