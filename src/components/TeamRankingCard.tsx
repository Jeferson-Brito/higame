import { motion } from 'framer-motion'

export interface TeamRankingEntry {
  team_id: string
  team_name: string
  team_color: string
  team_icon: string
  member_count: number
  total_xp: number
  total_score: number
  rank_position: number
  season_id: string | null
  season_name: string | null
}

interface TeamRankingCardProps {
  entries: TeamRankingEntry[]
}

function PodiumItem({ entry, height, delay }: { entry: TeamRankingEntry; height: number; delay: number }) {
  const isFirst = entry.rank_position === 1
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className="flex flex-col items-center gap-2"
    >
      {/* Medalha / coroa */}
      <div className="text-2xl">
        {entry.rank_position === 1 ? '👑' : entry.rank_position === 2 ? '🥈' : '🥉'}
      </div>

      {/* Ícone da equipe */}
      <motion.div
        animate={isFirst ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
        style={{
          backgroundColor: `${entry.team_color}25`,
          border: `3px solid ${entry.team_color}80`,
          boxShadow: isFirst ? `0 0 20px ${entry.team_color}50` : undefined
        }}
      >
        {entry.team_icon}
      </motion.div>

      {/* Nome */}
      <p className="text-xs font-bold text-white text-center leading-tight max-w-[80px]">{entry.team_name}</p>
      <p className="text-[10px] text-slate-400">{entry.member_count} membros</p>

      {/* Coluna do pódio */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height }}
        transition={{ delay: delay + 0.3, duration: 0.7, ease: 'easeOut' }}
        className="w-20 rounded-t-2xl flex flex-col items-center justify-start pt-2 relative overflow-hidden"
        style={{ backgroundColor: `${entry.team_color}30`, border: `2px solid ${entry.team_color}50` }}
      >
        {/* Brilho no topo */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: entry.team_color }} />
        <p className="font-outfit font-black text-white text-lg" style={{ color: entry.team_color }}>
          #{entry.rank_position}
        </p>
        <p className="text-[10px] font-bold text-slate-300">{entry.total_xp.toLocaleString()} XP</p>
      </motion.div>
    </motion.div>
  )
}

export function TeamRankingCard({ entries }: TeamRankingCardProps) {
  if (entries.length === 0) {
    return (
      <div className="glass-card p-10 text-center text-slate-400 border-dashed border-white/10">
        <p className="text-4xl mb-3">🏆</p>
        <p>Nenhuma equipe com XP ainda.</p>
        <p className="text-xs mt-1 text-slate-500">Crie equipes e atribua colaboradores para o ranking aparecer.</p>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const maxXp = entries[0]?.total_xp || 1

  // Alturas do pódio: 1º=120, 2º=90, 3º=70
  const podiumHeights = [90, 120, 70]
  // Ordem visual: 2º, 1º, 3º
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as TeamRankingEntry[]
  const podiumHeightMap: Record<number, number> = { 1: 120, 2: 90, 3: 70 }

  return (
    <div className="space-y-6">
      {/* PÓDIO */}
      {top3.length >= 1 && (
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {podiumOrder.map((entry, i) => (
              <PodiumItem
                key={entry.team_id}
                entry={entry}
                height={podiumHeightMap[entry.rank_position] ?? 60}
                delay={i * 0.15}
              />
            ))}
          </div>
        </div>
      )}

      {/* RESTANTE */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {rest.map((entry, i) => (
            <motion.div
              key={entry.team_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <span className="text-slate-500 font-bold w-6 text-center text-sm">#{entry.rank_position}</span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${entry.team_color}25`, border: `2px solid ${entry.team_color}50` }}
              >
                {entry.team_icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{entry.team_name}</p>
                <div className="mt-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(entry.total_xp / maxXp) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: entry.team_color }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-outfit font-black text-white text-sm">{entry.total_xp.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">XP • {entry.member_count} membros</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
