import { supabase } from '@/lib/supabase'
import type {
  KpiTier,
  KpiType,
  XpBreakdown,
  AppSettings,
} from '@/types'
import {
  calculateLevel,
  calculateScore,
  calculateXpWithMultipliers,
  timeToSeconds,
  formatDisplayValue,
} from '@/lib/utils'

// ============================================================
// Buscar configurações do sistema
// ============================================================

export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')

  if (error) throw error

  const raw = Object.fromEntries(data.map((s: { key: string; value: unknown }) => [s.key, s.value]))

  return {
    xp_gold:               Number(raw.xp_gold ?? 100),
    xp_silver:             Number(raw.xp_silver ?? 70),
    xp_bronze:             Number(raw.xp_bronze ?? 40),
    xp_out:                Number(raw.xp_out ?? 0),
    multiplier_all_gold:   Number(raw.multiplier_all_gold ?? 1.5),
    multiplier_improvement: Number(raw.multiplier_improvement ?? 1.2),
    xp_per_level:          Number(raw.xp_per_level ?? 1000),
    app_name:              String(raw.app_name ?? 'HIGAME'),
    app_tagline:           String(raw.app_tagline ?? 'Gamificação Corporativa'),
  }
}

// ============================================================
// Determinar tier de um resultado
// ============================================================

interface KpiRuleData {
  id: string
  tier: KpiTier
  min_value: number | null
  max_value: number | null
  min_seconds: number | null
  max_seconds: number | null
  lower_is_better: boolean
  xp_reward: number
}

export function determineTier(
  rawValue: string,
  kpiType: KpiType,
  rules: KpiRuleData[]
): { tier: KpiTier; xp_earned: number; seconds: number | null; numeric_val: number | null; display_value: string } {
  let numericForComparison: number
  let seconds: number | null = null
  let numeric_val: number | null = null

  if (kpiType === 'time') {
    seconds = timeToSeconds(rawValue)
    numericForComparison = seconds
  } else {
    numeric_val = parseFloat(rawValue)
    numericForComparison = numeric_val
  }

  const display_value = formatDisplayValue(rawValue, kpiType)

  // Ordenar regras: gold → silver → bronze → out
  const tierOrder: KpiTier[] = ['gold', 'silver', 'bronze', 'out']
  const sortedRules = [...rules].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  )

  for (const rule of sortedRules) {
    const min = kpiType === 'time' ? rule.min_seconds : rule.min_value
    const max = kpiType === 'time' ? rule.max_seconds : rule.max_value

    const aboveMin = min === null || numericForComparison >= min
    const belowMax = max === null || numericForComparison <= max

    if (aboveMin && belowMax) {
      return {
        tier: rule.tier,
        xp_earned: rule.xp_reward,
        seconds,
        numeric_val,
        display_value,
      }
    }
  }

  return { tier: 'out', xp_earned: 0, seconds, numeric_val, display_value }
}

// ============================================================
// Recalcular e atualizar ranking de um colaborador
// ============================================================

export async function recalculateEmployeeRanking(
  employeeId: string,
  seasonId: string
): Promise<void> {
  const settings = await getAppSettings()

  // Buscar todos os resultados do colaborador na temporada
  const { data: results, error: resultsError } = await supabase
    .from('employee_results')
    .select('tier, xp_earned, kpi_id')
    .eq('employee_id', employeeId)
    .eq('season_id', seasonId)

  if (resultsError) throw resultsError

  const tiers: KpiTier[] = results.map((r: { tier: KpiTier | null }) => r.tier ?? 'out')
  const baseXp = results.reduce((sum: number, r: { xp_earned: number }) => sum + r.xp_earned, 0)
  const score = calculateScore(tiers)

  // Buscar score do mês anterior (última season snapshot)
  const { data: prevSnapshot } = await supabase
    .from('season_snapshots')
    .select('final_score')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const previousScore = prevSnapshot?.final_score ?? null

  const xpBreakdown = calculateXpWithMultipliers(
    baseXp,
    tiers,
    previousScore,
    score,
    settings
  )

  // Montar kpi_summary
  const kpiSummary = Object.fromEntries(
    results.map((r: { kpi_id: string; tier: KpiTier | null }) => [r.kpi_id, r.tier ?? 'out'])
  )

  // Upsert no ranking
  const { error: rankError } = await supabase
    .from('rankings')
    .upsert({
      season_id: seasonId,
      employee_id: employeeId,
      total_xp: xpBreakdown.final_xp,
      total_score: score,
      kpi_summary: kpiSummary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'season_id,employee_id' })

  if (rankError) throw rankError

  // Reordenar posições do ranking da temporada
  await recalculateRankPositions(seasonId)
}

/**
 * Reordena as posições do ranking por XP total (desc)
 */
async function recalculateRankPositions(seasonId: string): Promise<void> {
  const { data: allRankings, error } = await supabase
    .from('rankings')
    .select('id, total_xp, total_score, updated_at')
    .eq('season_id', seasonId)
    .order('total_xp', { ascending: false })
    .order('total_score', { ascending: false })
    .order('updated_at', { ascending: true })

  if (error) throw error

  // Atualizar posição de cada colaborador
  const updates = allRankings.map((r: { id: string }, index: number) => ({
    id: r.id,
    rank_position: index + 1,
  }))

  for (const update of updates) {
    await supabase
      .from('rankings')
      .update({ rank_position: update.rank_position })
      .eq('id', update.id)
  }
}

// ============================================================
// Criar Snapshot ao Encerrar Temporada
// ============================================================

export async function closeSeasonAndSnapshot(seasonId: string): Promise<void> {
  const settings = await getAppSettings()

  // Buscar todos os rankings da temporada
  const { data: rankings, error: rankError } = await supabase
    .from('rankings')
    .select('*, profiles(id, full_name, avatar_url)')
    .eq('season_id', seasonId)
    .order('rank_position', { ascending: true })

  if (rankError) throw rankError

  // Para cada colaborador, criar snapshot
  const snapshots = await Promise.all(
    rankings.map(async (ranking: {
      employee_id: string
      total_xp: number
      total_score: number
      rank_position: number | null
      kpi_summary: Record<string, KpiTier> | null
    }) => {
      const { data: results, error: resultsError } = await supabase
        .from('employee_results')
        .select('kpi_id, tier, xp_earned, kpi:kpi_definitions(name)')
        .eq('employee_id', ranking.employee_id)
        .eq('season_id', seasonId)

      if (resultsError) throw resultsError

      const resultRows = (results ?? []) as Array<{
        kpi_id: string
        tier: KpiTier | null
        xp_earned: number
        kpi: { name: string } | { name: string }[] | null
      }>
      const tiers = resultRows.map(result => result.tier ?? 'out')
      const baseXp = resultRows.reduce((sum, result) => sum + result.xp_earned, 0)
      const level = calculateLevel(ranking.total_xp, settings.xp_per_level)

      const prevSnapshot = await supabase
        .from('season_snapshots')
        .select('final_score')
        .eq('employee_id', ranking.employee_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const previousScore = prevSnapshot.data?.final_score ?? null

      const xpBreakdown: XpBreakdown = calculateXpWithMultipliers(
        baseXp,
        tiers,
        previousScore,
        ranking.total_score,
        settings
      )
      xpBreakdown.kpi_details = resultRows.map(result => {
        const kpi = Array.isArray(result.kpi) ? result.kpi[0] : result.kpi
        return {
          kpi_id: result.kpi_id,
          kpi_name: kpi?.name ?? 'KPI',
          tier: result.tier ?? 'out',
          xp_earned: result.xp_earned,
        }
      })

      return {
        season_id: seasonId,
        employee_id: ranking.employee_id,
        final_xp: ranking.total_xp,
        final_level: level,
        final_score: ranking.total_score,
        final_rank: ranking.rank_position,
        final_tier_summary: ranking.kpi_summary,
        xp_breakdown: xpBreakdown,
        snapshot_data: {
          captured_at: new Date().toISOString(),
          settings_snapshot: settings,
        },
      }
    })
  )

  // Inserir todos os snapshots (imutáveis)
  const { error: snapshotError } = await supabase
    .from('season_snapshots')
    .insert(snapshots)

  if (snapshotError) throw snapshotError

  // Marcar temporada como encerrada
  const { error: closeError } = await supabase
    .from('seasons')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', seasonId)

  if (closeError) throw closeError
}

// ============================================================
// Buscar ranking completo de uma temporada
// ============================================================

export async function getSeasonRanking(seasonId: string) {
  const { data, error } = await supabase
    .from('rankings')
    .select(`
      *,
      profile:profiles(id, full_name, avatar_url, position, team)
    `)
    .eq('season_id', seasonId)
    .order('rank_position', { ascending: true })

  if (error) throw error
  return data
}

// ============================================================
// Buscar histórico de temporadas (snapshots) de um colaborador
// ============================================================

export async function getEmployeeSeasonHistory(employeeId: string) {
  const { data, error } = await supabase
    .from('season_snapshots')
    .select(`
      *,
      season:seasons(id, name, month, year, status)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
