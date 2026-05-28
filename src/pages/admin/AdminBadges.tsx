import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { Trophy, Plus, CheckCircle2, Award, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  xp_reward: number
  coin_reward: number
  is_active: boolean
}

const EMOJI_LIBRARY = [
  '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '🎯',
  '⚔️', '🛡️', '🏹', '🔱', '🪓', '⚒️', '💣', '🔥', 
  '⚡', '🌟', '✨', '💥', '💫', '❄️', '🌪️', '🌊',
  '🔮', '🧪', '🩸', '💀', '👻', '🐉', '🦅', '🐺',
  '💎', '🪙', '💰', '🗝️', '📜', '🗺️', '🧭', '🎭',
  '🚀', '🛸', '🎮', '🎲', '🧩', '👁️', '💠', '⛩️'
]

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-slate-700 text-slate-300 border-slate-500',
  rare: 'bg-blue-900/50 text-blue-400 border-blue-500 shadow-glow-neon',
  epic: 'bg-purple-900/50 text-purple-400 border-purple-500 shadow-glow-purple',
  legendary: 'bg-amber-900/50 text-amber-400 border-amber-500 shadow-glow-gold',
  mythic: 'bg-red-900/50 text-red-400 border-red-500 shadow-glow-red',
}

export default function AdminBadges() {
  const [loading, setLoading] = useState(true)
  const [badges, setBadges] = useState<Badge[]>([])
  const [employees, setEmployees] = useState<{ id: string, full_name: string }[]>([])
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'create' | 'approve'>('create')

  // Create/Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🏆')
  const [rarity, setRarity] = useState<'common'|'rare'|'epic'|'legendary'|'mythic'>('common')
  const [xp, setXp] = useState(100)
  const [coins, setCoins] = useState(50)
  const [creating, setCreating] = useState(false)

  // Approve Form State
  const [selectedEmp, setSelectedEmp] = useState('')
  const [selectedBadge, setSelectedBadge] = useState('')
  const [approving, setApproving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [badgesData, empsData] = await Promise.all([
        supabase.from('badges').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('role', 'employee').eq('is_active', true)
      ])
      
      setBadges(badgesData.data as Badge[] ?? [])
      setEmployees(empsData.data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSaveBadge = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = { name, description, icon: selectedIcon, rarity, xp_reward: xp, coin_reward: coins }

      if (editingId) {
        const { error } = await supabase.from('badges').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Medalha atualizada com sucesso!')
      } else {
        const { error } = await supabase.from('badges').insert(payload)
        if (error) throw error
        toast.success('Medalha criada com sucesso!')
      }

      resetForm()
      void fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar medalha.')
    } finally {
      setCreating(false)
    }
  }

  const startEditing = (badge: Badge) => {
    setActiveTab('create')
    setEditingId(badge.id)
    setName(badge.name)
    setDescription(badge.description)
    setSelectedIcon(badge.icon)
    setRarity(badge.rarity)
    setXp(badge.xp_reward)
    setCoins(badge.coin_reward)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setSelectedIcon('🏆')
    setRarity('common')
    setXp(100)
    setCoins(50)
  }

  const handleGrantBadge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmp || !selectedBadge) return toast.error('Selecione colaborador e medalha')
    
    setApproving(true)
    try {
      const badgeDef = badges.find(b => b.id === selectedBadge)
      if (!badgeDef) throw new Error('Badge not found')

      const { error: insertError } = await supabase
        .from('employee_badges')
        .insert({ employee_id: selectedEmp, badge_id: selectedBadge })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('O colaborador já possui esta medalha!')
        }
        throw insertError
      }

      const { data: prof } = await supabase.from('profiles').select('coins_balance').eq('id', selectedEmp).single()
      if (prof) {
        await supabase.from('profiles').update({ coins_balance: prof.coins_balance + badgeDef.coin_reward }).eq('id', selectedEmp)
      }

      const { data: season } = await supabase.from('seasons').select('id').eq('status', 'active').single()
      if (season) {
        const { data: rank } = await supabase.from('rankings').select('total_xp').eq('employee_id', selectedEmp).eq('season_id', season.id).single()
        if (rank) {
          await supabase.from('rankings').update({ total_xp: rank.total_xp + badgeDef.xp_reward }).eq('employee_id', selectedEmp).eq('season_id', season.id)
        }
      }

      toast.success('Medalha concedida com sucesso!')
      setSelectedEmp('')
      setSelectedBadge('')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao conceder medalha.')
    } finally {
      setApproving(false)
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Estúdio de Medalhas" 
        subtitle="Crie conquistas épicas e distribua para os colaboradores"
      />

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => { setActiveTab('create'); resetForm(); }}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-amber-500 text-slate-900 shadow-glow-gold' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Plus className="w-5 h-5" /> {editingId ? 'Editar Medalha' : 'Criar Medalha'}
        </button>
        <button 
          onClick={() => setActiveTab('approve')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'approve' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Award className="w-5 h-5" /> Conceder a Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Painel Esquerdo baseado na Tab */}
        {activeTab === 'create' ? (
          <GlassCard className="p-6 relative">
            {editingId && (
              <button 
                onClick={resetForm} 
                className="absolute top-6 right-6 text-slate-400 hover:text-white flex items-center gap-1 text-sm bg-slate-800 px-3 py-1.5 rounded-lg"
              >
                <X className="w-4 h-4" /> Cancelar Edição
              </button>
            )}

            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              {editingId ? (
                <><Edit2 className="w-5 h-5 text-amber-400" /> Editando Medalha</>
              ) : (
                <><Trophy className="w-5 h-5 text-amber-400" /> Nova Medalha</>
              )}
            </h2>

            <form onSubmit={handleSaveBadge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Escolha um Ícone</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-xl border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                  {EMOJI_LIBRARY.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedIcon(emoji)}
                      className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-all ${selectedIcon === emoji ? 'bg-amber-500/20 border-2 border-amber-500 scale-110 shadow-glow-gold' : 'hover:bg-white/10 border-2 border-transparent'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Nome da Medalha</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="input-field w-full" placeholder="Ex: Mestre de TME" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">3. Regra / Descrição</label>
                <input required value={description} onChange={e => setDescription(e.target.value)} className="input-field w-full" placeholder="Ex: Bata a meta 3 vezes seguidas" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">4. Raridade (Cor & Brilho)</label>
                <select value={rarity} onChange={e => setRarity(e.target.value as any)} className="input-field w-full capitalize">
                  <option value="common">Comum (Cinza)</option>
                  <option value="rare">Raro (Azul)</option>
                  <option value="epic">Épico (Roxo)</option>
                  <option value="legendary">Lendário (Dourado)</option>
                  <option value="mythic">Mítico (Vermelho)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-higame-purple uppercase tracking-wider mb-2">XP Recompensa</label>
                  <input type="number" required value={xp} onChange={e => setXp(Number(e.target.value))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">HiCoins (HC)</label>
                  <input type="number" required value={coins} onChange={e => setCoins(Number(e.target.value))} className="input-field w-full" />
                </div>
              </div>

              <button disabled={creating} type="submit" className="w-full py-3 mt-4 flex justify-center items-center gap-2 bg-amber-500 text-slate-900 font-bold rounded-xl hover:scale-105 transition-transform shadow-glow-gold">
                {creating ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Medalha no Catálogo')}
              </button>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 border-higame-purple/30">
            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-higame-purple" /> Conceder Manualmente
            </h2>
            <p className="text-sm text-slate-400 mb-6">Selecione o colaborador que cumpriu os requisitos para enviar a medalha para a conta dele.</p>
            
            <form onSubmit={handleGrantBadge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Colaborador Vencedor</label>
                <select required value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="input-field w-full">
                  <option value="">-- Escolha --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Qual Medalha?</label>
                <select required value={selectedBadge} onChange={e => setSelectedBadge(e.target.value)} className="input-field w-full">
                  <option value="">-- Escolha --</option>
                  {badges.filter(b => b.is_active).map(b => (
                    <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                  ))}
                </select>
              </div>

              <button disabled={approving} type="submit" className="w-full btn-primary py-3 mt-4 flex justify-center items-center gap-2">
                {approving ? 'Enviando...' : 'Entregar Medalha e Recompensas'}
              </button>
            </form>
          </GlassCard>
        )}

        {/* Painel Direito (Prévia / Vitrine) */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-outfit font-bold text-white mb-6">Catálogo de Medalhas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {badges.length === 0 ? (
              <p className="text-sm text-slate-500 col-span-full">Nenhuma medalha criada ainda.</p>
            ) : (
              badges.map(b => (
                <div key={b.id} className={`relative flex flex-col items-center text-center p-4 rounded-xl border ${RARITY_COLORS[b.rarity]} bg-opacity-10 group`}>
                  
                  {/* Botão de Editar visível apenas no hover */}
                  <button 
                    onClick={() => startEditing(b)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-slate-900 border border-white/20 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:text-amber-400 hover:border-amber-400/50"
                    title="Editar Medalha"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-4xl mb-2 filter drop-shadow-md">{b.icon}</div>
                  <h3 className="font-outfit font-bold text-white text-xs px-2 leading-tight">{b.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] font-bold text-higame-purple">+{b.xp_reward} XP</span>
                    <span className="text-[9px] font-bold text-amber-400">+{b.coin_reward} HC</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  )
}
