import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GlassCard, PageHeader, EmptyState, Skeleton, TierBadge } from '@/components/ui/index'
import { MONTH_NAMES } from '@/types'
import { History, Star, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import type { KpiTier } from '@/types'

interface SnapshotEntry {
  id: string
  final_xp: number
  final_level: number
  final_score: number
  final_rank: number | null
  final_tier_summary: Record<string, KpiTier> | null
  created_at: string
  season: {
    id: string
    name: string
    month: number
    year: number
  }
}

export default function Seasons() {
  const { profile } = useAuth()
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([])
  const [loading, setLoading] = useState(true)
  const profileId = profile?.id

  const fetchHistory = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase
        .from('season_snapshots')
        .select('*, season:seasons(id, name, month, year)')
        .eq('employee_id', profileId)
        .order('created_at', { ascending: false })
      setSnapshots((data ?? []) as SnapshotEntry[])
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Histórico de Temporadas" subtitle="Seu desempenho em temporadas anteriores" />

      {snapshots.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title="Nenhuma temporada encerrada"
            description="Seu histórico aparecerá aqui quando uma temporada for concluída."
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {snapshots.map((snap, i) => {
            const tiers = Object.values(snap.final_tier_summary ?? {})
            const goldCount = tiers.filter(t => t === 'gold').length
            const podiumEmoji = snap.final_rank === 1 ? '🥇' : snap.final_rank === 2 ? '🥈' : snap.final_rank === 3 ? '🥉' : null

            return (
              <motion.div
                key={snap.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <GlassCard hover className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-inter text-higame-muted uppercase tracking-wider">
                        {MONTH_NAMES[snap.season.month]} {snap.season.year}
                      </p>
                      <h3 className="font-outfit font-bold text-higame-text text-base mt-0.5">
                        {snap.season.name}
                      </h3>
                    </div>
                    {podiumEmoji && <span className="text-2xl">{podiumEmoji}</span>}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-xs font-inter text-higame-muted mb-0.5">XP</p>
                      <p className="text-lg font-outfit font-black text-higame-purple">{snap.final_xp.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-x border-higame-border">
                      <p className="text-xs font-inter text-higame-muted mb-0.5">Score</p>
                      <p className="text-lg font-outfit font-black text-higame-gold">{snap.final_score}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-inter text-higame-muted mb-0.5">Rank</p>
                      <p className="text-lg font-outfit font-black text-higame-text">{snap.final_rank ? `${snap.final_rank}º` : '—'}</p>
                    </div>
                  </div>

                  {/* KPI Tiers */}
                  {snap.final_tier_summary && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(snap.final_tier_summary).map(([kpiId, tier]) => (
                        <TierBadge key={kpiId} tier={tier} size="sm" />
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-3 pt-3 border-t border-higame-border flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-inter text-higame-muted">
                      <Star className="w-3 h-3 text-higame-gold" />
                      {goldCount} KPI{goldCount !== 1 ? 's' : ''} ouro
                    </div>
                    <div className="flex items-center gap-1 text-xs font-inter text-higame-muted">
                      <TrendingUp className="w-3 h-3 text-higame-neon" />
                      Nível {snap.final_level}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
