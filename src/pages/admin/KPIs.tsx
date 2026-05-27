import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, EmptyState } from '@/components/ui/index'
import type { Season, KpiDefinition, KpiRule, KpiTier, KpiType } from '@/types'
import { Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const TOAST_STYLE = { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }
const TIERS: KpiTier[] = ['gold', 'silver', 'bronze', 'out']
const TIER_LABELS: Record<KpiTier, string> = { gold: '🥇 Ouro', silver: '🥈 Prata', bronze: '🥉 Bronze', out: '❌ Fora da Meta' }
const TIER_XP_DEFAULT: Record<KpiTier, number> = { gold: 100, silver: 70, bronze: 40, out: 0 }
const FIELD_CLASS = [
  'w-full rounded-xl border border-higame-border bg-slate-900/80 px-3 py-2.5',
  'text-sm font-inter text-higame-text placeholder:text-higame-muted/60 outline-none',
  'transition-all duration-200 focus:border-higame-purple/60 focus:ring-2',
  'focus:ring-higame-purple/20 disabled:cursor-not-allowed disabled:opacity-60',
].join(' ')
const COMPACT_FIELD_CLASS = `${FIELD_CLASS} py-2 text-xs`
const LABEL_CLASS = 'block mb-1.5 text-xs font-inter font-semibold text-higame-muted'

export default function AdminKPIs() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [rules, setRules] = useState<Record<string, KpiRule[]>>({})
  const [loading, setLoading] = useState(false)
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null)
  const [savingRules, setSavingRules] = useState(false)

  const fetchKpisAndRules = useCallback(async () => {
    setLoading(true)
    const { data: kpiData } = await supabase.from('kpi_definitions').select('*').eq('season_id', selectedSeason).is('deleted_at', null).order('display_order')
    const kpiList = (kpiData ?? []) as KpiDefinition[]
    setKpis(kpiList)

    const rulesMap: Record<string, KpiRule[]> = {}
    for (const kpi of kpiList) {
      const { data: ruleData } = await supabase.from('kpi_rules').select('*').eq('kpi_id', kpi.id)
      rulesMap[kpi.id] = (ruleData ?? []) as KpiRule[]
    }
    setRules(rulesMap)
    setLoading(false)
  }, [selectedSeason])

  useEffect(() => {
    supabase.from('seasons').select('*').is('deleted_at', null).neq('status', 'closed')
      .order('year', { ascending: false }).then(({ data }) => {
        const s = (data ?? []) as Season[]
        setSeasons(s)
        const active = s.find(x => x.status === 'active') ?? s[0]
        if (active) setSelectedSeason(active.id)
      })
  }, [])

  useEffect(() => {
    if (selectedSeason) void fetchKpisAndRules()
  }, [selectedSeason, fetchKpisAndRules])

  async function addKpi() {
    const order = kpis.length
    const { data, error } = await supabase.from('kpi_definitions').insert({
      season_id: selectedSeason,
      name: 'Novo KPI',
      slug: `kpi_${Date.now()}`,
      type: 'number' as KpiType,
      unit: '',
      display_order: order,
    }).select().single()
    if (error) { toast.error('Erro ao criar KPI', { style: TOAST_STYLE }); return }
    setKpis(prev => [...prev, data as KpiDefinition])
    setExpandedKpi(data.id)

    // Criar regras padrão
    const defaultRules = TIERS.map(tier => ({
      kpi_id: data.id, tier, xp_reward: TIER_XP_DEFAULT[tier],
      min_value: null, max_value: null, min_seconds: null, max_seconds: null, lower_is_better: false
    }))
    await supabase.from('kpi_rules').insert(defaultRules)
    await fetchKpisAndRules()
  }

  async function updateKpi(id: string, field: keyof KpiDefinition, value: string | number | boolean) {
    setKpis(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k))
    await supabase.from('kpi_definitions').update({ [field]: value }).eq('id', id)
  }

  async function deleteKpi(id: string) {
    await supabase.from('kpi_definitions').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setKpis(prev => prev.filter(k => k.id !== id))
    toast.success('KPI removido', { style: TOAST_STYLE })
  }

  async function saveRules(kpiId: string) {
    setSavingRules(true)
    const kpiRules = rules[kpiId] ?? []
    for (const rule of kpiRules) {
      await supabase.from('kpi_rules').upsert({
        id: rule.id,
        kpi_id: kpiId,
        tier: rule.tier,
        min_value: rule.min_value,
        max_value: rule.max_value,
        min_seconds: rule.min_seconds,
        max_seconds: rule.max_seconds,
        xp_reward: rule.xp_reward,
        lower_is_better: rule.lower_is_better,
      }, { onConflict: 'id' })
    }
    setSavingRules(false)
    toast.success('Faixas salvas!', { style: TOAST_STYLE })
  }

  function updateRule(kpiId: string, tier: KpiTier, field: string, value: string | number | boolean | null) {
    setRules(prev => ({
      ...prev,
      [kpiId]: (prev[kpiId] ?? []).map(r => r.tier === tier ? { ...r, [field]: value } : r)
    }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Configuração de KPIs" subtitle="Defina os KPIs e suas faixas de desempenho por temporada" />

      {/* Seletor de temporada */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="input-label whitespace-nowrap mb-0">Temporada:</label>
        <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className={`${FIELD_CLASS} max-w-xs`}>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
        </select>
        <button onClick={addKpi} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add KPI
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : kpis.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState icon={<Settings className="w-6 h-6" />} title="Nenhum KPI configurado" description="Clique em 'Add KPI' para criar o primeiro KPI desta temporada." />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {kpis.map(kpi => (
            <GlassCard key={kpi.id} className="overflow-hidden">
              {/* Header do KPI */}
              <div className="p-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Nome</label>
                    <input value={kpi.name} onChange={e => updateKpi(kpi.id, 'name', e.target.value)} className={FIELD_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Tipo</label>
                    <select value={kpi.type} onChange={e => updateKpi(kpi.id, 'type', e.target.value)} className={FIELD_CLASS}>
                      <option value="number">Número</option>
                      <option value="time">Tempo (HH:MM:SS)</option>
                      <option value="percent">Percentual (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Unidade (ex: atend.)</label>
                    <input value={kpi.unit ?? ''} onChange={e => updateKpi(kpi.id, 'unit', e.target.value)} className={FIELD_CLASS} placeholder="Opcional" />
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setExpandedKpi(expandedKpi === kpi.id ? null : kpi.id)} className="btn-ghost p-2" title={expandedKpi === kpi.id ? 'Recolher faixas' : 'Expandir faixas'}>
                    {expandedKpi === kpi.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteKpi(kpi.id)} className="btn-ghost p-2 text-higame-danger hover:bg-higame-danger/10" title="Remover KPI">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Faixas */}
              <AnimatePresence>
                {expandedKpi === kpi.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-higame-border overflow-hidden"
                  >
                    <div className="p-4 space-y-3 bg-higame-surface2/30">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-outfit font-semibold text-higame-text">Faixas de Desempenho</p>
                        <label className="flex items-center gap-2 text-xs font-inter text-higame-muted">
                          <input type="checkbox" checked={rules[kpi.id]?.[0]?.lower_is_better ?? false}
                            onChange={e => {
                              rules[kpi.id]?.forEach(r => updateRule(kpi.id, r.tier, 'lower_is_better', e.target.checked))
                            }}
                            className="rounded"
                          />
                          Menor é melhor (TME, Absenteísmo)
                        </label>
                      </div>
                      {TIERS.map(tier => {
                        const rule = rules[kpi.id]?.find(r => r.tier === tier)
                        if (!rule) return null
                        const isTime = kpi.type === 'time'
                        return (
                          <div key={tier} className={`p-4 rounded-xl border ${
                            tier === 'gold' ? 'border-higame-gold/30 bg-higame-gold/5' :
                            tier === 'silver' ? 'border-higame-silver/30 bg-higame-silver/5' :
                            tier === 'bronze' ? 'border-higame-bronze/30 bg-higame-bronze/5' :
                            'border-higame-danger/30 bg-higame-danger/5'
                          }`}>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(120px,150px)_1fr] lg:items-center">
                              <span className="text-sm font-outfit font-bold text-higame-text">{TIER_LABELS[tier]}</span>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                  <label className={`${LABEL_CLASS} text-[10px]`}>Mín {isTime ? '(HH:MM:SS)' : ''}</label>
                                  <input
                                    type={isTime ? 'text' : 'number'}
                                    placeholder={isTime ? '00:00:00' : '0'}
                                    value={isTime ? (rule.min_seconds != null ? `${Math.floor(rule.min_seconds/3600).toString().padStart(2,'0')}:${Math.floor((rule.min_seconds%3600)/60).toString().padStart(2,'0')}:${(rule.min_seconds%60).toString().padStart(2,'0')}` : '') : (rule.min_value ?? '')}
                                    onChange={e => {
                                      if (isTime) {
                                        const parts = e.target.value.split(':').map(Number)
                                        const secs = parts.length === 3 ? parts[0]*3600+parts[1]*60+parts[2] : null
                                        updateRule(kpi.id, tier, 'min_seconds', secs)
                                      } else {
                                        updateRule(kpi.id, tier, 'min_value', e.target.value === '' ? null : Number(e.target.value))
                                      }
                                    }}
                                    className={COMPACT_FIELD_CLASS}
                                  />
                                </div>
                                <div>
                                  <label className={`${LABEL_CLASS} text-[10px]`}>Máx {isTime ? '(HH:MM:SS)' : ''}</label>
                                  <input
                                    type={isTime ? 'text' : 'number'}
                                    placeholder={isTime ? '00:00:00' : '∞'}
                                    value={isTime ? (rule.max_seconds != null ? `${Math.floor(rule.max_seconds/3600).toString().padStart(2,'0')}:${Math.floor((rule.max_seconds%3600)/60).toString().padStart(2,'0')}:${(rule.max_seconds%60).toString().padStart(2,'0')}` : '') : (rule.max_value ?? '')}
                                    onChange={e => {
                                      if (isTime) {
                                        const parts = e.target.value.split(':').map(Number)
                                        const secs = parts.length === 3 ? parts[0]*3600+parts[1]*60+parts[2] : null
                                        updateRule(kpi.id, tier, 'max_seconds', secs)
                                      } else {
                                        updateRule(kpi.id, tier, 'max_value', e.target.value === '' ? null : Number(e.target.value))
                                      }
                                    }}
                                    className={COMPACT_FIELD_CLASS}
                                  />
                                </div>
                                <div>
                                  <label className={`${LABEL_CLASS} text-[10px]`}>XP</label>
                                  <input
                                    type="number"
                                    value={rule.xp_reward}
                                    onChange={e => updateRule(kpi.id, tier, 'xp_reward', Number(e.target.value))}
                                    className={COMPACT_FIELD_CLASS}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={() => saveRules(kpi.id)} disabled={savingRules} className="btn-primary w-full text-sm py-2">
                        {savingRules ? 'Salvando...' : 'Salvar Faixas'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
