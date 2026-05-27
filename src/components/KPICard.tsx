import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { KpiTier, KpiType } from '@/types'
import { cn } from '@/lib/utils'

interface KPICardProps {
  name: string
  displayValue: string
  tier: KpiTier | null
  type: KpiType
  unit?: string | null
  previousTier?: KpiTier | null | undefined
  index?: number
}

const TIER_CARD_CLASSES: Record<KpiTier, string> = {
  gold:   'kpi-card-gold',
  silver: 'kpi-card-silver',
  bronze: 'kpi-card-bronze',
  out:    'kpi-card-out',
}

const TIER_ICON_CLASSES: Record<KpiTier, string> = {
  gold:   'text-higame-gold',
  silver: 'text-higame-silver',
  bronze: 'text-higame-bronze',
  out:    'text-higame-danger',
}

const TIER_VALUE_CLASSES: Record<KpiTier, string> = {
  gold:   'text-higame-gold',
  silver: 'text-higame-silver',
  bronze: 'text-higame-bronze',
  out:    'text-higame-danger',
}

const TIER_LABELS: Record<KpiTier, string> = {
  gold:   'Ouro',
  silver: 'Prata',
  bronze: 'Bronze',
  out:    'Fora da Meta',
}

const TIER_EMOJIS: Record<KpiTier, string> = {
  gold:   '🥇',
  silver: '🥈',
  bronze: '🥉',
  out:    '❌',
}

// Tendência vs mês anterior
function TrendIndicator({ current, previous }: { current: KpiTier | null; previous: KpiTier | null | undefined }) {
  if (!current || !previous) return null

  const tierOrder = { gold: 0, silver: 1, bronze: 2, out: 3 }
  const currentRank = tierOrder[current]
  const previousRank = tierOrder[previous]

  if (currentRank < previousRank) {
    return <TrendingUp className="w-3.5 h-3.5 text-higame-success" />
  }
  if (currentRank > previousRank) {
    return <TrendingDown className="w-3.5 h-3.5 text-higame-danger" />
  }
  return <Minus className="w-3.5 h-3.5 text-higame-muted" />
}

export function KPICard({ name, displayValue, tier, previousTier, index = 0 }: KPICardProps) {
  const activeTier = tier ?? 'out'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={cn(
        TIER_CARD_CLASSES[activeTier],
        'p-5 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-inter font-medium text-higame-muted uppercase tracking-wider mb-0.5">
            {name}
          </p>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-outfit font-semibold px-2 py-0.5 rounded-lg',
              activeTier === 'gold'   && 'bg-higame-gold/15 text-higame-gold border border-higame-gold/20',
              activeTier === 'silver' && 'bg-higame-silver/15 text-higame-silver border border-higame-silver/20',
              activeTier === 'bronze' && 'bg-higame-bronze/15 text-higame-bronze border border-higame-bronze/20',
              activeTier === 'out'    && 'bg-higame-danger/15 text-higame-danger border border-higame-danger/20',
            )}>
              {TIER_EMOJIS[activeTier]} {TIER_LABELS[activeTier]}
            </span>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-1 bg-higame-surface/50 rounded-lg px-2 py-1">
          <TrendIndicator current={tier} previous={previousTier} />
        </div>
      </div>

      {/* Valor */}
      <div className={cn('text-3xl font-outfit font-black leading-none', TIER_VALUE_CLASSES[activeTier])}>
        {tier ? displayValue : '—'}
      </div>

      {/* XP indicator line */}
      <div className="mt-4 h-1 rounded-full bg-higame-surface3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: activeTier === 'gold' ? '100%'
                 : activeTier === 'silver' ? '70%'
                 : activeTier === 'bronze' ? '40%'
                 : '0%'
          }}
          transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            activeTier === 'gold'   && 'bg-gradient-gold',
            activeTier === 'silver' && 'bg-gradient-silver',
            activeTier === 'bronze' && 'bg-gradient-bronze',
            activeTier === 'out'    && 'bg-higame-danger/30',
          )}
        />
      </div>
    </motion.div>
  )
}
