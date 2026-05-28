import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, Skeleton, TierBadge } from '@/components/ui/index'
import { Calendar, ArrowLeft, Target, Trophy, Users, Star } from 'lucide-react'
import { SEASON_STATUS_LABEL } from '@/types'

export default function SeasonDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  
  const [season, setSeason] = useState<any>(null)
  const [kpis, setKpis] = useState<any[]>([])
  const [rankings, setRankings] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])

  const fetchDetails = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      // 1. Buscar a temporada
      const { data: seasonData } = await supabase.from('seasons').select('*').eq('id', id).single()
      setSeason(seasonData)

      // 2. Buscar KPIs e suas regras (para mostrar as metas da temporada)
      const { data: kpisData } = await supabase.from('kpi_definitions')
        .select('*, kpi_rules(*)')
        .eq('season_id', id)
        .order('display_order')
      setKpis(kpisData ?? [])

      // 3. Buscar Ranking com Perfil
      const { data: ranksData } = await supabase.from('rankings')
        .select('*, profile:profiles(full_name, avatar_url, team)')
        .eq('season_id', id)
        .order('rank_position')
      setRankings(ranksData ?? [])

      // 4. Buscar Resultados
      const { data: resData } = await supabase.from('employee_results')
        .select('*, profile:profiles(full_name), kpi:kpi_definitions(name)')
        .eq('season_id', id)
      setResults(resData ?? [])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchDetails()
  }, [fetchDetails])

  if (loading) return <Skeleton className="h-[600px] w-full" />
  if (!season) return <div className="text-center py-20 text-slate-400">Temporada não encontrada</div>

  const statusColors: Record<string, string> = {
    draft: 'text-higame-warning bg-higame-warning/10 border-higame-warning/20',
    active: 'text-higame-success bg-higame-success/10 border-higame-success/20',
    closed: 'text-slate-400 bg-slate-800 border-slate-700',
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-higame-muted hover:text-white transition-colors text-sm font-bold">
        <ArrowLeft className="w-4 h-4" /> Voltar para Temporadas
      </button>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-outfit font-black text-white">{season.name}</h1>
          <p className="text-higame-muted text-sm mt-1">{season.description || 'Sem descrição'}</p>
          <p className="text-xs font-inter text-slate-400 mt-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Período: <span className="text-white">{new Date(season.start_date).toLocaleDateString('pt-BR')}</span> até <span className="text-white">{new Date(season.end_date).toLocaleDateString('pt-BR')}</span></span>
          </p>
        </div>
        <div className={`px-4 py-2 rounded-xl border font-bold text-sm ${statusColors[season.status]}`}>
          Status: {SEASON_STATUS_LABEL[season.status as keyof typeof SEASON_STATUS_LABEL]}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Metas/KPIs */}
        <GlassCard className="p-6 md:col-span-2">
          <h2 className="text-xl font-outfit font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-higame-neon" /> Metas (KPIs)
          </h2>
          {kpis.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum KPI cadastrado para esta temporada.</p>
          ) : (
            <div className="space-y-4">
              {kpis.map(kpi => (
                <div key={kpi.id} className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                  <h3 className="font-bold text-white text-sm">{kpi.name} <span className="text-slate-500 font-normal">({kpi.type})</span></h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kpi.kpi_rules?.map((rule: any) => (
                      <div key={rule.id} className="flex items-center gap-2 text-xs bg-slate-950 px-2 py-1 rounded-md border border-white/5">
                        <TierBadge tier={rule.tier} size="sm" />
                        <span className="text-slate-400">
                          {kpi.type === 'time' 
                            ? `Até ${Math.floor(rule.max_seconds / 60)}m ${rule.max_seconds % 60}s`
                            : kpi.type === 'percent'
                              ? `${rule.min_value}% - ${rule.max_value}%`
                              : `${rule.min_value} - ${rule.max_value}`}
                        </span>
                        <span className="text-higame-gold font-bold ml-1">+{rule.xp_reward} XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Card: Participantes / Ranking */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-outfit font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-higame-gold" /> Ranking
          </h2>
          <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {rankings.length} participantes
          </p>

          {rankings.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum ranking gerado ainda.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {rankings.map((rank, idx) => (
                <div key={rank.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-white/5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white shadow-glow-gold' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {rank.rank_position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{rank.profile?.full_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{rank.profile?.team}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-higame-purple">{rank.total_xp} XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Resultados Recentes */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-outfit font-bold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" /> Resultados Lançados ({results.length})
        </h2>
        
        {results.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum resultado registrado nesta temporada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-inter text-slate-400">
                  <th className="pb-3 font-medium">Colaborador</th>
                  <th className="pb-3 font-medium">KPI</th>
                  <th className="pb-3 font-medium">Resultado</th>
                  <th className="pb-3 font-medium">Tier</th>
                  <th className="pb-3 font-medium text-right">XP Ganho</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {results.slice(0, 10).map((res) => (
                  <tr key={res.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 text-white font-medium">{res.profile?.full_name}</td>
                    <td className="py-3 text-slate-300">{res.kpi?.name}</td>
                    <td className="py-3 text-higame-neon font-bold">{res.display_value}</td>
                    <td className="py-3"><TierBadge tier={res.tier} size="sm" /></td>
                    <td className="py-3 text-right text-higame-gold font-bold">+{res.xp_earned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 10 && (
              <p className="text-center text-xs text-slate-500 mt-4">
                Mostrando os 10 resultados mais recentes.
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
