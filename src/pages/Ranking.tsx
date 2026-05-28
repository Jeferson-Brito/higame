import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard, Skeleton, RankBadge, EmptyState, PageHeader } from '@/components/ui/index'
import { getInitials } from '@/lib/utils'
import type { Season, KpiTier } from '@/types'
import { Trophy, Zap, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AvatarFrame } from '@/components/ui/AvatarFrame'
import { useAuth } from '@/contexts/AuthContext'

interface RankingEntry {
  id: string
  employee_id: string
  total_xp: number
  total_score: number
  rank_position: number | null
  kpi_summary: Record<string, KpiTier> | null
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
    position: string | null
    team: string | null
    active_title?: { name: string } | null
    active_frame?: { rarity: string } | null
  }
}

export default function Ranking() {
  const { profile: myProfile } = useAuth()
  const [season, setSeason] = useState<Season | null>(null)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    try {
      const { data: seasonData } = await supabase
        .from('seasons').select('*').eq('status', 'active').single()
      setSeason(seasonData)

      if (!seasonData) return

      const { data } = await supabase
        .from('rankings')
        .select('*, profile:profiles(id, full_name, avatar_url, position, team, active_title:store_items!fk_active_title(name), active_frame:store_items!fk_active_frame(rarity))')
        .eq('season_id', seasonData.id)
        .order('rank_position', { ascending: true })

      // Ajusta o array do supabase
      const mappedData = (data ?? []).map((r: any) => ({
        ...r,
        profile: {
          ...r.profile,
          active_title: Array.isArray(r.profile.active_title) ? r.profile.active_title[0] : r.profile.active_title,
          active_frame: Array.isArray(r.profile.active_frame) ? r.profile.active_frame[0] : r.profile.active_frame,
        }
      }))

      setRankings(mappedData as RankingEntry[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRanking()
  }, [fetchRanking])

  const top3 = rankings.slice(0, 3)

  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]  // pódio: 2º | 1º | 3º
    : top3

  if (loading) return <RankingSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Ranking"
        subtitle={season ? `Temporada: ${season.name}` : 'Nenhuma temporada ativa'}
      />

      {rankings.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState
            icon={<Trophy className="w-6 h-6" />}
            title="Ranking vazio"
            description="Os resultados ainda não foram inseridos para esta temporada."
          />
        </GlassCard>
      ) : (
        <>
          {/* === PÓDIO TOP 3 === */}
          {top3.length >= 1 && (
            <div className="glass-card p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-higame-purple/10 to-transparent pointer-events-none" />
              <h2 className="text-center font-outfit font-bold text-higame-text mb-8 text-lg relative z-10">
                🏆 Pódio da Temporada
              </h2>

              <div className="flex items-end justify-center gap-4 sm:gap-8 relative z-10">
                {podiumOrder.map((entry, i) => {
                  if (!entry) return null
                  const actualRank = entry.rank_position ?? i + 1
                  const isFirst = actualRank === 1
                  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
                  const emojis = { 1: '🥇', 2: '🥈', 3: '🥉' }
                  const glows = { 1: 'shadow-glow-gold', 2: 'shadow-glow-silver', 3: 'shadow-glow-bronze' }
                  const borders = { 1: 'border-higame-gold/50', 2: 'border-higame-silver/50', 3: 'border-higame-bronze/50' }
                  const isMe = entry.employee_id === myProfile?.id

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.5 }}
                      className="flex flex-col items-center gap-2"
                    >
                      {/* Avatar */}
                      <div className={`relative ${isFirst ? 'animate-float' : ''}`}>
                        <AvatarFrame 
                          avatarUrl={entry.profile.avatar_url}
                          fullName={entry.profile.full_name}
                          size={isFirst ? 'xl' : 'lg'}
                          frameRarity={(entry.profile.active_frame?.rarity as any) || undefined}
                          className="shadow-2xl"
                        />
                        <span className="absolute -top-2 -right-2 text-xl z-20 drop-shadow-lg">
                          {emojis[actualRank as 1|2|3]}
                        </span>
                        {isMe && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-outfit font-bold bg-higame-purple text-white px-1.5 rounded-full whitespace-nowrap">
                            Você
                          </div>
                        )}
                      </div>

                      {/* Nome */}
                      <div className="text-center mt-2">
                        <p className={`font-outfit font-bold text-higame-text ${isFirst ? 'text-sm' : 'text-xs'} max-w-[90px] truncate`}>
                          {entry.profile.full_name.split(' ')[0]}
                        </p>
                        {entry.profile.active_title && (
                          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mt-0.5 line-clamp-1">
                            {entry.profile.active_title.name}
                          </p>
                        )}
                        <p className="text-xs font-outfit font-bold text-higame-purple mt-1">
                          {entry.total_xp.toLocaleString()} XP
                        </p>
                      </div>

                      {/* Pedestal */}
                      <div className={`w-20 sm:w-24 ${heights[actualRank as 1|2|3]} rounded-t-xl flex items-center justify-center
                        ${actualRank === 1 ? 'bg-gradient-gold' : actualRank === 2 ? 'bg-gradient-silver' : 'bg-gradient-bronze'}`}>
                        <span className="text-2xl font-outfit font-black text-white">{actualRank}º</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* === TABELA COMPLETA === */}
          <GlassCard>
            <div className="p-4 border-b border-higame-border">
              <h2 className="font-outfit font-bold text-higame-text">Classificação Geral</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-inter font-medium text-higame-muted border-b border-higame-border">
                    <th className="px-4 py-3 w-12">#</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">XP</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">KPIs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-higame-border/50">
                  {rankings.map((entry, idx) => {
                    const isMe = entry.employee_id === myProfile?.id
                    const isTop3 = (entry.rank_position ?? 0) <= 3
                    const goldCount = Object.values(entry.kpi_summary ?? {}).filter(t => t === 'gold').length
                    const totalKpis = Object.values(entry.kpi_summary ?? {}).length

                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`transition-colors hover:bg-higame-surface2/50 ${isMe ? 'bg-higame-purple/5 border-l-2 border-l-higame-purple' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <RankBadge rank={entry.rank_position} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AvatarFrame 
                              avatarUrl={entry.profile.avatar_url}
                              fullName={entry.profile.full_name}
                              size="md"
                              frameRarity={(entry.profile.active_frame?.rarity as any) || undefined}
                            />
                            <div>
                              <p className="text-sm font-outfit font-semibold text-higame-text flex items-center gap-1">
                                {entry.profile.full_name}
                                {isMe && <span className="text-[9px] bg-higame-purple text-white px-1 rounded font-inter">Você</span>}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {entry.profile.active_title && (
                                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 px-1 rounded">
                                    {entry.profile.active_title.name}
                                  </span>
                                )}
                                <p className="text-xs font-inter text-higame-muted">{entry.profile.position ?? ''}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="font-outfit font-bold text-higame-purple text-sm">
                            <Zap className="w-3 h-3 inline mr-0.5" />
                            {entry.total_xp.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-outfit font-bold text-higame-gold">{entry.total_score}/100</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <span className="text-xs font-inter text-higame-muted">
                            <Star className="w-3 h-3 inline text-higame-gold mr-0.5" />
                            {goldCount}/{totalKpis} ouro
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}

function RankingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
