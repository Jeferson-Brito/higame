import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { BattlePassSeason, BattlePassReward, BattlePassProgress, BattlePassClaim, RarityTier } from '@/types'
import { Shield, Zap, Lock, CheckCircle2, Gift, Coins, Award, Star, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================
// RARITY CONFIG
// ============================================================

const RARITY_CONFIG: Record<RarityTier, {
  label: string
  gradient: string
  glow: string
  border: string
  text: string
  bg: string
  pulse: boolean
}> = {
  common: {
    label: 'Comum', gradient: 'from-slate-400 to-slate-600',
    glow: '', border: 'border-slate-500/40', text: 'text-slate-300',
    bg: 'bg-slate-800/60', pulse: false,
  },
  rare: {
    label: 'Raro', gradient: 'from-blue-400 to-blue-600',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]', border: 'border-blue-500/50', text: 'text-blue-300',
    bg: 'bg-blue-900/30', pulse: false,
  },
  epic: {
    label: 'Épico', gradient: 'from-purple-400 to-purple-600',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.6)]', border: 'border-purple-500/60', text: 'text-purple-300',
    bg: 'bg-purple-900/30', pulse: false,
  },
  legendary: {
    label: 'Lendário', gradient: 'from-amber-400 to-amber-600',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.7)]', border: 'border-amber-500/70', text: 'text-amber-300',
    bg: 'bg-amber-900/30', pulse: true,
  },
  mythic: {
    label: 'Mítico', gradient: 'from-rose-400 via-fuchsia-500 to-rose-600',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.8)]', border: 'border-rose-500/80', text: 'text-rose-300',
    bg: 'bg-rose-900/30', pulse: true,
  },
}

const REWARD_TYPE_ICON: Record<string, any> = {
  coins: Coins,
  badge: Award,
  store_item: Star,
  custom: Gift,
}

// ============================================================
// LEVEL UP MODAL
// ============================================================

function LevelUpModal({ level, reward, onClose }: { level: number; reward?: BattlePassReward; onClose: () => void }) {
  const cfg = reward ? RARITY_CONFIG[reward.rarity] : RARITY_CONFIG.common
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        {/* Glow de fundo */}
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-b ${cfg.gradient} opacity-20 blur-3xl scale-150`} />

        <div className={`relative rounded-3xl border-2 ${cfg.border} ${cfg.bg} backdrop-blur-xl p-8 text-center ${cfg.glow}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>

          {/* Animação de estrelas */}
          <div className="relative mb-4">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, (Math.cos(i * 60 * Math.PI / 180)) * 60],
                  y: [0, (Math.sin(i * 60 * Math.PI / 180)) * 60],
                }}
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
          <p className="text-slate-300 text-sm mb-6">
            {reward ? `Você desbloqueou "${reward.name}"!` : 'Novas recompensas disponíveis!'}
          </p>

          {reward && (
            <div className={`p-4 rounded-2xl border ${cfg.border} ${cfg.bg} mb-6`}>
              <p className="text-2xl mb-1">{reward.icon || '🎁'}</p>
              <p className="font-bold text-white text-sm">{reward.name}</p>
              <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${cfg.text}`}>{cfg.label}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-black text-white bg-gradient-to-r ${cfg.gradient} ${cfg.glow} hover:scale-105 transition-transform`}
          >
            Incrível! 🔥
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// REWARD CARD
// ============================================================

function RewardCard({
  reward, isCurrent, isUnlocked, isClaimed, onClaim, isLast,
}: {
  reward: BattlePassReward
  isCurrent: boolean
  isUnlocked: boolean
  isClaimed: boolean
  onClaim: (r: BattlePassReward) => void
  isLast: boolean
}) {
  const cfg = RARITY_CONFIG[reward.rarity]
  const Icon = REWARD_TYPE_ICON[reward.reward_type] || Gift

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      {/* Card da recompensa */}
      <motion.div
        whileHover={isUnlocked && !isClaimed ? { scale: 1.05, y: -4 } : {}}
        className={`
          relative w-36 h-44 rounded-2xl border-2 flex flex-col items-center justify-between p-3 overflow-hidden transition-all duration-300 cursor-default
          ${isClaimed ? 'border-emerald-500/40 bg-emerald-900/20' : isUnlocked ? `${cfg.border} ${cfg.bg} ${cfg.glow}` : 'border-white/10 bg-slate-900/50 opacity-60'}
          ${isCurrent ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-transparent' : ''}
        `}
      >
        {/* Gradiente de fundo para unlocked */}
        {isUnlocked && !isClaimed && (
          <div className={`absolute inset-0 bg-gradient-to-b ${cfg.gradient} opacity-10`} />
        )}

        {/* Badge de raridade */}
        <div className={`w-full text-center`}>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r ${cfg.gradient} text-white`}>
            {cfg.label}
          </span>
        </div>

        {/* Ícone da recompensa */}
        <div className="relative flex-1 flex items-center justify-center">
          {isClaimed ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          ) : !isUnlocked ? (
            <Lock className="w-8 h-8 text-slate-600" />
          ) : (
            <motion.div
              animate={cfg.pulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-4xl"
            >
              {reward.icon || <Icon className={`w-10 h-10 ${cfg.text}`} />}
            </motion.div>
          )}
        </div>

        {/* Nome */}
        <p className={`text-[10px] font-bold text-center leading-tight w-full ${isClaimed ? 'text-emerald-400' : isUnlocked ? 'text-white' : 'text-slate-600'}`}>
          {isClaimed ? 'Resgatado' : reward.name}
        </p>
      </motion.div>

      {/* Botão resgatar */}
      {isUnlocked && !isClaimed ? (
        <motion.button
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={() => onClaim(reward)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r ${cfg.gradient} ${cfg.glow} hover:scale-110 transition-transform shadow-lg`}
        >
          Resgatar
        </motion.button>
      ) : isClaimed ? (
        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> OK
        </span>
      ) : (
        <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
          <Lock className="w-3 h-3" /> Bloq.
        </span>
      )}

      {/* Nível */}
      <div className={`
        text-xs font-black px-2 py-0.5 rounded-full
        ${isCurrent ? 'bg-white text-slate-950' : isUnlocked ? `bg-gradient-to-r ${cfg.gradient} text-white` : 'bg-slate-800 text-slate-500'}
      `}>
        Nv. {reward.level}
      </div>

      {/* Linha conectora entre cards (exceto o último) */}
      {!isLast && (
        <div className={`w-8 h-0.5 mt-1 ${isUnlocked ? `bg-gradient-to-r ${cfg.gradient}` : 'bg-slate-700'}`}
          style={{ position: 'relative', bottom: '54px', left: '88px' }}
        />
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

  const claimedIds = new Set(claims.map(c => c.reward_id))

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      // 1. Season ativa
      const { data: seasonData } = await supabase
        .from('battle_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .single()

      if (!seasonData) {
        setLoading(false)
        return
      }
      setSeason(seasonData as BattlePassSeason)

      // 2. Rewards + Progress + Claims em paralelo
      const [rewardsRes, progressRes, claimsRes] = await Promise.all([
        supabase.from('battle_pass_rewards').select('*').eq('season_id', seasonData.id).eq('is_active', true).order('level'),
        supabase.from('battle_pass_progress').select('*').eq('employee_id', profile.id).eq('season_id', seasonData.id).maybeSingle(),
        supabase.from('battle_pass_claims').select('*').eq('employee_id', profile.id),
      ])

      setRewards((rewardsRes.data ?? []) as BattlePassReward[])
      setProgress(progressRes.data as BattlePassProgress | null)
      setClaims((claimsRes.data ?? []) as BattlePassClaim[])
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
    const currentCard = trackRef.current.querySelector(`[data-level="${progress.current_level}"]`)
    if (currentCard) {
      currentCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
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
    if (!trackRef.current) return
    trackRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' })
  }

  const currentLevel = progress?.current_level ?? 0
  const currentXp = progress?.current_xp ?? 0
  const xpPerLevel = season?.xp_per_level ?? 1000
  const maxLevel = season?.max_level ?? 50
  const progressPercent = Math.min(100, (currentXp / xpPerLevel) * 100)

  const daysLeft = season ? Math.max(0, Math.ceil(
    (new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )) : 0

  const unclaimedCount = rewards.filter(r =>
    r.level <= currentLevel && !claimedIds.has(r.id)
  ).length

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
          <LevelUpModal
            level={levelUpData.level}
            reward={levelUpData.reward}
            onClose={() => setLevelUpData(null)}
          />
        )}
      </AnimatePresence>

      {/* ── HEADER HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-purple-500/20 shadow-2xl"
      >
        {/* Fundo animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        {/* Grade de fundo */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />

        <div className="relative z-10 p-8 sm:p-10">
          {/* Título */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
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
              {season.description && (
                <p className="text-slate-400 mt-1 text-sm">{season.description}</p>
              )}
            </div>

            <div className="flex gap-3 flex-shrink-0">
              {/* Dias restantes */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10 min-w-[90px]">
                <Clock className="w-5 h-5 text-amber-400 mb-1" />
                <p className="text-2xl font-black text-amber-400">{daysLeft}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">dias</p>
              </div>

              {/* Nível atual */}
              <div className="flex flex-col items-center justify-center p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 min-w-[90px] shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Shield className="w-5 h-5 text-purple-400 mb-1" />
                <p className="text-2xl font-black text-white">{currentLevel}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">nível</p>
              </div>

              {/* Alertas de resgate disponível */}
              {unclaimedCount > 0 && (
                <div className="flex flex-col items-center justify-center p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 min-w-[90px] shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Gift className="w-5 h-5 text-amber-400 mb-1 animate-bounce" />
                  <p className="text-2xl font-black text-amber-400">{unclaimedCount}</p>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">resgatar</p>
                </div>
              )}
            </div>
          </div>

          {/* Barra de XP */}
          <div>
            <div className="flex justify-between items-center text-sm font-bold mb-3">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                {currentXp.toLocaleString()} BP XP
              </span>
              <span className="text-slate-500">
                {currentLevel >= maxLevel ? 'NÍVEL MÁXIMO!' : `${(xpPerLevel - currentXp).toLocaleString()} XP para Nv. ${currentLevel + 1}`}
              </span>
            </div>

            <div className="relative h-6 bg-slate-950 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-400 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </motion.div>
              {/* Marcadores de nível */}
              {[25, 50, 75].map(p => (
                <div
                  key={p}
                  className="absolute top-0 bottom-0 w-px bg-white/10"
                  style={{ left: `${p}%` }}
                />
              ))}
              {progressPercent > 5 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white drop-shadow">{Math.round(progressPercent)}%</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
              <span>Nível {currentLevel}</span>
              <span>Nível {Math.min(maxLevel, currentLevel + 1)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── TRILHA DE RECOMPENSAS ── */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            Trilha de Recompensas
            {unclaimedCount > 0 && (
              <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
                {unclaimedCount} disponível!
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scrollTrack('left')}
              className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => scrollTrack('right')}
              className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Container com linha de trilha */}
        <div className="relative bg-slate-950/60 border border-white/5 rounded-3xl p-6 overflow-hidden">
          {/* Linha da trilha */}
          <div className="absolute top-[calc(50%-1px)] left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

          {rewards.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma recompensa configurada ainda.</p>
            </div>
          ) : (
            <div
              ref={trackRef}
              className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {rewards.map((reward, i) => {
                const isUnlocked = currentLevel >= reward.level
                const isClaimed = claimedIds.has(reward.id)
                const isCurrent = reward.level === currentLevel + 1

                return (
                  <motion.div
                    key={reward.id}
                    data-level={reward.level}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <RewardCard
                      reward={reward}
                      isCurrent={isCurrent}
                      isUnlocked={isUnlocked}
                      isClaimed={isClaimed}
                      onClaim={handleClaim}
                      isLast={i === rewards.length - 1}
                    />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── INFO COMO GANHAR BP XP ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { icon: '🎯', label: 'Missões Diárias', desc: 'Complete missões diárias para ganhar BP XP', color: 'border-blue-500/20 bg-blue-900/10' },
          { icon: '📅', label: 'Missões Semanais', desc: 'Missões semanais rendem mais BP XP', color: 'border-purple-500/20 bg-purple-900/10' },
          { icon: '⭐', label: 'KPIs Ouro', desc: 'Bater metas de ouro concede BP XP bônus', color: 'border-amber-500/20 bg-amber-900/10' },
        ].map(item => (
          <div key={item.label} className={`p-4 rounded-2xl border ${item.color} flex items-center gap-3`}>
            <span className="text-2xl">{item.icon}</span>
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
