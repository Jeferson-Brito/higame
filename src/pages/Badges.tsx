import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, Skeleton } from '@/components/ui/index'
import { useAuth } from '@/contexts/AuthContext'
import { Award, Lock, CheckCircle2, Search } from 'lucide-react'

// Simulando o tipo das Badges
interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  xp_reward: number
  coin_reward: number
}

interface EmployeeBadge {
  badge_id: string
  unlocked_at: string
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-600 border-slate-400/30 text-slate-300',
  rare: 'from-blue-400 to-blue-600 border-blue-400/30 text-blue-300 shadow-glow-neon',
  epic: 'from-purple-400 to-purple-600 border-purple-400/30 text-purple-300 shadow-glow-purple',
  legendary: 'from-amber-400 to-amber-600 border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
  mythic: 'from-red-500 to-rose-700 border-red-500/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)]',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
  mythic: 'Mítico',
}

export default function Badges() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [badges, setBadges] = useState<Badge[]>([])
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const fetchBadges = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      // Como o banco acabou de ser criado, pegamos tudo da tabela badges
      const { data: allBadges } = await supabase.from('badges').select('*').order('rarity')
      const { data: myBadges } = await supabase.from('employee_badges').select('*').eq('employee_id', profile.id)

      setBadges((allBadges ?? []) as Badge[])
      setUnlockedIds(new Set((myBadges ?? []).map(mb => mb.badge_id)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchBadges()
  }, [fetchBadges])

  const filteredBadges = badges.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  // Sorting: primeiro as desbloqueadas, depois por raridade
  const sortedBadges = [...filteredBadges].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id)
    const bUnlocked = unlockedIds.has(b.id)
    if (aUnlocked && !bUnlocked) return -1
    if (!aUnlocked && bUnlocked) return 1
    return 0
  })

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader 
          title="Medalhas e Insígnias" 
          subtitle={`Você desbloqueou ${unlockedIds.size} de ${badges.length} conquistas!`} 
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar conquista..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-full md:w-64 bg-slate-900/50"
          />
        </div>
      </div>

      {badges.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400">
          Nenhuma badge cadastrada ainda. Rode o script SQL!
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBadges.map((badge, i) => {
            const isUnlocked = unlockedIds.has(badge.id)
            
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative overflow-hidden rounded-2xl p-6 border bg-slate-900/50 backdrop-blur-md flex flex-col items-center text-center group ${
                  !isUnlocked ? 'opacity-60 grayscale hover:grayscale-0 transition-all duration-500' : ''
                }`}
              >
                {/* Background Glow */}
                <div className={`absolute inset-0 bg-gradient-to-b ${RARITY_COLORS[badge.rarity]} opacity-5 group-hover:opacity-15 transition-opacity`} />
                
                {/* Status superior */}
                <div className="absolute top-3 right-3">
                  {isUnlocked ? (
                    <CheckCircle2 className="w-5 h-5 text-higame-success" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                {/* Ícone 3D */}
                <div className={`w-20 h-20 rounded-2xl border-2 mb-4 flex items-center justify-center text-4xl transform group-hover:scale-110 transition-all duration-300 bg-gradient-to-br ${RARITY_COLORS[badge.rarity]} ${!isUnlocked && 'border-dashed border-slate-600 bg-none bg-slate-900 shadow-none text-slate-500'}`}>
                  {isUnlocked ? badge.icon : '❓'}
                </div>

                {/* Textos */}
                <h3 className="font-outfit font-black text-white text-lg mb-2">{badge.name}</h3>
                <p className="text-xs font-inter text-slate-400 mb-4 line-clamp-3 min-h-[48px]">
                  {badge.description}
                </p>
                
                {/* Recompensas */}
                <div className="mt-auto w-full flex items-center justify-between border-t border-white/5 pt-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-slate-950 ${RARITY_COLORS[badge.rarity].split(' ').pop()}`}>
                    {RARITY_LABELS[badge.rarity]}
                  </span>
                  <div className="flex gap-2">
                    {badge.xp_reward > 0 && (
                      <span className="text-[10px] font-bold text-higame-purple bg-higame-purple/10 px-2 py-1 rounded">+{badge.xp_reward} XP</span>
                    )}
                    {badge.coin_reward > 0 && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded">+{badge.coin_reward} HC</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
