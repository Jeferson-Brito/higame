import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, RankBadge, Skeleton } from '@/components/ui/index'
import type { Season } from '@/types'
import { BarChart3, Users, Zap, Trophy } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ employees: 0, activeSeason: null as Season | null, rankingCount: 0, topEmployee: null as { full_name: string; total_xp: number } | null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const [empData, seasonData] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true).eq('role', 'employee').is('deleted_at', null),
          supabase.from('seasons').select('*').eq('status', 'active').single(),
        ])
        const activeSeason = seasonData.data as Season | null
        let rankingCount = 0
        let topEmployee = null
        
        if (activeSeason) {
          const { count } = await supabase.from('rankings').select('id', { count: 'exact' }).eq('season_id', activeSeason.id)
          rankingCount = count ?? 0
          const { data: topData } = await supabase.from('rankings').select('total_xp, profile:profiles(full_name)').eq('season_id', activeSeason.id).order('total_xp', { ascending: false }).limit(1).single()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (topData) topEmployee = { full_name: (topData as any).profile?.full_name ?? '—', total_xp: (topData as any).total_xp }
        }
        
        setStats({ employees: empData.count ?? 0, activeSeason, rankingCount, topEmployee })
      } catch (err) {
        console.error('Erro ao carregar dados do admin:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { icon: Users, label: 'Colaboradores Ativos', value: stats.employees, color: 'text-higame-neon', bg: 'bg-higame-neon/10' },
    { icon: BarChart3, label: 'Temporada Ativa', value: stats.activeSeason?.name ?? 'Nenhuma', color: 'text-higame-purple', bg: 'bg-higame-purple/10' },
    { icon: Zap, label: 'No Ranking', value: stats.rankingCount, color: 'text-higame-gold', bg: 'bg-higame-gold/10' },
    { icon: Trophy, label: 'Líder', value: stats.topEmployee?.full_name ?? '—', color: 'text-higame-success', bg: 'bg-higame-success/10' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Painel Admin" subtitle="Visão geral da plataforma HIGAME" />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <GlassCard key={card.label} className="p-5">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-xs font-inter text-higame-muted mb-1">{card.label}</p>
              <p className={`text-xl font-outfit font-bold ${card.color} truncate`}>{card.value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassCard className="p-6">
        <h2 className="font-outfit font-bold text-higame-text mb-4">Guia Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-inter text-higame-muted">
          {[
            { step: '1', text: 'Crie uma temporada em Temporadas' },
            { step: '2', text: 'Configure os KPIs e faixas em KPIs' },
            { step: '3', text: 'Cadastre os colaboradores em Colaboradores' },
            { step: '4', text: 'Insira os resultados mensais em Resultados' },
            { step: '5', text: 'Acompanhe o ranking em Ranking' },
            { step: '6', text: 'Encerre a temporada para gerar snapshot' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gradient-higame flex items-center justify-center text-xs font-outfit font-bold text-white flex-shrink-0">{item.step}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
