import type { KpiTier, KpiType, AppSettings, XpBreakdown } from '@/types'

// ============================================================
// Formatação de valores por tipo de KPI
// ============================================================

/**
 * Converte segundos para formato HH:MM:SS
 */
export function secondsToTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

/**
 * Converte HH:MM:SS para segundos totais
 */
export function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/**
 * Formata valor para exibição conforme o tipo do KPI
 */
export function formatDisplayValue(rawValue: string, type: KpiType, unit?: string | null): string {
  switch (type) {
    case 'time':
      // Se já está em HH:MM:SS, retorna direto; senão converte de segundos
      if (/^\d{2}:\d{2}:\d{2}$/.test(rawValue)) return rawValue
      if (/^\d+$/.test(rawValue)) return secondsToTime(parseInt(rawValue))
      return rawValue
    case 'percent':
      return `${parseFloat(rawValue).toFixed(1)}%`
    case 'number':
      return unit ? `${parseFloat(rawValue).toFixed(1)} ${unit}` : parseFloat(rawValue).toFixed(1)
    default:
      return rawValue
  }
}

// ============================================================
// Cálculo de Nível
// ============================================================

/**
 * Calcula o nível baseado no XP total acumulado
 * Simples: 1000 XP por nível
 */
export function calculateLevel(totalXp: number, xpPerLevel = 1000): number {
  return Math.floor(totalXp / xpPerLevel) + 1
}

/**
 * Calcula o XP necessário para o próximo nível
 */
export function xpToNextLevel(totalXp: number, xpPerLevel = 1000): number {
  return xpPerLevel - (totalXp % xpPerLevel)
}

/**
 * Calcula percentual de progresso dentro do nível atual (0-100)
 */
export function levelProgressPercent(totalXp: number, xpPerLevel = 1000): number {
  return ((totalXp % xpPerLevel) / xpPerLevel) * 100
}

// ============================================================
// Cálculo de Tier
// ============================================================

interface KpiRuleSimple {
  tier: KpiTier
  min_value: number | null
  max_value: number | null
  min_seconds: number | null
  max_seconds: number | null
  lower_is_better: boolean
  xp_reward: number
}

/**
 * Determina o tier de um resultado baseado nas regras configuradas
 */
export function calculateTier(
  numericValue: number,
  rules: KpiRuleSimple[],
  type: KpiType
): { tier: KpiTier; xp_reward: number } {
  const isTime = type === 'time'

  for (const rule of rules) {
    const min = isTime ? rule.min_seconds : rule.min_value
    const max = isTime ? rule.max_seconds : rule.max_value

    const aboveMin = min === null || numericValue >= min
    const belowMax = max === null || numericValue <= max

    if (aboveMin && belowMax) {
      return { tier: rule.tier, xp_reward: rule.xp_reward }
    }
  }

  return { tier: 'out', xp_reward: 0 }
}

// ============================================================
// Cálculo de Score (0–100)
// ============================================================

const TIER_SCORE: Record<KpiTier, number> = {
  gold: 100,
  silver: 70,
  bronze: 40,
  out: 0,
}

/**
 * Calcula o score geral (média ponderada dos tiers, 0–100)
 */
export function calculateScore(tiers: KpiTier[]): number {
  if (tiers.length === 0) return 0
  const total = tiers.reduce((sum, tier) => sum + TIER_SCORE[tier], 0)
  return Math.round(total / tiers.length)
}

// ============================================================
// Cálculo de XP com multiplicadores
// ============================================================

/**
 * Calcula XP total com multiplicadores aplicados
 */
export function calculateXpWithMultipliers(
  baseXp: number,
  tiers: KpiTier[],
  previousScore: number | null,
  currentScore: number,
  settings: Pick<AppSettings, 'multiplier_all_gold' | 'multiplier_improvement'>
): XpBreakdown {
  const allGold = tiers.length > 0 && tiers.every(t => t === 'gold')
  const improved = previousScore !== null && currentScore > previousScore

  let multiplier = 1.0
  if (allGold) multiplier *= settings.multiplier_all_gold
  if (improved) multiplier *= settings.multiplier_improvement

  const finalXp = Math.round(baseXp * multiplier)

  return {
    base_xp: baseXp,
    multiplier_all_gold: allGold,
    multiplier_improvement: improved,
    multiplier_value: multiplier,
    final_xp: finalXp,
    kpi_details: [],
  }
}

// ============================================================
// Utilitários de data
// ============================================================

export function formatMonthYear(month: number, year: number): string {
  const months = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return `${months[month]} ${year}`
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

// ============================================================
// Utilitários gerais
// ============================================================

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

export function rankOrdinal(rank: number): string {
  if (rank === 1) return '🥇 1º'
  if (rank === 2) return '🥈 2º'
  if (rank === 3) return '🥉 3º'
  return `${rank}º`
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
