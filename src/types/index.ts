// ============================================================
// HIGAME — Tipos TypeScript
// ============================================================

// ENUMs (espelham os ENUMs do PostgreSQL)
export type UserRole = 'admin' | 'employee'
export type SeasonStatus = 'draft' | 'active' | 'closed'
export type KpiTier = 'gold' | 'silver' | 'bronze' | 'out'
export type KpiType = 'time' | 'number' | 'percent'
export type RarityTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type QuestFrequency = 'daily' | 'weekly' | 'season' | 'one_shot'
export type StoreItemType = 'frame' | 'banner' | 'title' | 'real_reward'

// ============================================================
// Entidades do banco
// ============================================================

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  position: string | null
  team: string | null
  current_streak: number
  longest_streak: number
  last_login: string | null
  coins_balance: number
  active_title_id: string | null
  active_frame_id: string | null
  active_banner_id: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Season {
  id: string
  name: string
  month: number
  year: number
  status: SeasonStatus
  description: string | null
  started_at: string | null
  closed_at: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface KpiDefinition {
  id: string
  season_id: string
  name: string
  slug: string
  type: KpiType
  unit: string | null
  description: string | null
  display_order: number
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface KpiRule {
  id: string
  kpi_id: string
  tier: KpiTier
  min_value: number | null
  max_value: number | null
  min_seconds: number | null
  max_seconds: number | null
  xp_reward: number
  lower_is_better: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeResult {
  id: string
  employee_id: string
  season_id: string
  kpi_id: string
  raw_value: string
  display_value: string
  seconds: number | null
  numeric_val: number | null
  tier: KpiTier | null
  xp_earned: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface XpHistory {
  id: string
  employee_id: string
  season_id: string
  xp_delta: number
  reason: string
  reference_id: string | null
  created_at: string
}

export interface Ranking {
  id: string
  season_id: string
  employee_id: string
  total_xp: number
  total_score: number
  rank_position: number | null
  kpi_summary: Record<string, KpiTier> | null
  updated_at: string
}

export interface SeasonSnapshot {
  id: string
  season_id: string
  employee_id: string
  final_xp: number
  final_level: number
  final_score: number
  final_rank: number | null
  final_tier_summary: Record<string, KpiTier> | null
  xp_breakdown: XpBreakdown | null
  snapshot_data: Record<string, unknown> | null
  created_at: string
}

export interface AppSetting {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_at: string
}

export interface Badge {
  id: string
  name: string
  description: string | null
  icon: string
  rarity: RarityTier
  xp_reward: number
  coin_reward: number
  condition_type: string | null
  is_active: boolean
  created_at: string
}

export interface EmployeeBadge {
  id: string
  employee_id: string
  badge_id: string
  unlocked_at: string
}

export interface Quest {
  id: string
  name: string
  description: string | null
  frequency: QuestFrequency
  xp_reward: number
  coin_reward: number
  target_value: number
  is_active: boolean
  created_at: string
}

export interface EmployeeQuest {
  id: string
  employee_id: string
  quest_id: string
  progress: number
  completed: boolean
  completed_at: string | null
  reset_at: string | null
  created_at: string
}

export interface StoreItem {
  id: string
  name: string
  description: string | null
  type: StoreItemType
  rarity: RarityTier
  price_coins: number
  asset_url: string | null
  is_active: boolean
  created_at: string
}

export interface EmployeePurchase {
  id: string
  employee_id: string
  item_id: string
  purchased_at: string
}

// ============================================================
// Tipos compostos (joins)
// ============================================================

export interface RankingWithProfile extends Ranking {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'position' | 'team'>
}

export interface ResultWithKpi extends EmployeeResult {
  kpi: KpiDefinition
}

export interface SnapshotWithProfile extends SeasonSnapshot {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'position'>
}

// ============================================================
// Tipos de lógica de negócio
// ============================================================

export interface XpBreakdown {
  base_xp: number
  multiplier_all_gold: boolean
  multiplier_improvement: boolean
  multiplier_value: number
  final_xp: number
  kpi_details: Array<{
    kpi_id: string
    kpi_name: string
    tier: KpiTier
    xp_earned: number
  }>
}

export interface EmployeeDashboard {
  profile: Profile
  active_season: Season | null
  current_level: number
  current_xp: number
  xp_to_next_level: number
  xp_progress_percent: number
  rank_position: number | null
  total_score: number
  results: ResultWithKpi[]
  ranking: Ranking | null
  season_history: SeasonSnapshot[]
}

export interface AppSettings {
  xp_gold: number
  xp_silver: number
  xp_bronze: number
  xp_out: number
  multiplier_all_gold: number
  multiplier_improvement: number
  xp_per_level: number
  app_name: string
  app_tagline: string
}

// ============================================================
// Utilitários
// ============================================================

export interface TierConfig {
  label: string
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
  gradientClass: string
  textClass: string
}

export const TIER_CONFIG: Record<KpiTier, TierConfig> = {
  gold: {
    label: 'Ouro',
    color: '#F59E0B',
    bgColor: 'bg-higame-gold/10',
    borderColor: 'border-higame-gold/40',
    glowClass: 'shadow-glow-gold',
    gradientClass: 'bg-gradient-gold',
    textClass: 'text-higame-gold',
  },
  silver: {
    label: 'Prata',
    color: '#94A3B8',
    bgColor: 'bg-higame-silver/10',
    borderColor: 'border-higame-silver/40',
    glowClass: 'shadow-glow-silver',
    gradientClass: 'bg-gradient-silver',
    textClass: 'text-higame-silver',
  },
  bronze: {
    label: 'Bronze',
    color: '#CD7F32',
    bgColor: 'bg-higame-bronze/10',
    borderColor: 'border-higame-bronze/40',
    glowClass: 'shadow-glow-bronze',
    gradientClass: 'bg-gradient-bronze',
    textClass: 'text-higame-bronze',
  },
  out: {
    label: 'Fora da Meta',
    color: '#EF4444',
    bgColor: 'bg-higame-danger/10',
    borderColor: 'border-higame-danger/40',
    glowClass: 'shadow-glow-danger',
    gradientClass: 'bg-gradient-danger',
    textClass: 'text-higame-danger',
  },
}

export const SEASON_STATUS_LABEL: Record<SeasonStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  closed: 'Encerrada',
}

export const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
