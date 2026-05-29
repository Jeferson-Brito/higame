import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { Target, Plus, CheckCircle2, Users, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ui/index'

interface Quest {
  id: string
  name: string
  description: string
  frequency: string
  xp_reward: number
  coin_reward: number
  bp_xp_reward: number
  target_value: number
  is_active: boolean
  requires_proof: boolean
}

export default function AdminQuests() {
  const [loading, setLoading] = useState(true)
  const [quests, setQuests] = useState<Quest[]>([])
  const [employees, setEmployees] = useState<{ id: string, full_name: string }[]>([])
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'create' | 'approve'>('create')

  // Create Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [xp, setXp] = useState(50)
  const [coins, setCoins] = useState(10)
  const [bpXp, setBpXp] = useState(0)
  const [target, setTarget] = useState(1)
  const [frequency, setFrequency] = useState('daily')
  const [requiresProof, setRequiresProof] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Quest | null>(null)

  // Approve Form State
  const [selectedEmp, setSelectedEmp] = useState('')
  const [selectedQuest, setSelectedQuest] = useState('')
  const [approving, setApproving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [questsData, empsData] = await Promise.all([
        supabase.from('quests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('role', 'employee').eq('is_active', true)
      ])
      
      setQuests(questsData.data as Quest[] ?? [])
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

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setXp(50)
    setCoins(10)
    setBpXp(0)
    setTarget(1)
    setFrequency('daily')
    setRequiresProof(false)
  }

  const startEditing = (quest: Quest) => {
    setActiveTab('create')
    setEditingId(quest.id)
    setName(quest.name)
    setDescription(quest.description || '')
    setXp(quest.xp_reward)
    setCoins(quest.coin_reward)
    setBpXp(quest.bp_xp_reward ?? 0)
    setTarget(quest.target_value)
    setFrequency(quest.frequency)
    setRequiresProof(quest.requires_proof || false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteQuest = async (quest: Quest) => {
    try {
      const { error } = await supabase.from('quests').delete().eq('id', quest.id)
      if (error) throw error
      toast.success('Missão excluída com sucesso!')
      setConfirmDelete(null)
      void fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir missão.')
    }
  }

  const handleCreateAndDistribute = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      if (editingId) {
        // Atualiza a missão existente
        const { error: updError } = await supabase
          .from('quests')
          .update({ name, description, xp_reward: xp, coin_reward: coins, bp_xp_reward: bpXp, target_value: target, frequency, requires_proof: requiresProof })
          .eq('id', editingId)
        
        if (updError) throw updError
        toast.success('Missão atualizada!')
      } else {
        // 1. Cria a Quest
        const { data: newQuest, error: questError } = await supabase
          .from('quests')
          .insert({ name, description, xp_reward: xp, coin_reward: coins, bp_xp_reward: bpXp, target_value: target, frequency, requires_proof: requiresProof })
          .select()
          .single()

        if (questError) throw questError

        // 2. Distribui para todos os colaboradores ativos
        const employeeQuests = employees.map(emp => ({
          employee_id: emp.id,
          quest_id: newQuest.id,
          progress: 0,
          completed: false,
          validation_status: 'none'
        }))

        if (employeeQuests.length > 0) {
          const { error: eqError } = await supabase.from('employee_quests').insert(employeeQuests)
          if (eqError) throw eqError
        }

        toast.success('Missão criada e distribuída para todos!')
      }

      resetForm()
      void fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar missão.')
    } finally {
      setCreating(false)
    }
  }

  const handleCompleteQuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmp || !selectedQuest) return toast.error('Selecione colaborador e missão')
    
    setApproving(true)
    try {
      // Pega a quest definition pra saber target
      const questDef = quests.find(q => q.id === selectedQuest)
      if (!questDef) throw new Error('Quest not found')

      // Atualiza employee_quest para completed = true e progress = target
      const { error: updError } = await supabase
        .from('employee_quests')
        .update({ 
          progress: questDef.target_value, 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('employee_id', selectedEmp)
        .eq('quest_id', selectedQuest)

      if (updError) throw updError

      // Idealmente aqui rodaríamos uma RPC (Stored Procedure) para dar o XP e Coins de forma segura no DB.
      // Como estamos no MVP Frontend, faremos as 3 chamadas separadas.
      
      // 1. Pegar saldo atual e dar moedas
      const { data: prof } = await supabase.from('profiles').select('coins_balance').eq('id', selectedEmp).single()
      if (prof) {
        await supabase.from('profiles').update({ coins_balance: prof.coins_balance + questDef.coin_reward }).eq('id', selectedEmp)
      }

      // 2. Dar XP no ranking da temporada atual
      const { data: season } = await supabase.from('seasons').select('id').eq('status', 'active').single()
      if (season) {
        const { data: rank } = await supabase.from('rankings').select('total_xp').eq('employee_id', selectedEmp).eq('season_id', season.id).single()
        if (rank) {
          await supabase.from('rankings').update({ total_xp: rank.total_xp + questDef.xp_reward }).eq('employee_id', selectedEmp).eq('season_id', season.id)
        }
      }

      // 3. Entregar BP XP (se a quest tiver bp_xp_reward > 0)
      if (questDef.bp_xp_reward > 0) {
        await supabase.rpc('give_bp_xp', {
          p_employee_id: selectedEmp,
          p_bp_xp: questDef.bp_xp_reward,
          p_reason: `Missão concluída: ${questDef.name}`,
        })
      }

      // 4. Notificar o usuário
      await supabase.from('notifications').insert({
        profile_id: selectedEmp,
        title: 'Missão Concluída! 🎯',
        message: `Você completou a missão "${questDef.name}" e ganhou ${questDef.xp_reward} XP e ${questDef.coin_reward} HC!`,
        type: 'quest_completed'
      })

      // 4. Feed social
      await supabase.from('feed_events').insert({
        profile_id: selectedEmp,
        event_type: 'quest_completed',
        event_data: { quest_name: questDef.name, xp_reward: questDef.xp_reward }
      })

      toast.success('Missão concluída com sucesso! XP e Moedas entregues.')
      setSelectedEmp('')
      setSelectedQuest('')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao aprovar missão.')
    } finally {
      setApproving(false)
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Gestão de Missões" 
        subtitle="Crie tarefas gamificadas e aprove conclusões para dar XP e Moedas"
      />

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Target className="w-5 h-5" /> Criar Missão
        </button>
        <button 
          onClick={() => setActiveTab('approve')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'approve' ? 'bg-higame-success text-slate-900 shadow-glow-green' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <CheckCircle2 className="w-5 h-5" /> Aprovar Conclusões
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
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-higame-purple" /> {editingId ? 'Editar Missão' : 'Nova Missão Global'}
            </h2>
            <form onSubmit={handleCreateAndDistribute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Título da Missão</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="input-field w-full" placeholder="Ex: Bater meta de TME de Hoje" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição (Como fazer?)</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} className="input-field w-full h-24 resize-none" placeholder="O que o colaborador precisa fazer..." />
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

              <div>
                <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">⚔️ BP XP (Battle Pass)</label>
                <p className="text-[10px] text-slate-500 mb-2">XP exclusivo para progressão no Battle Pass. 0 = não concede BP XP.</p>
                <input type="number" min={0} value={bpXp} onChange={e => setBpXp(Number(e.target.value))} className="input-field w-full" placeholder="Ex: 40" />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="requires_proof"
                  checked={requiresProof}
                  onChange={e => setRequiresProof(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-slate-800 text-higame-purple focus:ring-higame-purple focus:ring-offset-slate-900"
                />
                <label htmlFor="requires_proof" className="flex flex-col cursor-pointer">
                  <span className="text-sm font-bold text-white">Exige anexo de comprovante</span>
                  <span className="text-xs text-slate-500">O colaborador deverá anexar um arquivo (PDF/Imagem) para validação.</span>
                </label>
              </div>

              <button disabled={creating} type="submit" className="w-full btn-primary py-3 mt-4 flex justify-center items-center gap-2">
                {creating ? 'Salvando...' : editingId ? 'Salvar Alterações' : <><Users className="w-5 h-5" /> Publicar para {employees.length} Colaboradores</>}
              </button>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 border-higame-success/30">
            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-higame-success" /> Aprovar Manualmente
            </h2>
            <p className="text-sm text-slate-400 mb-6">Como o sistema ainda não tem integração via API, selecione quem bateu a meta para entregar as recompensas.</p>
            
            <form onSubmit={handleCompleteQuest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Selecione o Colaborador</label>
                <select required value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="input-field w-full">
                  <option value="">-- Escolha --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Selecione a Missão Cumprida</label>
                <select required value={selectedQuest} onChange={e => setSelectedQuest(e.target.value)} className="input-field w-full">
                  <option value="">-- Escolha --</option>
                  {quests.filter(q => q.is_active).map(q => (
                    <option key={q.id} value={q.id}>{q.name} (+{q.xp_reward} XP, +{q.coin_reward} HC)</option>
                  ))}
                </select>
              </div>

              <button disabled={approving} type="submit" className="w-full py-3 mt-4 flex justify-center items-center gap-2 bg-higame-success text-slate-950 font-bold rounded-xl hover:scale-105 transition-transform shadow-glow-green">
                {approving ? 'Aprovando...' : 'Completar Missão e Pagar'}
              </button>
            </form>
          </GlassCard>
        )}

        {/* Painel Direito (Histórico) */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-outfit font-bold text-white mb-6">Missões Ativas</h2>
          <div className="space-y-3">
            {quests.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma missão criada ainda.</p>
            ) : (
              quests.map(q => (
                <div key={q.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-outfit font-bold text-white text-sm truncate">{q.name}</h3>
                    <p className="text-xs font-inter text-slate-400 mt-1 truncate max-w-[200px]">{q.description}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="block text-[10px] font-bold text-higame-purple bg-higame-purple/10 px-2 py-0.5 rounded mb-1">+{q.xp_reward} XP</span>
                      <span className="block text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">+{q.coin_reward} HC</span>
                    </div>
                    <div className="flex flex-col gap-1 border-l border-white/10 pl-3">
                      <button onClick={() => startEditing(q)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(q)} className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-500/20 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Excluir Missão?"
        description={`Tem certeza que deseja excluir permanentemente a missão "${confirmDelete?.name}"? Isso a removerá do sistema e do histórico dos jogadores.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => confirmDelete && handleDeleteQuest(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
