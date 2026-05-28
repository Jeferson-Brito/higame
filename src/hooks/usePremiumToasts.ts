import { useState, useCallback } from 'react'
import type { PremiumToastData } from '@/components/PremiumToast'

interface ToastItem extends PremiumToastData {
  id: string
}

export function usePremiumToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((data: PremiumToastData) => {
    const id = `toast_${Date.now()}_${Math.random()}`
    setToasts(prev => [...prev.slice(-2), { ...data, id }]) // Máx 3 ao mesmo tempo
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showLevelUp = useCallback((level: number) => {
    showToast({
      type: 'level_up',
      title: `Nível ${level}!`,
      subtitle: 'Você evoluiu! Continue assim para desbloquear novos itens.',
    })
  }, [showToast])

  const showBadge = useCallback((name: string, icon?: string) => {
    showToast({
      type: 'badge',
      title: name,
      subtitle: 'Você desbloqueou uma nova conquista!',
      icon,
    })
  }, [showToast])

  const showStreak = useCallback((streak: number) => {
    showToast({
      type: 'streak',
      title: `${streak} dias seguidos!`,
      subtitle: `Incrível! Você está em chamas 🔥`,
    })
  }, [showToast])

  return { toasts, dismissToast, showToast, showLevelUp, showBadge, showStreak }
}
