import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, RankBadge, EmptyState, Skeleton } from '@/components/ui/index'
import type { Season } from '@/types'
import { BarChart3, Zap } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface AdminRankingEntry {
  id: string
  rank_position: number | null
  total_xp: number
  total_score: number
  profile: { full_name: string; position: string | null; avatar_url: string | null }
}

export default function AdminRanking() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [rankings, setRankings] = useState<AdminRankingEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('seasons').select('*').is('deleted_at', null).order('year', { ascending: false }).then(({ data }) => {
      const s = (data ?? []) as Season[]
      setSeasons(s)
      const active = s.find(x => x.status === 'active') ?? s[0]
      if (active) setSelectedSeason(active.id)
    })
  }, [])

  const fetchRankings = useCallback(async () => {
    if (!selectedSeason) {
      setRankings([])
      return
    }

    setLoading(true)
    const { data } = await supabase.from('rankings').select('*, profile:profiles(full_name, position, avatar_url)')
      .eq('season_id', selectedSeason).order('rank_position', { ascending: true })
    setRankings((data ?? []) as AdminRankingEntry[])
    setLoading(false)
  }, [selectedSeason])

  useEffect(() => {
    void fetchRankings()
  }, [fetchRankings])

  const selectedSeasonObj = seasons.find(s => s.id === selectedSeason)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Ranking Admin" subtitle={selectedSeasonObj ? `Classificação de ${selectedSeasonObj.name}` : 'Classificação de todas as temporadas'} />
      <div className="flex gap-3 items-center">
        <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="input-field max-w-xs">
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
        </select>
        <span className="text-sm font-inter text-higame-muted">{rankings.length} participantes</span>
      </div>

      {loading ? <Skeleton className="h-64 w-full" /> : rankings.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState icon={<BarChart3 className="w-6 h-6" />} title="Ranking vazio" description="Insira resultados para ver o ranking." />
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-inter font-medium text-higame-muted border-b border-higame-border">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3 text-right">XP</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-higame-border/50">
                {rankings.map((entry) => (
                  <tr key={entry.id} className="hover:bg-higame-surface2/50 transition-colors">
                    <td className="px-4 py-3"><RankBadge rank={entry.rank_position} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-higame flex items-center justify-center text-xs font-outfit font-bold text-white">
                          {getInitials(entry.profile.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-outfit font-semibold text-higame-text">{entry.profile.full_name}</p>
                          <p className="text-xs font-inter text-higame-muted">{entry.profile.position ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-outfit font-bold text-higame-purple text-sm flex items-center justify-end gap-1">
                        <Zap className="w-3 h-3" />{entry.total_xp.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-outfit font-bold text-higame-gold">{entry.total_score}/100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
