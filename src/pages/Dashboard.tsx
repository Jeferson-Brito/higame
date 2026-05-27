import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { KPICard } from '@/components/KPICard'
import { XPProgressBar } from '@/components/XPProgressBar'
import { GlassCard, Skeleton, RankBadge, EmptyState } from '@/components/ui/index'
import { getAppSettings } from '@/lib/ranking'
import { calculateLevel, formatMonthYear } from '@/lib/utils'
import type { Season, EmployeeResult, KpiDefinition, Ranking, AppSettings } from '@/types'
import { Trophy, Star, TrendingUp, Zap, Award, Calendar } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts'

// ============================================================
// Hook: buscar dados do dashboard
// ============================================================

function useDashboardData() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [results, setResults] = useState<(EmployeeResult & { kpi: KpiDefinition })[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [xpHistory, setXpHistory] = useState<{ month: string; xp: number }[]>([])

  useEffect(() => {
    if (!profile?.id) return
    fetchAll()
  }, [profile?.id])

  async function fetchAll() {
    setLoading(true)
    try {
      const [settingsData, seasonData] = await Promise.all([
        getAppSettings(),
        supabase.from('seasons').select('*').eq('status', 'active').single(),
      ])
      setSettings(settingsData)

      const season = seasonData.data as Season | null
      setActiveSeason(season)

      if (!season || !profile?.id) return

      const [resultsData, rankingData, historyData] = await Promise.all([
        supabase
          .from('employee_results')
          .select('*, kpi:kpi_definitions(*)')
          .eq('employee_id', profile.id)
          .eq('season_id', season.id),
        supabase
          .from('rankings')
          .select('*')
          .eq('employee_id', profile.id)
          .eq('season_id', season.id)
          .single(),
        supabase
          .from('season_snapshots')
          .select('final_xp, season:seasons(name, month, year)')
          .eq('employee_id', profile.id)
          .order('created_at', { ascending: true })
          .limit(6),
      ])

      setResults((resultsData.data ?? []) as (EmployeeResult & { kpi: KpiDefinition })[])
      setRanking(rankingData.data as Ranking | null)

      // Formatar histórico para gráfico
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history = (historyData.data ?? []).map((s: any) => ({
        month: formatMonthYear(s.season?.month ?? 0, s.season?.year ?? 0).slice(0, 3),
        xp: s.final_xp as number,
      }))
      setXpHistory(history)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  return { loading, activeSeason, ranking, results, settings, xpHistory, profile }
}

// ============================================================
// Dashboard Principal
// ============================================================

export default function Dashboard() {
  const { loading, activeSeason, ranking, results, settings, xpHistory, profile } = useDashboardData()

  const totalXp = ranking?.total_xp ?? 0
  const level = calculateLevel(totalXp, settings?.xp_per_level ?? 1000)
  const score = ranking?.total_score ?? 0

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-6 animate-fade-in">

      {/* === Hero: Perfil + XP === */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden glass-card p-6"
      >
        {/* Gradiente decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-higame-purple/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-higame-purple/40" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-higame flex items-center justify-center text-2xl font-outfit font-black text-white shadow-glow-purple">
                {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'HG'}
              </div>
            )}
            {/* Badge de nível */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-higame flex items-center justify-center text-xs font-outfit font-black text-white border-2 border-higame-bg">
              {level}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-outfit font-bold text-higame-text">
                {profile?.full_name ?? 'Colaborador'}
              </h1>
              {ranking?.rank_position && ranking.rank_position <= 3 && (
                <span className="text-lg">{['🥇', '🥈', '🥉'][ranking.rank_position - 1]}</span>
              )}
            </div>
            <p className="text-sm font-inter text-higame-muted mb-3">
              {profile?.position ?? 'Colaborador'} {profile?.team ? `· ${profile.team}` : ''}
            </p>
            <XPProgressBar totalXp={totalXp} xpPerLevel={settings?.xp_per_level ?? 1000} />
          </div>

          {/* Stats rápidos */}
          <div className="flex sm:flex-col gap-3 sm:gap-2 flex-shrink-0">
            <div className="text-center">
              <p className="text-xs font-inter text-higame-muted">Score</p>
              <p className="text-2xl font-outfit font-black text-gradient">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-inter text-higame-muted">Ranking</p>
              <RankBadge rank={ranking?.rank_position ?? null} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* === Stats Cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'XP Total', value: totalXp.toLocaleString(), color: 'text-higame-purple', bg: 'bg-higame-purple/10' },
          { icon: Star, label: 'Nível', value: `Nível ${level}`, color: 'text-higame-neon', bg: 'bg-higame-neon/10' },
          { icon: Trophy, label: 'Score Geral', value: `${score}/100`, color: 'text-higame-gold', bg: 'bg-higame-gold/10' },
          { icon: Award, label: 'KPIs Ouro', value: `${results.filter(r => r.tier === 'gold').length}/${results.length}`, color: 'text-higame-success', bg: 'bg-higame-success/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard className="p-4">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <p className="text-xs font-inter text-higame-muted mb-0.5">{stat.label}</p>
              <p className={`text-xl font-outfit font-bold ${stat.color}`}>{stat.value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* === Temporada Ativa === */}
      {activeSeason ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-higame-purple" />
            <h2 className="text-lg font-outfit font-bold text-higame-text">
              {activeSeason.name}
            </h2>
            <span className="text-xs font-inter bg-higame-success/10 text-higame-success border border-higame-success/20 px-2 py-0.5 rounded-lg">
              ● Ativa
            </span>
          </div>

          {/* KPI Cards */}
          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {results
                .sort((a, b) => (a.kpi?.display_order ?? 0) - (b.kpi?.display_order ?? 0))
                .map((result, i) => (
                  <KPICard
                    key={result.id}
                    name={result.kpi?.name ?? ''}
                    displayValue={result.display_value}
                    tier={result.tier}
                    type={result.kpi?.type ?? 'number'}
                    unit={result.kpi?.unit}
                    index={i}
                  />
                ))
              }
            </div>
          ) : (
            <GlassCard className="p-8">
              <EmptyState
                icon={<TrendingUp className="w-6 h-6" />}
                title="Aguardando resultados"
                description="Os resultados desta temporada ainda não foram inseridos pelo administrador."
              />
            </GlassCard>
          )}
        </div>
      ) : (
        <GlassCard className="p-8">
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="Nenhuma temporada ativa"
            description="Aguarde o administrador ativar uma nova temporada."
          />
        </GlassCard>
      )}

      {/* === Gráfico de Evolução === */}
      {xpHistory.length > 1 && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-higame-neon" />
            <h2 className="text-base font-outfit font-bold text-higame-text">Evolução de XP</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={xpHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,42,69,0.6)" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#12121F',
                  border: '1px solid #2A2A45',
                  borderRadius: '12px',
                  color: '#E2E8F0',
                  fontFamily: 'Inter',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="xp"
                stroke="url(#gradient)"
                strokeWidth={2.5}
                dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#A855F7' }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  )
}

// ============================================================
// Skeleton de loading
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full mt-4" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
      </div>
    </div>
  )
}
