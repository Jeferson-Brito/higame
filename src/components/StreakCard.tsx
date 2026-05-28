import { motion } from 'framer-motion'

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]

function getStreakLevel(streak: number) {
  if (streak >= 100) return { label: 'Lenda', color: 'text-red-400', bg: 'from-red-900/30 to-rose-900/30 border-red-500/40', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]' }
  if (streak >= 60) return { label: 'Mestre', color: 'text-amber-300', bg: 'from-amber-900/30 to-yellow-900/30 border-amber-500/40', glow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]' }
  if (streak >= 30) return { label: 'Veterano', color: 'text-orange-400', bg: 'from-orange-900/30 to-amber-900/30 border-orange-500/40', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]' }
  if (streak >= 14) return { label: 'Dedicado', color: 'text-orange-300', bg: 'from-orange-900/20 to-slate-900 border-orange-500/30', glow: '' }
  if (streak >= 7) return { label: 'Em Chamas', color: 'text-orange-400', bg: 'from-orange-950/30 to-slate-900 border-orange-500/20', glow: '' }
  if (streak >= 3) return { label: 'Aquecendo', color: 'text-amber-400', bg: 'from-amber-950/20 to-slate-900 border-amber-500/20', glow: '' }
  return { label: 'Iniciando', color: 'text-slate-400', bg: 'from-slate-900 to-slate-900 border-white/10', glow: '' }
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const streakInfo = getStreakLevel(currentStreak)
  const nextMilestone = STREAK_MILESTONES.find(m => m > currentStreak) ?? 100
  const prevMilestone = STREAK_MILESTONES.filter(m => m <= currentStreak).at(-1) ?? 0
  const progressToNext = Math.min(100, ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  // Gera os foguinhos (máx 14 para não poluir a UI)
  const flameCount = Math.min(currentStreak, 14)

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border bg-gradient-to-br ${streakInfo.bg} ${streakInfo.glow} transition-all duration-500`}>
      {/* Brilho de fundo */}
      {currentStreak >= 7 && (
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🔥</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sequência Diária</p>
              <p className={`text-xs font-bold ${streakInfo.color}`}>{streakInfo.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-outfit font-black ${streakInfo.color}`}>{currentStreak}</p>
            <p className="text-[10px] text-slate-500">dias</p>
          </div>
        </div>

        {/* Foguinhos */}
        {flameCount > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {Array.from({ length: flameCount }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300 }}
                className="text-lg leading-none"
                style={{ filter: `hue-rotate(${Math.max(0, i * 5)}deg)` }}
              >
                🔥
              </motion.span>
            ))}
            {currentStreak > 14 && (
              <span className="text-sm font-bold text-slate-400 self-center ml-1">
                +{currentStreak - 14} mais!
              </span>
            )}
          </div>
        )}

        {/* Progresso até o próximo marco */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
            <span>Próximo marco: {nextMilestone} dias</span>
            <span>{nextMilestone - currentStreak} faltam</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
            />
          </div>
        </div>

        {/* Recorde */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Recorde pessoal</p>
          <p className="text-sm font-bold text-slate-300">
            🏆 {longestStreak} dias
          </p>
        </div>
      </div>
    </div>
  )
}
