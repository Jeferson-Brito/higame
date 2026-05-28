import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GlassCard, PageHeader, TierBadge, Skeleton } from '@/components/ui/index'
import { XPProgressBar } from '@/components/XPProgressBar'
import { getInitials, calculateLevel } from '@/lib/utils'
import { getAppSettings } from '@/lib/ranking'
import type { Ranking, EmployeeResult, KpiDefinition } from '@/types'
import { Zap, Star, Trophy, Edit2, Award } from 'lucide-react'

// Estilos de raridade para a borda/fundo da medalha
const RARITY_COLORS: Record<string, string> = {
  common: 'bg-slate-700 text-slate-300 border-slate-500',
  rare: 'bg-blue-900/50 text-blue-400 border-blue-500 shadow-glow-neon',
  epic: 'bg-purple-900/50 text-purple-400 border-purple-500 shadow-glow-purple',
  legendary: 'bg-amber-900/50 text-amber-400 border-amber-500 shadow-glow-gold',
  mythic: 'bg-red-900/50 text-red-400 border-red-500 shadow-glow-red',
}

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [results, setResults] = useState<(EmployeeResult & { kpi: KpiDefinition })[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [xpPerLevel, setXpPerLevel] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const profileId = profile?.id

  const fetchData = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const settings = await getAppSettings()
      setXpPerLevel(settings.xp_per_level)

      const { data: seasonData } = await supabase
        .from('seasons').select('id').eq('status', 'active').single()

      if (!seasonData) {
        // Se não tiver temporada, ainda assim carrega as medalhas
        const { data: badgesData } = await supabase
          .from('employee_badges')
          .select('id, unlocked_at, badge:badges(id, name, description, icon, rarity)')
          .eq('employee_id', profileId)
          .order('unlocked_at', { ascending: false })
          
        setBadges(badgesData ?? [])
        return
      }

      const [rankData, resultsData, badgesData] = await Promise.all([
        supabase.from('rankings').select('*').eq('employee_id', profileId).eq('season_id', seasonData.id).single(),
        supabase.from('employee_results').select('*, kpi:kpi_definitions(*)').eq('employee_id', profileId).eq('season_id', seasonData.id),
        supabase.from('employee_badges').select('id, unlocked_at, badge:badges(id, name, description, icon, rarity)').eq('employee_id', profileId).order('unlocked_at', { ascending: false })
      ])

      setRanking(rankData.data as Ranking | null)
      setResults((resultsData.data ?? []) as (EmployeeResult & { kpi: KpiDefinition })[])
      setBadges(badgesData.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-10">
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

      {/* Coleção de Medalhas */}
      <GlassCard className="p-6">
        <h3 className="font-outfit font-bold text-higame-text mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" /> Coleção de Medalhas
        </h3>
        
        {badges.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-white/10 rounded-xl">
            Você ainda não conquistou nenhuma medalha. Cumpra missões e bata suas metas!
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {badges.map((eb: any) => {
              const b = Array.isArray(eb.badge) ? eb.badge[0] : eb.badge
              return (
                <div key={eb.id} className="relative group cursor-help">
                  <div className={`flex flex-col items-center justify-center text-center p-3 h-28 rounded-xl border ${RARITY_COLORS[b.rarity]} bg-opacity-20 hover:scale-105 transition-transform`}>
                    <div className="text-4xl mb-1 filter drop-shadow-md">{b.icon}</div>
                    <h4 className="font-outfit font-bold text-white text-[10px] leading-tight line-clamp-2">{b.name}</h4>
                  </div>
                  
                  {/* Tooltip Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl bg-slate-900 border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                    <p className="text-xs text-amber-400 font-bold mb-1">{b.name}</p>
                    <p className="text-[10px] text-slate-300 mb-2">{b.description}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Desbloqueada em</p>
                    <p className="text-[9px] text-slate-400">{new Date(eb.unlocked_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
