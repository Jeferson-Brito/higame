import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, EmptyState, TierBadge } from '@/components/ui/index'
import type { Season, Profile, KpiDefinition, EmployeeResult } from '@/types'
import { determineTier, recalculateEmployeeRanking } from '@/lib/ranking'
import { ClipboardList, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const TOAST_STYLE = { background: '#12121F', border: '1px solid #2A2A45', color: '#E2E8F0' }

interface KpiRuleData {
  id: string
  tier: import('@/types').KpiTier
  min_value: number | null
  max_value: number | null
  min_seconds: number | null
  max_seconds: number | null
  lower_is_better: boolean
  xp_reward: number
}

export default function AdminResults() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [employees, setEmployees] = useState<Profile[]>([])
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [kpiRules, setKpiRules] = useState<Record<string, KpiRuleData[]>>({})
  const [results, setResults] = useState<Record<string, Record<string, string>>>({}) // employeeId -> kpiId -> value
  const [existingResults, setExistingResults] = useState<EmployeeResult[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [empData, kpiData, resultData] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).eq('role', 'employee').is('deleted_at', null).order('full_name'),
      supabase.from('kpi_definitions').select('*').eq('season_id', selectedSeason).eq('is_active', true).is('deleted_at', null).order('display_order'),
      supabase.from('employee_results').select('*').eq('season_id', selectedSeason),
    ])

    const empList = (empData.data ?? []) as Profile[]
    const kpiList = (kpiData.data ?? []) as KpiDefinition[]
    const resultList = (resultData.data ?? []) as EmployeeResult[]

    setEmployees(empList)
    setKpis(kpiList)
    setExistingResults(resultList)

    // Carregar regras de cada KPI
    const rulesMap: Record<string, KpiRuleData[]> = {}
    for (const kpi of kpiList) {
      const { data: ruleData } = await supabase.from('kpi_rules').select('*').eq('kpi_id', kpi.id)
      rulesMap[kpi.id] = (ruleData ?? []) as KpiRuleData[]
    }
    setKpiRules(rulesMap)

    // Pre-popular valores existentes
    const valMap: Record<string, Record<string, string>> = {}
    for (const result of resultList) {
      if (!valMap[result.employee_id]) valMap[result.employee_id] = {}
      valMap[result.employee_id][result.kpi_id] = result.raw_value
    }
    setResults(valMap)
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
    if (selectedSeason) void fetchData()
  }, [selectedSeason, fetchData])

  async function saveEmployeeResults(employeeId: string) {
    const employeeValues = results[employeeId] ?? {}
    if (Object.keys(employeeValues).length === 0) return

    setSaving(employeeId)
    try {
      for (const kpi of kpis) {
        const rawValue = employeeValues[kpi.id]
        if (!rawValue && rawValue !== '0') continue

        const rules = kpiRules[kpi.id] ?? []
        const { tier, xp_earned, seconds, numeric_val, display_value } = determineTier(rawValue, kpi.type, rules)

        await supabase.from('employee_results').upsert({
          employee_id: employeeId,
          season_id: selectedSeason,
          kpi_id: kpi.id,
          raw_value: rawValue,
          display_value,
          seconds,
          numeric_val,
          tier,
          xp_earned,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'employee_id,season_id,kpi_id' })
      }

      await recalculateEmployeeRanking(employeeId, selectedSeason)
      toast.success('Resultados salvos!', { style: TOAST_STYLE })
      await fetchData()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Erro ao salvar', { style: TOAST_STYLE })
    } finally {
      setSaving(null)
    }
  }

  function getExistingResult(employeeId: string, kpiId: string) {
    return existingResults.find(r => r.employee_id === employeeId && r.kpi_id === kpiId)
  }

  function getPreviewTier(employeeId: string, kpi: KpiDefinition) {
    const val = results[employeeId]?.[kpi.id]
    if (!val) return null
    const rules = kpiRules[kpi.id] ?? []
    try {
      const { tier } = determineTier(val, kpi.type, rules)
      return tier
    } catch { return null }
  }

  const selectedSeasonObj = seasons.find(s => s.id === selectedSeason)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Inserir Resultados" subtitle="Registre os resultados mensais por colaborador" />

      <div className="flex gap-3 items-center flex-wrap">
        <label className="input-label whitespace-nowrap mb-0">Temporada:</label>
        <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="input-field max-w-xs">
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedSeasonObj?.status === 'closed' && (
          <span className="text-xs font-inter text-higame-danger border border-higame-danger/30 rounded-lg px-2 py-1">
            ⚠️ Temporada encerrada — somente leitura
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32" />)}</div>
      ) : employees.length === 0 ? (
        <GlassCard className="p-12">
          <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="Nenhum colaborador ativo" />
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {employees.map(emp => (
            <GlassCard key={emp.id} className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-higame flex items-center justify-center text-sm font-outfit font-bold text-white flex-shrink-0">
                    {emp.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-outfit font-semibold text-higame-text">{emp.full_name}</p>
                    <p className="text-xs font-inter text-higame-muted">{emp.position ?? ''}</p>
                  </div>
                </div>
                {selectedSeasonObj?.status !== 'closed' && (
                  <button
                    onClick={() => saveEmployeeResults(emp.id)}
                    disabled={saving === emp.id}
                    className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs"
                  >
                    {saving === emp.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar
                  </button>
                )}
              </div>

              {kpis.length === 0 ? (
                <p className="text-xs font-inter text-higame-muted">Configure os KPIs primeiro.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {kpis.map(kpi => {
                    const existing = getExistingResult(emp.id, kpi.id)
                    const previewTier = getPreviewTier(emp.id, kpi)
                    const isClosed = selectedSeasonObj?.status === 'closed'

                    return (
                      <div key={kpi.id}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="input-label mb-0 text-xs">{kpi.name} {kpi.unit ? `(${kpi.unit})` : ''}</label>
                          {existing?.tier && <TierBadge tier={existing.tier} size="sm" />}
                        </div>
                        <input
                          type={kpi.type === 'time' ? 'text' : 'number'}
                          placeholder={kpi.type === 'time' ? '00:00:00' : kpi.type === 'percent' ? '0.0' : '0'}
                          value={results[emp.id]?.[kpi.id] ?? ''}
                          onChange={e => setResults(prev => ({
                            ...prev,
                            [emp.id]: { ...(prev[emp.id] ?? {}), [kpi.id]: e.target.value }
                          }))}
                          className="input-field py-2 text-sm"
                          readOnly={isClosed}
                        />
                        {previewTier && results[emp.id]?.[kpi.id] && (
                          <div className="mt-1">
                            <TierBadge tier={previewTier} size="sm" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
