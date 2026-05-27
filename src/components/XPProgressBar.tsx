import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { calculateLevel, xpToNextLevel, levelProgressPercent } from '@/lib/utils'

interface XPProgressBarProps {
  totalXp: number
  xpPerLevel?: number
  showDetails?: boolean
}

export function XPProgressBar({ totalXp, xpPerLevel = 1000, showDetails = true }: XPProgressBarProps) {
  const level = calculateLevel(totalXp, xpPerLevel)
  const toNext = xpToNextLevel(totalXp, xpPerLevel)
  const percent = levelProgressPercent(totalXp, xpPerLevel)
  const currentLevelXp = totalXp % xpPerLevel

  return (
    <div className="w-full">
      {showDetails && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-higame flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <div>
              <p className="text-xs font-inter text-higame-muted leading-none">Nível</p>
              <p className="text-lg font-outfit font-black text-higame-text leading-tight">{level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-inter text-higame-muted">{currentLevelXp.toLocaleString()} / {xpPerLevel.toLocaleString()} XP</p>
            <p className="text-xs font-outfit font-semibold text-higame-purple">{toNext.toLocaleString()} XP para nível {level + 1}</p>
          </div>
        </div>
      )}

      {/* Barra */}
      <div className="relative h-3 bg-higame-surface2 rounded-full overflow-hidden border border-higame-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-full bg-gradient-higame relative"
        >
          {/* Efeito shimmer na barra */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>
        </motion.div>

        {/* Glow no fim da barra */}
        <motion.div
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: `${Math.max(0, percent - 2)}%`, opacity: percent > 5 ? 1 : 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          className="absolute top-0 bottom-0 w-4 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.8) 0%, transparent 70%)' }}
        />
      </div>

      {!showDetails && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-inter text-higame-muted">Nível {level}</span>
          <span className="text-[10px] font-inter text-higame-purple">{Math.round(percent)}%</span>
        </div>
      )}
    </div>
  )
}
