import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { getInitials, calculateLevel } from '@/lib/utils'
import { getAppSettings } from '@/lib/ranking'
import { Users, Search, Star, Trophy } from 'lucide-react'
import { AvatarFrame } from '@/components/ui/AvatarFrame'

interface Player {
  id: string
  full_name: string
  avatar_url: string | null
  team: string | null
  team_data?: { name: string; color: string; icon: string } | null
  total_xp: number
  level: number
  active_title?: { name: string } | null
  active_frame?: { rarity: string } | null
}

export default function Players() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getAppSettings()
      const xpPerLevel = settings.xp_per_level

      // Buscar perfis ativos (apenas employees)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, team, team_data:teams(name, color, icon), active_title:store_items!fk_active_title(name), active_frame:store_items!fk_active_frame(rarity)')
        .eq('role', 'employee')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (!profiles) return

      // Buscar rankings da temporada ativa para ter o XP
      const { data: seasonData } = await supabase
        .from('seasons').select('id').eq('status', 'active').single()

      let rankings: any[] = []
      if (seasonData) {
        const { data: ranks } = await supabase
          .from('rankings')
          .select('employee_id, total_xp')
          .eq('season_id', seasonData.id)
        rankings = ranks ?? []
      }

      const mappedPlayers = profiles.map(p => {
        const r = rankings.find(rank => rank.employee_id === p.id)
        const total_xp = r?.total_xp ?? 0
        return {
          ...p,
          active_title: Array.isArray(p.active_title) ? p.active_title[0] : p.active_title,
          active_frame: Array.isArray(p.active_frame) ? p.active_frame[0] : p.active_frame,
          team_data: Array.isArray((p as any).team_data) ? (p as any).team_data[0] : (p as any).team_data,
          total_xp,
          level: calculateLevel(total_xp, xpPerLevel)
        }
      })

      // Ordenar por nível/xp (maior para menor) e depois alfabeticamente
      mappedPlayers.sort((a, b) => {
        if (b.total_xp !== a.total_xp) return b.total_xp - a.total_xp
        return a.full_name.localeCompare(b.full_name)
      })

      setPlayers(mappedPlayers)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPlayers()
  }, [fetchPlayers])

  const filteredPlayers = players.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Jogadores" 
          subtitle="Conheça a guilda, veja o perfil e as medalhas dos seus colegas"
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-full sm:w-64 bg-slate-900/50"
          />
        </div>
      </div>

      {players.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400">
          Nenhum jogador encontrado.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <div 
              key={player.id}
              onClick={() => navigate(`/players/${player.id}`)}
              className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-white/5 hover:border-higame-purple/30 transition-all cursor-pointer flex flex-col p-5 shadow-glass"
            >
              {/* Efeito Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-higame-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="flex items-center gap-4 mb-4">
                <AvatarFrame 
                  avatarUrl={player.avatar_url}
                  fullName={player.full_name}
                  size="lg"
                  frameRarity={(player.active_frame?.rarity as any) || undefined}
                />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-outfit font-bold text-white text-sm truncate group-hover:text-higame-purple transition-colors">
                    {player.full_name}
                  </h3>
                  {player.active_title && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 my-0.5 line-clamp-1">
                      {player.active_title.name}
                    </p>
                  )}
                  {/* Badge de equipe */}
                  {player.team_data ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5"
                      style={{ backgroundColor: `${player.team_data.color}20`, color: player.team_data.color, border: `1px solid ${player.team_data.color}40` }}
                    >
                      {player.team_data.icon} {player.team_data.name}
                    </span>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">Sem equipe</p>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-bold text-higame-neon">
                  <Star className="w-3.5 h-3.5" /> Nível {player.level}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <Trophy className="w-3.5 h-3.5 text-higame-gold" /> {player.total_xp.toLocaleString()} XP
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
