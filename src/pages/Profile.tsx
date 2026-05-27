import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GlassCard, PageHeader, TierBadge, Skeleton } from '@/components/ui/index'
import { XPProgressBar } from '@/components/XPProgressBar'
import { getInitials, calculateLevel } from '@/lib/utils'
import { getAppSettings } from '@/lib/ranking'
import type { Ranking, EmployeeResult, KpiDefinition } from '@/types'
import { Zap, Star, Trophy, Edit2 } from 'lucide-react'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [results, setResults] = useState<(EmployeeResult & { kpi: KpiDefinition })[]>([])
  const [xpPerLevel, setXpPerLevel] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  async function fetchData() {
    setLoading(true)
    try {
      const settings = await getAppSettings()
      setXpPerLevel(settings.xp_per_level)

      const { data: seasonData } = await supabase
        .from('seasons').select('id').eq('status', 'active').single()

      if (!seasonData) return

      const [rankData, resultsData] = await Promise.all([
        supabase.from('rankings').select('*').eq('employee_id', profile!.id).eq('season_id', seasonData.id).single(),
        supabase.from('employee_results').select('*, kpi:kpi_definitions(*)').eq('employee_id', profile!.id).eq('season_id', seasonData.id),
      ])

      setRanking(rankData.data as Ranking | null)
      setResults((resultsData.data ?? []) as (EmployeeResult & { kpi: KpiDefinition })[])
    } finally {
      setLoading(false)
    }
  }

  async function saveName() {
    if (!newName.trim() || !profile?.id) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: newName.trim() }).eq('id', profile.id)
    await refreshProfile()
    setEditName(false)
    setSaving(false)
  }

  const totalXp = ranking?.total_xp ?? 0
  const level = calculateLevel(totalXp, xpPerLevel)

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <PageHeader title="Meu Perfil" />

      {/* Card principal */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-24 h-24 rounded-2xl object-cover ring-2 ring-higame-purple/40" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-higame flex items-center justify-center text-3xl font-outfit font-black text-white shadow-glow-purple">
                {getInitials(profile?.full_name ?? 'HG')}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            {editName ? (
              <div className="flex gap-2 mb-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-field flex-1 py-2 text-sm"
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                />
                <button onClick={saveName} disabled={saving} className="btn-primary px-4 py-2 text-sm">
                  {saving ? '...' : 'Salvar'}
                </button>
                <button onClick={() => setEditName(false)} className="btn-secondary px-3 py-2 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-outfit font-bold text-higame-text">{profile?.full_name}</h2>
                <button onClick={() => { setNewName(profile?.full_name ?? ''); setEditName(true) }} className="text-higame-muted hover:text-higame-text transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm font-inter text-higame-muted mb-1">{profile?.position ?? 'Colaborador'}</p>
            {profile?.team && <p className="text-sm font-inter text-higame-muted">{profile.team}</p>}

            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-xs font-inter text-higame-muted">XP Total</p>
                <p className="text-lg font-outfit font-bold text-higame-purple flex items-center gap-1">
                  <Zap className="w-4 h-4" />{totalXp.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-inter text-higame-muted">Nível</p>
                <p className="text-lg font-outfit font-bold text-higame-neon flex items-center gap-1">
                  <Star className="w-4 h-4" />{level}
                </p>
              </div>
              <div>
                <p className="text-xs font-inter text-higame-muted">Ranking</p>
                <p className="text-lg font-outfit font-bold text-higame-gold flex items-center gap-1">
                  <Trophy className="w-4 h-4" />{ranking?.rank_position ? `${ranking.rank_position}º` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <XPProgressBar totalXp={totalXp} xpPerLevel={xpPerLevel} />
        </div>
      </GlassCard>

      {/* KPIs da Temporada Atual */}
      {results.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="font-outfit font-bold text-higame-text mb-4">KPIs desta Temporada</h3>
          <div className="space-y-3">
            {results.map(result => (
              <div key={result.id} className="flex items-center justify-between py-2 border-b border-higame-border/50 last:border-0">
                <div>
                  <p className="text-sm font-outfit font-semibold text-higame-text">{result.kpi?.name}</p>
                  <p className="text-xs font-inter text-higame-muted">{result.display_value}</p>
                </div>
                <div className="flex items-center gap-3">
                  {result.tier && <TierBadge tier={result.tier} size="sm" />}
                  <span className="text-xs font-outfit font-bold text-higame-purple">+{result.xp_earned} XP</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
