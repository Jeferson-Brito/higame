import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard, Skeleton, RankBadge, EmptyState, PageHeader } from '@/components/ui/index'
import type { Season, KpiTier } from '@/types'
import { Trophy, Zap, Star, Users2, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AvatarFrame } from '@/components/ui/AvatarFrame'
import { TeamRankingCard, type TeamRankingEntry } from '@/components/TeamRankingCard'

type RankingTab = 'individual' | 'teams'
type PeriodFilter = 'current' | 'all_time'

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
    team_id: string | null
    active_title?: { name: string } | null
    active_frame?: { rarity: string } | null
  }
}

interface AllTimeEntry {
  employee_id: string
  total_xp: number
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
    position: string | null
    active_title?: { name: string } | null
    active_frame?: { rarity: string } | null
  }
}

export default function Ranking() {
  const { profile: myProfile } = useAuth()
  const [season, setSeason] = useState<Season | null>(null)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [allTimeRankings, setAllTimeRankings] = useState<AllTimeEntry[]>([])
  const [teamRankings, setTeamRankings] = useState<TeamRankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<RankingTab>('individual')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current')

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    try {
      const { data: seasonData } = await supabase
        .from('seasons').select('*').eq('status', 'active').single()
      setSeason(seasonData)

      if (seasonData) {
        // Obter também a temporada atual do Passe de Batalha para pegar os Troféus
        const { data: bpSeason } = await supabase.from('battle_pass_seasons').select('id').eq('is_active', true).is('deleted_at', null).maybeSingle()
        
        let bpMap: Record<string, number> = {}
        if (bpSeason) {
          const { data: bpProg } = await supabase.from('battle_pass_progress').select('employee_id, total_bp_xp').eq('season_id', bpSeason.id)
          if (bpProg) {
            for (const p of bpProg) bpMap[p.employee_id] = p.total_bp_xp
          }
        }

        // Ranking individual da temporada atual
        const { data } = await supabase
          .from('rankings')
          .select('*, profile:profiles(id, full_name, avatar_url, position, team, team_id, active_title:store_items!fk_active_title(name), active_frame:store_items!fk_active_frame(rarity))')
          .eq('season_id', seasonData.id)

        const mappedData = (data ?? [])
          .map((r: any) => ({
            ...r,
            total_xp: bpMap[r.employee_id] || 0, // Substitui o XP comum pelos Troféus
            profile: {
              ...r.profile,
              active_title: Array.isArray(r.profile.active_title) ? r.profile.active_title[0] : r.profile.active_title,
              active_frame: Array.isArray(r.profile.active_frame) ? r.profile.active_frame[0] : r.profile.active_frame,
            }
          }))
          .sort((a, b) => b.total_xp - a.total_xp) // Ordena por Troféus
          .map((r, i) => ({ ...r, rank_position: i + 1 })) // Recalcula a posição
          
        setRankings(mappedData as RankingEntry[])
      }

      // Ranking por equipe (via view)
      const { data: teamData } = await supabase
        .from('team_rankings')
        .select('*')
        .order('rank_position', { ascending: true })
      setTeamRankings((teamData ?? []) as TeamRankingEntry[])

      // Histórico vitalício: soma de season_snapshots
      const { data: snapData } = await supabase
        .from('season_snapshots')
        .select('employee_id, final_xp, profile:profiles(id, full_name, avatar_url, position, active_title:store_items!fk_active_title(name), active_frame:store_items!fk_active_frame(rarity))')

      if (snapData) {
        const xpMap: Record<string, { total: number; profile: any }> = {}
        for (const snap of snapData as any[]) {
          const prof = Array.isArray(snap.profile) ? snap.profile[0] : snap.profile
          if (!xpMap[snap.employee_id]) {
            xpMap[snap.employee_id] = { total: 0, profile: prof }
          }
          xpMap[snap.employee_id].total += snap.final_xp ?? 0
        }
        const sorted = Object.entries(xpMap)
          .map(([eid, v]) => ({
            employee_id: eid,
            total_xp: v.total,
            profile: {
              ...v.profile,
              active_title: Array.isArray(v.profile?.active_title) ? v.profile.active_title[0] : v.profile?.active_title,
              active_frame: Array.isArray(v.profile?.active_frame) ? v.profile.active_frame[0] : v.profile?.active_frame,
            }
          }))
          .sort((a, b) => b.total_xp - a.total_xp)
        setAllTimeRankings(sorted as AllTimeEntry[])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchRanking() }, [fetchRanking])

  const displayRankings = periodFilter === 'current' ? rankings : allTimeRankings.map((e, i) => ({
    ...e,
    id: e.employee_id,
    total_score: 0,
    rank_position: i + 1,
    kpi_summary: null,
  })) as RankingEntry[]

  const top3 = displayRankings.slice(0, 3)
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3

  if (loading) return <RankingSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Ranking"
        subtitle={season ? `Temporada: ${season.name}` : 'Nenhuma temporada ativa'}
      />

      {/* === ABAS === */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition-all text-sm ${activeTab === 'individual' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5 glass-card'}`}
        >
          <User className="w-4 h-4" /> Individual
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition-all text-sm ${activeTab === 'teams' ? 'bg-higame-neon/20 text-higame-neon border border-higame-neon/30' : 'text-slate-400 hover:bg-white/5 glass-card'}`}
        >
          <Users2 className="w-4 h-4" /> Por Equipe
        </button>

        {/* Filtro de período (só na aba individual) */}
        {activeTab === 'individual' && (
          <div className="ml-auto flex items-center gap-1 bg-slate-900/50 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setPeriodFilter('current')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodFilter === 'current' ? 'bg-higame-purple text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Temporada Atual
            </button>
            <button
              onClick={() => setPeriodFilter('all_time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodFilter === 'all_time' ? 'bg-higame-purple text-white' : 'text-slate-400 hover:text-white'}`}
            >
              🌍 Histórico Vitalício
            </button>
          </div>
        )}
      </div>

      {/* === ABA DE EQUIPES === */}
      {activeTab === 'teams' && (
        <TeamRankingCard entries={teamRankings} />
      )}

      {/* === ABA INDIVIDUAL === */}
      {activeTab === 'individual' && (
        displayRankings.length === 0 ? (
          <GlassCard className="p-12">
            <EmptyState
              icon={<Trophy className="w-6 h-6" />}
              title="Ranking vazio"
              description={periodFilter === 'current' ? 'Os resultados ainda não foram inseridos para esta temporada.' : 'Nenhuma temporada finalizada ainda.'}
            />
          </GlassCard>
        ) : (
          <>
            {/* PÓDIO TOP 3 */}
            {top3.length >= 1 && (
              <div className="glass-card p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-higame-purple/10 to-transparent pointer-events-none" />
                <h2 className="text-center font-outfit font-bold text-higame-text mb-8 text-lg relative z-10">
                  {periodFilter === 'current' ? '🏆 Pódio da Temporada' : '🌍 Pódio Histórico'}
                </h2>

                <div className="flex items-end justify-center gap-4 sm:gap-8 relative z-10">
                  {podiumOrder.map((entry, i) => {
                    if (!entry) return null
                    const actualRank = entry.rank_position ?? i + 1
                    const isFirst = actualRank === 1
                    const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
                    const emojis = { 1: '🥇', 2: '🥈', 3: '🥉' }
                    const isMe = entry.employee_id === myProfile?.id

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15, duration: 0.5 }}
                        className="flex flex-col items-center gap-2"
                      >
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

                        <div className="text-center mt-2">
                          <p className={`font-outfit font-bold text-higame-text ${isFirst ? 'text-sm' : 'text-xs'} max-w-[90px] truncate`}>
                            {entry.profile.full_name.split(' ')[0]}
                          </p>
                          {entry.profile.active_title && (
                            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mt-0.5 line-clamp-1">
                              {entry.profile.active_title.name}
                            </p>
                          )}
                          <p className="text-xs font-outfit font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {entry.total_xp.toLocaleString()}
                          </p>
                        </div>

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

            {/* TABELA COMPLETA */}
            <GlassCard>
              <div className="p-4 border-b border-higame-border flex items-center justify-between">
                <h2 className="font-outfit font-bold text-higame-text">Classificação Geral</h2>
                {periodFilter === 'all_time' && (
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">Soma de todas as temporadas</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-inter font-medium text-higame-muted border-b border-higame-border">
                      <th className="px-4 py-3 w-12">#</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">Troféus</th>
                      {periodFilter === 'current' && <th className="px-4 py-3 text-right">Score</th>}
                      {periodFilter === 'current' && <th className="px-4 py-3 text-right hidden md:table-cell">KPIs</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-higame-border/50">
                    {displayRankings.map((entry, idx) => {
                      const isMe = entry.employee_id === myProfile?.id
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
                            <span className="font-outfit font-bold text-amber-500 text-sm">
                              <Trophy className="w-3 h-3 inline mr-1" />
                              {entry.total_xp.toLocaleString()}
                            </span>
                          </td>
                          {periodFilter === 'current' && (
                            <td className="px-4 py-3 text-right">
                              <span className="font-outfit font-bold text-higame-gold">{entry.total_score}/100</span>
                            </td>
                          )}
                          {periodFilter === 'current' && (
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <span className="text-xs font-inter text-higame-muted">
                                <Star className="w-3 h-3 inline text-higame-gold mr-0.5" />
                                {goldCount}/{totalKpis} ouro
                              </span>
                            </td>
                          )}
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )
      )}
    </div>
  )
}

function RankingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
