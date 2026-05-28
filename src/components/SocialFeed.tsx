import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { AvatarFrame } from '@/components/ui/AvatarFrame'
import { Sword, ShoppingBag, TrendingUp, Star, Flame, Users } from 'lucide-react'
import { calculateLevel } from '@/lib/utils'
import { getAppSettings } from '@/lib/ranking'

interface FeedEvent {
  id: string
  profile_id: string
  event_type: string
  event_data: Record<string, any>
  created_at: string
  profile?: {
    full_name: string
    avatar_url: string | null
    active_frame?: { rarity: string } | null
  }
}

const EVENT_CONFIGS: Record<string, { icon: typeof Sword; color: string; label: (d: Record<string, any>) => string }> = {
  badge_earned: {
    icon: Sword,
    color: 'text-amber-400 bg-amber-400/10',
    label: (d) => `conquistou a medalha "${d.badge_name}" ${d.badge_icon ?? '🏅'}`,
  },
  item_purchased: {
    icon: ShoppingBag,
    color: 'text-blue-400 bg-blue-400/10',
    label: (d) => `adquiriu "${d.item_name}" na loja 🛒`,
  },
  level_up: {
    icon: TrendingUp,
    color: 'text-higame-neon bg-higame-neon/10',
    label: (d) => `subiu para o Nível ${d.level}! ⭐`,
  },
  streak_milestone: {
    icon: Flame,
    color: 'text-orange-400 bg-orange-400/10',
    label: (d) => `atingiu ${d.streak} dias consecutivos de streak! 🔥`,
  },
  quest_completed: {
    icon: Star,
    color: 'text-higame-purple bg-higame-purple/10',
    label: (d) => `completou a missão "${d.quest_name}" ✅`,
  },
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const then = new Date(dateStr)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

interface SocialFeedProps {
  limit?: number
}

export function SocialFeed({ limit = 15 }: SocialFeedProps) {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFeed = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('feed_events')
        .select(`
          id, profile_id, event_type, event_data, created_at,
          profile:profiles!feed_events_profile_id_fkey(
            full_name, avatar_url,
            active_frame:store_items!fk_active_frame(rarity)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (data) {
        const mapped = data.map((e: any) => ({
          ...e,
          profile: e.profile
            ? {
                ...e.profile,
                active_frame: Array.isArray(e.profile.active_frame)
                  ? e.profile.active_frame[0]
                  : e.profile.active_frame,
              }
            : null,
        }))
        setEvents(mapped)
      }
    } catch (err) {
      console.error('Feed error:', err)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    void fetchFeed()

    // Realtime: escutar novos eventos
    const channel = supabase
      .channel('feed_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_events' }, () => {
        void fetchFeed()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchFeed])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/5 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma atividade recente ainda.</p>
        <p className="text-xs mt-1">As conquistas da equipe aparecerão aqui em tempo real!</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
      <AnimatePresence>
        {events.map((event, i) => {
          const config = EVENT_CONFIGS[event.event_type]
          if (!config) return null
          const IconComponent = config.icon
          const fullName = event.profile?.full_name ?? 'Alguém'

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <AvatarFrame
                  avatarUrl={event.profile?.avatar_url}
                  fullName={fullName}
                  size="sm"
                  frameRarity={event.profile?.active_frame?.rarity as any}
                />
              </div>

              {/* Icon do evento */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                <IconComponent className="w-3.5 h-3.5" />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 leading-snug">
                  <span className="font-bold text-white">{fullName.split(' ')[0]}</span>
                  {' '}
                  <span className="text-slate-300">{config.label(event.event_data)}</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(event.created_at)}</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
