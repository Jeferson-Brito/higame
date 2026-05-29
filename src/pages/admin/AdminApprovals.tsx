import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard } from '@/components/ui/index'
import { ShieldCheck, Check, X, FileText, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface PendingApproval {
  id: string
  proof_url: string
  created_at: string
  quest: {
    id: string
    name: string
    xp_reward: number
    coin_reward: number
    bp_xp_reward: number
    target_value: number
  }
  employee: {
    id: string
    full_name: string
  }
}

export default function AdminApprovals() {
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employee_quests')
        .select(`
          id, proof_url, created_at,
          quest:quests(id, name, xp_reward, coin_reward, bp_xp_reward, target_value),
          employee:profiles(id, full_name)
        `)
        .eq('validation_status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Handle arrays correctly for TS
      const mapped = (data ?? []).map((item: any) => ({
        ...item,
        quest: Array.isArray(item.quest) ? item.quest[0] : item.quest,
        employee: Array.isArray(item.employee) ? item.employee[0] : item.employee
      })) as PendingApproval[]

      setApprovals(mapped)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar aprovações pendentes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchApprovals()
  }, [fetchApprovals])

  const handleApprove = async (approval: PendingApproval) => {
    setProcessingId(approval.id)
    try {
      const eqId = approval.id
      const empId = approval.employee.id
      const quest = approval.quest

      // 1. Atualiza status na employee_quest
      const { error: updError } = await supabase
        .from('employee_quests')
        .update({ 
          progress: quest.target_value, 
          completed: true,
          completed_at: new Date().toISOString(),
          validation_status: 'approved'
        })
        .eq('id', eqId)

      if (updError) throw updError

      // 2. Dar moedas
      if (quest.coin_reward > 0) {
        const { data: prof } = await supabase.from('profiles').select('coins_balance').eq('id', empId).single()
        if (prof) {
          await supabase.from('profiles').update({ coins_balance: prof.coins_balance + quest.coin_reward }).eq('id', empId)
        }
      }

      // 3. Dar XP no ranking ativo
      if (quest.xp_reward > 0) {
        const { data: season } = await supabase.from('seasons').select('id').eq('status', 'active').single()
        if (season) {
          const { data: rank } = await supabase.from('rankings').select('total_xp').eq('employee_id', empId).eq('season_id', season.id).single()
          if (rank) {
            await supabase.from('rankings').update({ total_xp: rank.total_xp + quest.xp_reward }).eq('employee_id', empId).eq('season_id', season.id)
          }
        }
      }

      // 4. Entregar BP XP
      if (quest.bp_xp_reward > 0) {
        await supabase.rpc('give_bp_xp', {
          p_employee_id: empId,
          p_bp_xp: quest.bp_xp_reward,
          p_reason: `Missão concluída: ${quest.name}`,
        })
      }

      toast.success(`Comprovante de ${approval.employee.full_name} aprovado!`)
      setApprovals(prev => prev.filter(a => a.id !== approval.id))
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao aprovar comprovante.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (approval: PendingApproval) => {
    setProcessingId(approval.id)
    try {
      const { error } = await supabase
        .from('employee_quests')
        .update({ validation_status: 'rejected' })
        .eq('id', approval.id)

      if (error) throw error

      toast.success(`Comprovante recusado.`)
      setApprovals(prev => prev.filter(a => a.id !== approval.id))
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao recusar comprovante.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Aprovações Pendentes" 
        subtitle="Analise comprovantes de missões e cursos enviados pelos colaboradores."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-higame-purple border-t-transparent animate-spin" />
        </div>
      ) : approvals.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400 border-dashed border-white/10">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-outfit text-white mb-2">Tudo limpo!</h3>
          <p>Não há comprovantes pendentes de análise no momento.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.map(approval => (
            <GlassCard key={approval.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-outfit font-bold text-white text-lg">{approval.quest.name}</h3>
                    <p className="text-sm text-slate-400">Enviado por: <span className="text-white font-bold">{approval.employee.full_name}</span></p>
                  </div>
                  <div className="bg-higame-purple/20 text-higame-purple p-2 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {approval.quest.xp_reward > 0 && <span className="text-xs font-bold text-higame-purple bg-higame-purple/20 px-2 py-1 rounded-md">+{approval.quest.xp_reward} XP</span>}
                  {approval.quest.coin_reward > 0 && <span className="text-xs font-bold text-amber-400 bg-amber-400/20 px-2 py-1 rounded-md">+{approval.quest.coin_reward} HC</span>}
                  {approval.quest.bp_xp_reward > 0 && <span className="text-xs font-bold text-purple-400 bg-purple-400/20 px-2 py-1 rounded-md">+{approval.quest.bp_xp_reward} BP XP</span>}
                </div>
              </div>

              <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                <a 
                  href={approval.proof_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-bold"
                >
                  <ExternalLink className="w-4 h-4" /> Visualizar Comprovante
                </a>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(approval)}
                    disabled={processingId === approval.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg transition-colors text-sm font-bold disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Recusar
                  </button>
                  <button
                    onClick={() => handleApprove(approval)}
                    disabled={processingId === approval.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-higame-success/20 text-higame-success hover:bg-higame-success/30 rounded-lg transition-colors text-sm font-bold disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Aprovar
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
