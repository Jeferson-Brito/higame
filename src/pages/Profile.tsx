import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GlassCard, PageHeader, TierBadge, Skeleton } from '@/components/ui/index'
import { XPProgressBar } from '@/components/XPProgressBar'
import { getInitials, calculateLevel } from '@/lib/utils'
import { getAppSettings } from '@/lib/ranking'
import type { Ranking, EmployeeResult, KpiDefinition } from '@/types'
import { AvatarFrame, FramePreview } from '@/components/ui/AvatarFrame'
import { ProfileBanner, BannerPreview } from '@/components/ui/ProfileBanner'
import { Zap, Star, Trophy, Edit2, Award, ArrowLeft, LayoutDashboard, Package, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Estilos de raridade para a borda/fundo da medalha
const RARITY_COLORS: Record<string, string> = {
  common: 'bg-slate-700 text-slate-300 border-slate-500',
  rare: 'bg-blue-900/50 text-blue-400 border-blue-500 shadow-glow-neon',
  epic: 'bg-purple-900/50 text-purple-400 border-purple-500 shadow-glow-purple',
  legendary: 'bg-amber-900/50 text-amber-400 border-amber-500 shadow-glow-gold',
  mythic: 'bg-red-900/50 text-red-400 border-red-500 shadow-glow-red',
}

interface ProfileData {
  id: string
  full_name: string
  avatar_url: string | null
  position: string | null
  team: string | null
  active_title_id: string | null
  active_frame_id: string | null
  active_banner_id: string | null
  active_title?: { name: string } | null
}

export default function Profile() {
  const { id: urlId } = useParams() // Captura o ID da URL se existir (ex: /players/123)
  const { profile: loggedProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  // O alvo do perfil é o ID da URL, ou o próprio logado se não tiver URL param
  const targetId = urlId || loggedProfile?.id
  const isOwner = !urlId || urlId === loggedProfile?.id

  const [targetProfile, setTargetProfile] = useState<ProfileData | null>(null)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [results, setResults] = useState<(EmployeeResult & { kpi: KpiDefinition })[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [xpPerLevel, setXpPerLevel] = useState(1000)
  const [loading, setLoading] = useState(true)
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory'>('overview')
  
  // Edição
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!targetId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const settings = await getAppSettings()
      setXpPerLevel(settings.xp_per_level)

      // Notifica visita se não for o dono
      if (loggedProfile && targetId && loggedProfile.id !== targetId) {
        // Checa cooldown (1 hora)
        const cacheKey = `last_visit_${loggedProfile.id}_to_${targetId}`
        const lastVisit = localStorage.getItem(cacheKey)
        const now = Date.now()
        
        if (!lastVisit || (now - Number(lastVisit)) > 60 * 60 * 1000) {
          localStorage.setItem(cacheKey, now.toString())
          await supabase.from('notifications').insert({
            profile_id: targetId,
            title: 'Nova Visita no Perfil 👀',
            message: `${loggedProfile.full_name} acabou de visitar o seu perfil!`,
            type: 'profile_view'
          })
        }
      }

      // 1. Busca os dados base do perfil alvo
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, position, team, active_title_id, active_frame_id, active_banner_id, active_title:store_items!fk_active_title(name)')
        .eq('id', targetId)
        .single()
      
      // Ajusta o active_title (o supabase retorna array ou objeto, pegamos o nome)
      const formattedProfData = {
        ...profData,
        active_title: profData?.active_title ? (Array.isArray(profData.active_title) ? profData.active_title[0] : profData.active_title) : null
      }
      
      setTargetProfile(formattedProfData as ProfileData)
      if (formattedProfData) setNewName(formattedProfData.full_name)

      // 2. Busca temporada ativa
      const { data: seasonData } = await supabase
        .from('seasons').select('id').eq('status', 'active').single()

      if (!seasonData) {
        // Se não tiver temporada, ainda assim carrega as medalhas
        const { data: badgesData } = await supabase
          .from('employee_badges')
          .select('id, unlocked_at, badge:badges(id, name, description, icon, rarity)')
          .eq('employee_id', targetId)
          .order('unlocked_at', { ascending: false })
          
        setBadges(badgesData ?? [])
        return
      }

      // 3. Busca XP, Resultados, Medalhas e Inventário
      const [rankData, resultsData, badgesData, inventoryData] = await Promise.all([
        supabase.from('rankings').select('*').eq('employee_id', targetId).eq('season_id', seasonData.id).single(),
        supabase.from('employee_results').select('*, kpi:kpi_definitions(*)').eq('employee_id', targetId).eq('season_id', seasonData.id),
        supabase.from('employee_badges').select('id, unlocked_at, badge:badges(id, name, description, icon, rarity)').eq('employee_id', targetId).order('unlocked_at', { ascending: false }),
        isOwner ? supabase.from('employee_purchases').select('id, item:store_items(*)').eq('employee_id', targetId).eq('status', 'fulfilled') : Promise.resolve({ data: [] })
      ])

      setRanking(rankData.data as Ranking | null)
      setResults((resultsData.data ?? []) as (EmployeeResult & { kpi: KpiDefinition })[])
      setBadges(badgesData.data ?? [])
      
      if (inventoryData.data) {
        setInventory(inventoryData.data.map(i => Array.isArray(i.item) ? i.item[0] : i.item))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [targetId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  async function saveName() {
    if (!newName.trim() || !targetId || !isOwner) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: newName.trim() }).eq('id', targetId)
    await refreshProfile() // Atualiza o contexto global se for o dono
    setTargetProfile(prev => prev ? { ...prev, full_name: newName.trim() } : null)
    setEditName(false)
    setSaving(false)
  }

  async function equipItem(itemId: string, type: string) {
    if (!isOwner || !targetId) return
    try {
      const payload: any = {}
      if (type === 'title') payload.active_title_id = itemId
      if (type === 'frame') payload.active_frame_id = itemId
      if (type === 'banner') payload.active_banner_id = itemId
      
      const { error } = await supabase.from('profiles').update(payload).eq('id', targetId)
      if (error) throw error
      
      toast.success('Equipado com sucesso!')
      void fetchData() // Recarrega os dados para ver a atualização visual
    } catch (err) {
      console.error(err)
      toast.error('Erro ao equipar item.')
    }
  }

  const totalXp = ranking?.total_xp ?? 0
  const level = calculateLevel(totalXp, xpPerLevel)

  if (loading) return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />

  if (!targetProfile) return (
    <div className="text-center py-20 text-slate-400">
      <p>Perfil não encontrado.</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-10">
      
      {/* Se não for o dono, mostra um botão de Voltar */}
      {!isOwner && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-higame-muted hover:text-white transition-colors text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      )}

      <PageHeader title={isOwner ? "Meu Perfil" : "Perfil do Jogador"} />

      {/* Card principal com Banner de fundo */}
      <ProfileBanner 
        bannerUrl={inventory.find(i => i.id === targetProfile.active_banner_id)?.asset_url}
        className="rounded-3xl shadow-2xl relative overflow-hidden"
        height="auto"
      >
        <div className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar com Moldura */}
            <AvatarFrame 
              avatarUrl={targetProfile.avatar_url} 
              fullName={targetProfile.full_name} 
              size="xl"
              frameRarity={inventory.find(i => i.id === targetProfile.active_frame_id)?.rarity}
              frameUrl={inventory.find(i => i.id === targetProfile.active_frame_id)?.asset_url}
            />

          {/* Info */}
          <div className="flex-1">
            {editName && isOwner ? (
              <div className="flex gap-2 mb-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-field flex-1 py-2 text-sm"
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                />
                <button onClick={saveName} disabled={saving} className="btn-primary px-4 py-2 text-sm">
                  {saving ? '...' : 'Salvar'}
                </button>
                <button onClick={() => setEditName(false)} className="btn-secondary px-3 py-2 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-outfit font-bold text-higame-text">{targetProfile.full_name}</h2>
                {isOwner && (
                  <button onClick={() => { setNewName(targetProfile.full_name ?? ''); setEditName(true) }} className="text-higame-muted hover:text-higame-text transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            
            {/* Título Equipado */}
            {targetProfile.active_title && (
              <div className="mt-1 mb-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-higame-purple/20 text-higame-purple border border-higame-purple/30">
                {targetProfile.active_title.name}
              </div>
            )}

            <p className="text-sm font-inter text-higame-muted mb-1">{targetProfile.position ?? 'Colaborador'}</p>
            {targetProfile.team && <p className="text-sm font-inter text-higame-muted">{targetProfile.team}</p>}

            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-xs font-inter text-higame-muted">XP Total</p>
                <p className="text-lg font-outfit font-bold text-higame-purple flex items-center gap-1">
                  <Zap className="w-4 h-4" />{totalXp.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-inter text-higame-muted">Nível</p>
                <p className="text-lg font-outfit font-bold text-higame-neon flex items-center gap-1">
                  <Star className="w-4 h-4" />{level}
                </p>
              </div>
              <div>
                <p className="text-xs font-inter text-higame-muted">Ranking</p>
                <p className="text-lg font-outfit font-bold text-higame-gold flex items-center gap-1">
                  <Trophy className="w-4 h-4" />{ranking?.rank_position ? `${ranking.rank_position}º` : '—'}
                </p>
              </div>
              {ranking?.current_multiplier && ranking.current_multiplier > 1.0 && (
                <div>
                  <p className="text-xs font-inter text-higame-muted">Multiplicador</p>
                  <p className="text-lg font-outfit font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-400" />
                    {ranking.current_multiplier}x
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <XPProgressBar totalXp={totalXp} xpPerLevel={xpPerLevel} />
        </div>
      </ProfileBanner>

      {/* TABS DE NAVEGAÇÃO */}
      {isOwner && (
        <div className="flex gap-4 border-b border-white/10 pb-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'overview' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-amber-500 text-slate-950 shadow-glow-gold' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Package className="w-4 h-4" /> Inventário
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          {/* Coleção de Medalhas */}
          <GlassCard className="p-6">
            <h3 className="font-outfit font-bold text-higame-text mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" /> {isOwner ? 'Minha Coleção' : 'Coleção do Jogador'}
            </h3>
        
        {badges.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-white/10 rounded-xl">
            Nenhuma medalha conquistada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {badges.map((eb: any) => {
              const b = Array.isArray(eb.badge) ? eb.badge[0] : eb.badge
              return (
                <div key={eb.id} className="relative group cursor-help">
                  <div className={`flex flex-col items-center justify-center text-center p-3 h-28 rounded-xl border ${RARITY_COLORS[b.rarity]} bg-opacity-20 hover:scale-105 transition-transform`}>
                    <div className="text-4xl mb-1 filter drop-shadow-md">{b.icon}</div>
                    <h4 className="font-outfit font-bold text-white text-[10px] leading-tight line-clamp-2">{b.name}</h4>
                  </div>
                  
                  {/* Tooltip Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl bg-slate-900 border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                    <p className="text-xs text-amber-400 font-bold mb-1">{b.name}</p>
                    <p className="text-[10px] text-slate-300 mb-2">{b.description}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">Desbloqueada em</p>
                    <p className="text-[9px] text-slate-400">{new Date(eb.unlocked_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

          {/* KPIs da Temporada Atual */}
          {results.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="font-outfit font-bold text-higame-text mb-4">KPIs desta Temporada</h3>
              <div className="space-y-3">
                {results.map(result => (
                  <div key={result.id} className="flex items-center justify-between py-2 border-b border-higame-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-outfit font-semibold text-higame-text">{result.kpi?.name}</p>
                      <p className="text-xs font-inter text-higame-muted">{result.display_value}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result.tier && <TierBadge tier={result.tier} size="sm" />}
                      <span className="text-xs font-outfit font-bold text-higame-purple">+{result.xp_earned} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {activeTab === 'inventory' && isOwner && (
        <GlassCard className="p-6">
          <h3 className="font-outfit font-bold text-white mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" /> Seus Cosméticos
          </h3>
          
          {inventory.filter(i => ['title', 'frame', 'banner'].includes(i.type)).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
              <p className="text-sm text-slate-500 mb-4">Seu inventário está vazio.</p>
              <button onClick={() => navigate('/store')} className="btn-primary text-sm px-4 py-2">
                Ir para a Loja
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {inventory.filter(i => ['title', 'frame', 'banner'].includes(i.type)).map(item => {
                const isEquipped = item.id === targetProfile.active_title_id || 
                                   item.id === targetProfile.active_frame_id ||
                                   item.id === targetProfile.active_banner_id
                
                return (
                  <div key={item.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${isEquipped ? 'bg-higame-purple/10 border-higame-purple' : 'bg-slate-900/50 border-white/10 hover:border-white/20'}`}>
                    <div className="text-3xl mb-3 w-full flex justify-center">
                      {item.asset_url?.startsWith('frame:') ? (
                        <div className="scale-125"><FramePreview frameKey={item.asset_url} size={48} /></div>
                      ) : item.asset_url?.startsWith('banner:') ? (
                        <BannerPreview bannerKey={item.asset_url} width={120} height={60} />
                      ) : (
                        item.asset_url || '✨'
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {item.type === 'title' ? 'Título' : item.type === 'banner' ? 'Banner' : 'Moldura'}
                    </p>
                    <p className="text-sm font-bold text-white mb-4">{item.name}</p>
                    
                    <button 
                      onClick={() => !isEquipped && equipItem(item.id, item.type)}
                      disabled={isEquipped}
                      className={`w-full py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${isEquipped ? 'bg-higame-success/20 text-higame-success' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      {isEquipped ? <><CheckCircle2 className="w-3 h-3" /> Equipado</> : 'Equipar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
