import { cn } from '@/lib/utils'
import type { KpiTier } from '@/types'

// ============================================================
// GlassCard
// ============================================================

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className, hover, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        hover ? 'glass-card-hover' : 'glass-card',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================
// TierBadge
// ============================================================

const TIER_CLASSES: Record<KpiTier, string> = {
  gold:   'tier-badge-gold',
  silver: 'tier-badge-silver',
  bronze: 'tier-badge-bronze',
  out:    'tier-badge-out',
}

const TIER_LABELS: Record<KpiTier, string> = {
  gold:   '🥇 Ouro',
  silver: '🥈 Prata',
  bronze: '🥉 Bronze',
  out:    '❌ Fora da Meta',
}

interface TierBadgeProps {
  tier: KpiTier
  size?: 'sm' | 'md'
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  return (
    <span className={cn(
      TIER_CLASSES[tier],
      size === 'sm' && 'text-[10px] px-2 py-0.5'
    )}>
      {TIER_LABELS[tier]}
    </span>
  )
}

// ============================================================
// Skeleton
// ============================================================

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className, lines }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('skeleton h-4', i === lines - 1 && 'w-3/4', className)}
          />
        ))}
      </div>
    )
  }
  return <div className={cn('skeleton', className)} />
}

// ============================================================
// Badge de Posição no Ranking
// ============================================================

interface RankBadgeProps {
  rank: number | null
}

export function RankBadge({ rank }: RankBadgeProps) {
  if (!rank) return <span className="text-higame-muted text-sm">—</span>

  const configs = {
    1: { emoji: '🥇', class: 'text-higame-gold font-black' },
    2: { emoji: '🥈', class: 'text-higame-silver font-black' },
    3: { emoji: '🥉', class: 'text-higame-bronze font-black' },
  }

  const config = configs[rank as 1 | 2 | 3]
  if (config) {
    return (
      <span className={cn('font-outfit text-lg', config.class)}>
        {config.emoji} {rank}º
      </span>
    )
  }

  return (
    <span className="font-outfit font-bold text-higame-text">
      {rank}º
    </span>
  )
}

// ============================================================
// PageHeader
// ============================================================

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-higame-text">{title}</h1>
        {subtitle && (
          <p className="text-sm font-inter text-higame-muted mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-higame-surface2 border border-higame-border
                        flex items-center justify-center mb-4 text-higame-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-outfit font-semibold text-higame-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm font-inter text-higame-muted max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ============================================================
// StatusDot
// ============================================================

interface StatusDotProps {
  status: 'active' | 'draft' | 'closed' | 'online' | 'offline'
}

const STATUS_COLORS = {
  active:  'bg-higame-success',
  draft:   'bg-higame-warning',
  closed:  'bg-higame-muted',
  online:  'bg-higame-success',
  offline: 'bg-higame-muted',
}

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full',
      STATUS_COLORS[status],
      status === 'active' && 'animate-pulse'
    )} />
  )
}

// ============================================================
// ConfirmModal
// ============================================================

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-card p-6 w-full max-w-sm animate-slide-up">
        <h3 className="text-lg font-outfit font-bold text-higame-text mb-2">{title}</h3>
        <p className="text-sm font-inter text-higame-muted mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1',
              variant === 'danger' ? 'btn-danger' : 'btn-primary'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
