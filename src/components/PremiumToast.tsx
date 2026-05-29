import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Award, Flame } from 'lucide-react'
import confetti from 'canvas-confetti'

export type PremiumToastType = 'level_up' | 'badge' | 'streak'

export interface PremiumToastData {
  type: PremiumToastType
  title: string
  subtitle: string
  icon?: string
}

interface PremiumToastProps {
  data: PremiumToastData
  onDismiss: () => void
  duration?: number
}

const TOAST_CONFIGS: Record<PremiumToastType, { 
  bg: string
  border: string
  glow: string
  icon: typeof Star
  iconColor: string
  particles: string[]
}> = {
  level_up: {
    bg: 'from-higame-purple/80 to-higame-neon/60',
    border: 'border-higame-neon/50',
    glow: 'shadow-[0_0_40px_rgba(0,245,196,0.3)]',
    icon: Star,
    iconColor: 'text-higame-neon',
    particles: ['⭐', '✨', '💫', '🌟'],
  },
  badge: {
    bg: 'from-amber-900/80 to-amber-700/60',
    border: 'border-amber-500/50',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]',
    icon: Award,
    iconColor: 'text-amber-400',
    particles: ['🏅', '✨', '⚡', '🎖️'],
  },
  streak: {
    bg: 'from-orange-900/80 to-red-900/60',
    border: 'border-orange-500/50',
    glow: 'shadow-[0_0_40px_rgba(249,115,22,0.3)]',
    icon: Flame,
    iconColor: 'text-orange-400',
    particles: ['🔥', '💥', '⚡', '🔥'],
  },
}

export function PremiumToast({ data, onDismiss, duration = 5000 }: PremiumToastProps) {
  const config = TOAST_CONFIGS[data.type]
  const IconComponent = config.icon

  useEffect(() => {
    // Se for um level up, dispara a animação de confetes!
    if (data.type === 'level_up') {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#8b5cf6', '#00f5c4', '#f59e0b']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#8b5cf6', '#00f5c4', '#f59e0b']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration, data.type])

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${config.bg} ${config.border} ${config.glow} p-5 cursor-pointer min-w-[320px] max-w-[380px] backdrop-blur-xl`}
      onClick={onDismiss}
    >
      {/* Partículas flutuantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {config.particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute text-lg select-none"
            initial={{ 
              x: `${20 + i * 20}%`, 
              y: '100%', 
              opacity: 0,
              rotate: Math.random() * 40 - 20
            }}
            animate={{ 
              y: '-20%', 
              opacity: [0, 1, 0],
              rotate: Math.random() * 80 - 40
            }}
            transition={{ 
              duration: 2 + Math.random(),
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: Math.random() * 2
            }}
          >
            {p}
          </motion.span>
        ))}
      </div>

      {/* Faixa brilhante no topo */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      {/* Conteúdo */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Ícone */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={`w-14 h-14 rounded-2xl bg-black/30 flex items-center justify-center flex-shrink-0 border border-white/10`}
        >
          {data.icon ? (
            <span className="text-3xl">{data.icon}</span>
          ) : (
            <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
          )}
        </motion.div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <motion.p
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs font-bold uppercase tracking-widest text-white/60 mb-0.5"
          >
            {data.type === 'level_up' ? '🎮 Level Up!' : data.type === 'badge' ? '🏅 Nova Conquista!' : '🔥 Streak!'}
          </motion.p>
          <motion.h3
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-outfit font-black text-white leading-tight"
          >
            {data.title}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-white/70 mt-0.5"
          >
            {data.subtitle}
          </motion.p>
        </div>
      </div>

      {/* Barra de progresso de duração */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-white/40"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

// Container para gerenciar múltiplos toasts premium
interface PremiumToastContainerProps {
  toasts: (PremiumToastData & { id: string })[]
  onDismiss: (id: string) => void
}

export function PremiumToastContainer({ toasts, onDismiss }: PremiumToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <PremiumToast data={toast} onDismiss={() => onDismiss(toast.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
