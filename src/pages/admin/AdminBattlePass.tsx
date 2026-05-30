import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import type { BattlePassSeason, BattlePassReward, BattlePassProgress, RarityTier, BpRewardType } from '@/types'
import {
  Shield, Plus, Edit2, Trash2, Save, X, CheckCircle2,
  Users, Zap, Gift, Coins, Award, Star, TrendingUp, ToggleLeft, ToggleRight, Trophy
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================
// CONSTANTS
// ============================================================

const RARITIES: RarityTier[] = ['common', 'rare', 'epic', 'legendary', 'mythic']
const RARITY_LABELS: Record<RarityTier, string> = {
  common: 'Comum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário', mythic: 'Mítico',
}
const RARITY_COLORS: Record<RarityTier, string> = {
  common: 'text-slate-400', rare: 'text-blue-400', epic: 'text-purple-400',
  legendary: 'text-amber-400', mythic: 'text-rose-400',
}
const REWARD_TYPES: { value: BpRewardType; label: string; icon: any }[] = [
  { value: 'coins', label: 'HiCoins', icon: Coins },
  { value: 'badge', label: 'Medalha', icon: Award },
  { value: 'store_item', label: 'Item da Loja', icon: Star },
  { value: 'custom', label: 'Recompensa Especial', icon: Gift },
]

interface ProgressWithProfile extends BattlePassProgress {
  profile: { full_name: string; position: string | null }
}

// ============================================================
// REWARD FORM MODAL
// ============================================================

function RewardFormModal({
  seasonId, reward, xpPerLevel, onClose, onSaved,
}: {
  seasonId: string
  reward: BattlePassReward | null
  xpPerLevel: number
  onClose: () => void
  onSaved: () => void
}) {
  const [trophies, setTrophies] = useState(reward ? reward.level * xpPerLevel : xpPerLevel)
  const [name, setName] = useState(reward?.name ?? '')
  const [desc, setDesc] = useState(reward?.description ?? '')
  const [icon, setIcon] = useState(reward?.icon ?? '')
  const [rarity, setRarity] = useState<RarityTier>(reward?.rarity ?? 'common')
  const [rewardType, setRewardType] = useState<BpRewardType>(reward?.reward_type ?? 'coins')
  const [rewardValue, setRewardValue] = useState(reward?.reward_value ?? {})
  const [saving, setSaving] = useState(false)

  // Opções para dropdowns
  const [badges, setBadges] = useState<{id: string, name: string}[]>([])
  const [storeItems, setStoreItems] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    supabase.from('badges').select('id, name').order('name').then(({data}) => setBadges(data || []))
    supabase.from('store_items').select('id, name').order('name').then(({data}) => setStoreItems(data || []))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        season_id: seasonId,
        level: Math.max(1, Math.round(trophies / xpPerLevel)),
        name,
        description: desc || null,
        icon: icon || null,
        rarity,
        reward_type: rewardType,
        reward_value: rewardValue,
        is_active: true,
      }

      if (reward) {
        const { error } = await supabase.from('battle_pass_rewards').update(payload).eq('id', reward.id)
        if (error) throw error
        toast.success('Recompensa atualizada!')
      } else {
        const { error } = await supabase.from('battle_pass_rewards').insert(payload)
        if (error) throw error
        toast.success('Recompensa criada!')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const renderValueFields = () => {
    switch (rewardType) {
      case 'coins':
        return (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quantidade de HC</label>
            <input
              type="number" min={1}
              value={(rewardValue as any).amount ?? ''}
              onChange={e => setRewardValue({ amount: Number(e.target.value) })}
              className="input-field w-full" placeholder="Ex: 100"
            />
          </div>
        )
      case 'badge':
        return (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione a Medalha</label>
            <select
              value={(rewardValue as any).badge_id ?? ''}
              onChange={e => setRewardValue({ badge_id: e.target.value })}
              className="input-field w-full"
            >
              <option value="">-- Selecione --</option>
              {badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )
      case 'store_item':
        return (
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione o Item da Loja</label>
            <select
              value={(rewardValue as any).item_id ?? ''}
              onChange={e => setRewardValue({ item_id: e.target.value })}
              className="input-field w-full"
            >
              <option value="">-- Selecione --</option>
              {storeItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        )
      case 'custom':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Título da Recompensa</label>
              <input
                type="text"
                value={(rewardValue as any).title ?? ''}
                onChange={e => setRewardValue({ ...rewardValue, title: e.target.value })}
                className="input-field w-full" placeholder="Ex: Folga Extra"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instruções (o RH será notificado)</label>
              <textarea
                value={(rewardValue as any).description ?? ''}
                onChange={e => setRewardValue({ ...rewardValue, description: e.target.value })}
                className="input-field w-full h-20 resize-none" placeholder="Como essa recompensa funciona..."
              />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-black text-white text-lg">{reward ? 'Editar Recompensa' : 'Nova Recompensa'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Troféus Necessários</label>
              <input type="number" required min={xpPerLevel} step={xpPerLevel} value={trophies} onChange={e => setTrophies(Number(e.target.value))}
                className="input-field w-full font-bold text-amber-400" />
              <p className="text-[10px] text-slate-500 mt-1">Equivale ao Nível {Math.max(1, Math.round(trophies / xpPerLevel))}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ícone (emoji)</label>
              <div className="flex gap-2">
                <input type="text" value={icon} onChange={e => setIcon(e.target.value)}
                  className="input-field w-20 text-center text-xl" placeholder="🎁" />
                <div className="flex-1 flex flex-wrap gap-1 content-start">
                  {['🎁','💎','👑','👕','🌟','💰','🏆','📦','🎫','🪙'].map(emj => (
                    <button key={emj} type="button" onClick={() => setIcon(emj)} className="p-1.5 hover:bg-white/10 rounded text-lg transition-colors">{emj}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome da Recompensa</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)}
              className="input-field w-full" placeholder="Ex: Badge Exclusiva da Temporada" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição (opcional)</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              className="input-field w-full" placeholder="Breve descrição..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Raridade</label>
            <div className="grid grid-cols-5 gap-1">
              {RARITIES.map(r => (
                <button key={r} type="button" onClick={() => setRarity(r)}
                  className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${rarity === r ? `${RARITY_COLORS[r]} border-current bg-current/10` : 'text-slate-500 border-white/5 hover:border-white/10'}`}>
                  {RARITY_LABELS[r].substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Recompensa</label>
            <div className="grid grid-cols-2 gap-2">
              {REWARD_TYPES.map(rt => {
                const Icon = rt.icon
                return (
                  <button key={rt.value} type="button" onClick={() => { setRewardType(rt.value); setRewardValue({}) }}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${rewardType === rt.value ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-white/5 text-slate-400 hover:border-white/10'}`}>
                    <Icon className="w-4 h-4" /> {rt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {renderValueFields()}

          <button type="submit" disabled={saving}
            className="w-full btn-primary py-3 mt-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : reward ? 'Atualizar' : 'Criar Recompensa'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// MAIN ADMIN PAGE
// ============================================================

export default function AdminBattlePass() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'seasons' | 'rewards' | 'progress' | 'give_xp'>('seasons')

  // Season state
  const [seasons, setSeasons] = useState<BattlePassSeason[]>([])
  const [editSeason, setEditSeason] = useState<BattlePassSeason | null>(null)
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [seasonForm, setSeasonForm] = useState({
    name: '', description: '', start_date: '', end_date: '',
    max_level: 50, xp_per_level: 1000,
  })
  const [savingSeason, setSavingSeason] = useState(false)

  // Rewards state
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [rewards, setRewards] = useState<BattlePassReward[]>([])
  const [rewardModal, setRewardModal] = useState<{ open: boolean; reward: BattlePassReward | null }>({ open: false, reward: null })

  // Progress state
  const [progressList, setProgressList] = useState<ProgressWithProfile[]>([])

  // Give XP state
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])
  const [giveEmp, setGiveEmp] = useState('')
  const [giveBpXp, setGiveBpXp] = useState(100)
  const [giveReason, setGiveReason] = useState('')
  const [givingXp, setGivingXp] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [seasonsRes, empsRes] = await Promise.all([
        supabase.from('battle_pass_seasons').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('role', 'employee').eq('is_active', true).order('full_name'),
      ])
      setSeasons((seasonsRes.data ?? []) as BattlePassSeason[])
      setEmployees(empsRes.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRewards = useCallback(async (seasonId: string) => {
    if (!seasonId) return
    const { data } = await supabase.from('battle_pass_rewards').select('*')
      .eq('season_id', seasonId).order('level')
    setRewards((data ?? []) as BattlePassReward[])
  }, [])

  const fetchProgress = useCallback(async (seasonId: string) => {
    if (!seasonId) return
    const { data } = await supabase.from('battle_pass_progress')
      .select('*, profile:profiles(full_name, position)')
      .eq('season_id', seasonId)
      .order('current_level', { ascending: false })
    setProgressList((data ?? []) as ProgressWithProfile[])
  }, [])

  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    if (selectedSeasonId) {
      void fetchRewards(selectedSeasonId)
      void fetchProgress(selectedSeasonId)
    }
  }, [selectedSeasonId, fetchRewards, fetchProgress])

  // Auto seleciona a primeira season ativa
  useEffect(() => {
    const active = seasons.find(s => s.is_active) ?? seasons[0]
    if (active && !selectedSeasonId) setSelectedSeasonId(active.id)
  }, [seasons])

  const openSeasonForm = (s?: BattlePassSeason) => {
    if (s) {
      setEditSeason(s)
      setSeasonForm({
        name: s.name, description: s.description ?? '',
        start_date: s.start_date.slice(0, 10), end_date: s.end_date.slice(0, 10),
        max_level: s.max_level, xp_per_level: s.xp_per_level,
      })
    } else {
      setEditSeason(null)
      setSeasonForm({ name: '', description: '', start_date: '', end_date: '', max_level: 50, xp_per_level: 1000 })
    }
    setShowSeasonForm(true)
  }

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSeason(true)
    try {
      if (editSeason) {
        const { error } = await supabase.from('battle_pass_seasons').update(seasonForm).eq('id', editSeason.id)
        if (error) throw error
        toast.success('Battle Pass atualizado!')
      } else {
        const { error } = await supabase.from('battle_pass_seasons').insert({ ...seasonForm, is_active: false })
        if (error) throw error
        toast.success('Battle Pass criado!')
      }
      setShowSeasonForm(false)
      void fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.')
    } finally {
      setSavingSeason(false)
    }
  }

  const toggleSeasonActive = async (season: BattlePassSeason) => {
    try {
      // Desativa todos, depois ativa o selecionado
      if (!season.is_active) {
        await supabase.from('battle_pass_seasons').update({ is_active: false }).neq('id', season.id)
      }
      await supabase.from('battle_pass_seasons').update({ is_active: !season.is_active }).eq('id', season.id)
      toast.success(season.is_active ? 'Battle Pass desativado.' : 'Battle Pass ativado!')
      void fetchAll()
    } catch (err) {
      toast.error('Erro ao alterar status.')
    }
  }

  const handleDeleteReward = async (id: string) => {
    await supabase.from('battle_pass_rewards').delete().eq('id', id)
    toast.success('Recompensa removida.')
    void fetchRewards(selectedSeasonId)
  }

  const handleGiveBpXp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giveEmp || giveBpXp <= 0) return
    setGivingXp(true)
    try {
      const { data, error } = await supabase.rpc('give_bp_xp', {
        p_employee_id: giveEmp,
        p_bp_xp: giveBpXp,
        p_reason: giveReason || 'Entregue pelo admin',
      })
      if (error) throw error
      if (!data.success) throw new Error(data.reason)

      const msg = data.leveled_up
        ? `✅ +${giveBpXp} Troféus entregues! Colaborador subiu para Nível ${data.new_level}!`
        : `✅ +${giveBpXp} Troféus entregues com sucesso!`
      toast.success(msg, { duration: 5000 })
      setGiveEmp('')
      setGiveBpXp(100)
      setGiveReason('')
      void fetchProgress(selectedSeasonId)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao entregar Troféus.')
    } finally {
      setGivingXp(false)
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId)

  const tabs = [
    { key: 'seasons', label: 'Temporadas', icon: Shield },
    { key: 'rewards', label: 'Recompensas', icon: Gift },
    { key: 'progress', label: 'Progresso', icon: TrendingUp },
    { key: 'give_xp', label: 'Dar Troféus', icon: Trophy },
  ] as const

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="Battle Pass Admin"
        subtitle="Gerencie os passes de batalha, recompensas e o progresso dos colaboradores"
      />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-white/10 pb-4">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all text-sm ${activeTab === tab.key ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: TEMPORADAS ── */}
      {activeTab === 'seasons' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => openSeasonForm()} className="btn-primary">
              <Plus className="w-4 h-4" /> Criar Battle Pass
            </button>
          </div>

          {showSeasonForm && (
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-white text-lg">{editSeason ? 'Editar Battle Pass' : 'Novo Battle Pass'}</h3>
                <button onClick={() => setShowSeasonForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveSeason} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome do Battle Pass</label>
                  <input required type="text" value={seasonForm.name} onChange={e => setSeasonForm(p => ({ ...p, name: e.target.value }))}
                    className="input-field w-full" placeholder="Ex: Battle Pass — Junho 2026" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição</label>
                  <input type="text" value={seasonForm.description} onChange={e => setSeasonForm(p => ({ ...p, description: e.target.value }))}
                    className="input-field w-full" placeholder="Descrição opcional..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data de Início</label>
                  <input required type="date" value={seasonForm.start_date} onChange={e => setSeasonForm(p => ({ ...p, start_date: e.target.value }))}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data de Fim</label>
                  <input required type="date" value={seasonForm.end_date} onChange={e => setSeasonForm(p => ({ ...p, end_date: e.target.value }))}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Níveis Máximos</label>
                  <input required type="number" min={1} max={100} value={seasonForm.max_level} onChange={e => setSeasonForm(p => ({ ...p, max_level: Number(e.target.value) }))}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Troféus por Nível</label>
                  <input required type="number" min={1} value={seasonForm.xp_per_level} onChange={e => setSeasonForm(p => ({ ...p, xp_per_level: Number(e.target.value) }))}
                    className="input-field w-full" />
                </div>
                <div className="sm:col-span-2">
                  <button disabled={savingSeason} type="submit" className="btn-primary w-full py-3">
                    <Save className="w-4 h-4" />
                    {savingSeason ? 'Salvando...' : editSeason ? 'Salvar Alterações' : 'Criar Battle Pass'}
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          <div className="space-y-3">
            {seasons.length === 0 ? (
              <GlassCard className="p-12 text-center text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                Nenhum Battle Pass criado ainda.
              </GlassCard>
            ) : seasons.map(s => (
              <GlassCard key={s.id} className={`p-5 flex items-center gap-4 ${s.is_active ? 'border-purple-500/30 bg-purple-900/10' : ''}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.is_active ? 'bg-gradient-to-br from-purple-500 to-blue-500 shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-slate-800'}`}>
                  <Shield className={`w-6 h-6 ${s.is_active ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white truncate">{s.name}</h3>
                    {s.is_active && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white px-2 py-0.5 rounded-full">ATIVO</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.max_level} níveis · {s.xp_per_level} Troféus/nível ·{' '}
                    {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleSeasonActive(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${s.is_active ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                    {s.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {s.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => { openSeasonForm(s) }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: RECOMPENSAS ── */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Battle Pass</label>
              <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)} className="input-field">
                <option value="">-- Selecione --</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedSeasonId && (
              <button onClick={() => setRewardModal({ open: true, reward: null })} className="btn-primary mt-4 sm:mt-0">
                <Plus className="w-4 h-4" /> Adicionar Recompensa
              </button>
            )}
          </div>

          {rewardModal.open && (
            <RewardFormModal
              seasonId={selectedSeasonId}
              reward={rewardModal.reward}
              xpPerLevel={selectedSeason?.xp_per_level || 1000}
              onClose={() => setRewardModal({ open: false, reward: null })}
              onSaved={() => fetchRewards(selectedSeasonId)}
            />
          )}

          {!selectedSeasonId ? (
            <GlassCard className="p-12 text-center text-slate-500">Selecione um Battle Pass para ver suas recompensas.</GlassCard>
          ) : rewards.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-500">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Nenhuma recompensa configurada. Clique em "Adicionar Recompensa".
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.map(r => {
                const rarityColors: Record<RarityTier, string> = {
                  common: 'border-slate-500/20 bg-slate-800/30',
                  rare: 'border-blue-500/30 bg-blue-900/10',
                  epic: 'border-purple-500/30 bg-purple-900/10',
                  legendary: 'border-amber-500/40 bg-amber-900/10',
                  mythic: 'border-rose-500/40 bg-rose-900/10',
                }
                return (
                  <div key={r.id} className={`p-4 rounded-2xl border ${rarityColors[r.rarity]} flex items-center gap-3`}>
                    <div className="text-3xl w-10 text-center flex-shrink-0">{r.icon || '🎁'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">Nv.{r.level}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${RARITY_COLORS[r.rarity]}`}>{RARITY_LABELS[r.rarity]}</span>
                      </div>
                      <p className="font-bold text-white text-sm mt-0.5 truncate">{r.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{REWARD_TYPES.find(rt => rt.value === r.reward_type)?.label}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => setRewardModal({ open: true, reward: r })}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteReward(r.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PROGRESSO ── */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Battle Pass</label>
            <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)} className="input-field">
              <option value="">-- Selecione --</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {progressList.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Nenhum colaborador com progresso neste Battle Pass ainda.
            </GlassCard>
          ) : (
            <GlassCard className="p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider p-4">Colaborador</th>
                    <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider p-4">Nível</th>
                    <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider p-4">XP Atual</th>
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider p-4 hidden sm:table-cell">Progresso</th>
                    <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider p-4">Total de Troféus</th>
                  </tr>
                </thead>
                <tbody>
                  {progressList.map((p, i) => {
                    const pct = selectedSeason ? Math.min(100, (p.current_xp / selectedSeason.xp_per_level) * 100) : 0
                    return (
                      <tr key={p.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${i === 0 ? 'bg-purple-900/10' : ''}`}>
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">{p.profile.full_name}</p>
                          <p className="text-xs text-slate-500">{p.profile.position}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-lg font-black text-purple-400">{p.current_level}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm font-bold text-slate-300">{p.current_xp.toLocaleString()}</span>
                          <span className="text-xs text-slate-500"> / {selectedSeason?.xp_per_level.toLocaleString()}</span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-32">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-purple-300">{p.total_bp_xp.toLocaleString()}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </GlassCard>
          )}
        </div>
      )}

      {/* ── TAB: DAR TROFÉUS ── */}
      {activeTab === 'give_xp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6 border-purple-500/20">
            <h3 className="font-black text-white text-lg mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Entregar Troféus Manualmente
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Use este painel para dar Troféus a um colaborador. Normalmente isso acontece via conclusão de missões, mas você pode fazer manualmente para eventos especiais, treinamentos, etc.
            </p>
            <form onSubmit={handleGiveBpXp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Colaborador</label>
                <select required value={giveEmp} onChange={e => setGiveEmp(e.target.value)} className="input-field w-full">
                  <option value="">-- Selecione --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Quantidade de Troféus</label>
                <input required type="number" min={1} value={giveBpXp} onChange={e => setGiveBpXp(Number(e.target.value))}
                  className="input-field w-full text-lg font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Motivo (opcional)</label>
                <input type="text" value={giveReason} onChange={e => setGiveReason(e.target.value)}
                  className="input-field w-full" placeholder="Ex: Treinamento concluído, Evento especial..." />
              </div>
              <button type="submit" disabled={givingXp}
                className="w-full py-3 font-black text-white rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                {givingXp ? 'Entregando...' : `Entregar +${giveBpXp} Troféus`}
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-black text-white text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Como Funciona
            </h3>
            <div className="space-y-3">
              {[
                { icon: '🎯', title: 'Missões', desc: 'Ao aprovar missões, Troféus são entregues automaticamente se a missão tiver recompensa configurada.' },
                { icon: '⭐', title: 'KPIs Ouro', desc: 'KPIs tier Ouro podem dar Troféus bônus (configurável nas missões).' },
                { icon: '📦', title: 'Cosméticos', desc: 'Troféus desbloqueiam as recompensas do Caminho do Passe.' },
                { icon: '📚', title: 'Treinamentos', desc: 'Ao confirmar um treinamento concluído, use este painel para dar os Troféus correspondentes.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
