import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { Coins, Plus, Minus, History, Search, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/lib/utils'

interface Employee {
  id: string
  full_name: string
  position: string | null
  avatar_url: string | null
  coins_balance: number
}

interface Transaction {
  id: string
  profile_id: string
  amount: number
  reason: string
  reference_type: string | null
  created_at: string
  profile: { full_name: string } | null
  admin: { full_name: string } | null
}

export default function AdminCoins() {
  const { profile: adminProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add')

  // Formulário
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [amount, setAmount] = useState(100)
  const [operation, setOperation] = useState<'add' | 'remove'>('add')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [empsRes, txRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, position, avatar_url, coins_balance').eq('is_active', true).order('full_name'),
        supabase.from('coin_transactions')
          .select('*, profile:profiles!coin_transactions_profile_id_fkey(full_name), admin:profiles!coin_transactions_admin_id_fkey(full_name)')
          .order('created_at', { ascending: false })
          .limit(100)
      ])
      setEmployees((empsRes.data ?? []) as Employee[])

      const mappedTx = (txRes.data ?? []).map((t: any) => ({
        ...t,
        profile: Array.isArray(t.profile) ? t.profile[0] : t.profile,
        admin: Array.isArray(t.admin) ? t.admin[0] : t.admin,
      }))
      setTransactions(mappedTx as Transaction[])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const handleGiveCoins = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee || !adminProfile) return
    if (!reason.trim()) { toast.error('Informe o motivo.'); return }
    if (amount <= 0) { toast.error('Valor deve ser maior que 0.'); return }

    const delta = operation === 'add' ? amount : -amount

    // Verificar se tem saldo suficiente para remover
    if (operation === 'remove' && selectedEmployee.coins_balance < amount) {
      toast.error(`${selectedEmployee.full_name} tem apenas ${selectedEmployee.coins_balance} HC.`)
      return
    }

    setSaving(true)
    try {
      // 1. Registrar transação no histórico
      const { error: txError } = await supabase.from('coin_transactions').insert({
        profile_id: selectedEmployee.id,
        admin_id: adminProfile.id,
        amount: delta,
        reason: reason.trim(),
        reference_type: 'manual',
      })
      if (txError) throw txError

      // 2. Atualizar saldo do colaborador
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins_balance: selectedEmployee.coins_balance + delta })
        .eq('id', selectedEmployee.id)
      if (updateError) throw updateError

      // 3. Notificação para o colaborador
      await supabase.from('notifications').insert({
        profile_id: selectedEmployee.id,
        title: delta > 0 ? `+${delta} HiCoins recebidos!` : `${delta} HiCoins removidos`,
        message: `${delta > 0 ? 'Você ganhou' : 'Foram removidos'} ${Math.abs(delta)} HC. Motivo: ${reason}`,
        type: delta > 0 ? 'coins_received' : 'coins_removed',
      })

      toast.success(`${delta > 0 ? '+' : ''}${delta} HC aplicado a ${selectedEmployee.full_name}!`)
      setReason('')
      setAmount(100)
      setSelectedEmployee(null)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao aplicar HC.')
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader
        title="Gestão de HiCoins"
        subtitle="Adicione ou remova HC de colaboradores com histórico completo"
      />

      {/* Abas */}
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'add' ? 'bg-amber-500 text-slate-900 shadow-glow-gold' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Coins className="w-5 h-5" /> Aplicar HC
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <History className="w-5 h-5" /> Histórico ({transactions.length})
        </button>
      </div>

      {activeTab === 'add' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Colaboradores */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-outfit font-bold text-white">Selecione o Colaborador</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" placeholder="Buscar..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field pl-9 w-44 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredEmployees.map(emp => (
                <motion.button
                  key={emp.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedEmployee?.id === emp.id ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-slate-900/50 border border-white/5 hover:border-white/10'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-higame flex items-center justify-center font-bold text-white text-sm flex-shrink-0 overflow-hidden">
                    {emp.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover" /> : getInitials(emp.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{emp.full_name}</p>
                    <p className="text-xs text-slate-500">{emp.position ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-sm flex-shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                    {emp.coins_balance.toLocaleString()}
                  </div>
                  {selectedEmployee?.id === emp.id && (
                    <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                </motion.button>
              ))}
            </div>
          </GlassCard>

          {/* Formulário de HC */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              {selectedEmployee ? `HC para ${selectedEmployee.full_name.split(' ')[0]}` : 'Configure a operação'}
            </h2>

            {!selectedEmployee ? (
              <div className="text-center py-12 text-slate-500">
                <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Selecione um colaborador à esquerda para aplicar HC.</p>
              </div>
            ) : (
              <form onSubmit={handleGiveCoins} className="space-y-5">
                {/* Saldo atual */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-slate-300">Saldo atual</span>
                  <span className="font-outfit font-black text-amber-400 text-xl">
                    {selectedEmployee.coins_balance.toLocaleString()} HC
                  </span>
                </div>

                {/* Tipo de operação */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operação</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setOperation('add')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${operation === 'add' ? 'bg-higame-success/20 border-2 border-higame-success text-higame-success' : 'bg-slate-800 border-2 border-transparent text-slate-400'}`}
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperation('remove')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${operation === 'remove' ? 'bg-red-500/20 border-2 border-red-500 text-red-400' : 'bg-slate-800 border-2 border-transparent text-slate-400'}`}
                    >
                      <Minus className="w-4 h-4" /> Remover
                    </button>
                  </div>
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor em HC</label>
                  <div className="flex gap-2 mb-2">
                    {[50, 100, 250, 500, 1000].map(v => (
                      <button
                        key={v} type="button"
                        onClick={() => setAmount(v)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${amount === v ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number" min="1" required
                    value={amount}
                    onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
                    className="input-field w-full"
                    placeholder="Valor personalizado..."
                  />
                </div>

                {/* Preview do novo saldo */}
                <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Novo saldo</span>
                  <span className={`font-bold text-sm ${operation === 'add' ? 'text-higame-success' : 'text-red-400'}`}>
                    {(selectedEmployee.coins_balance + (operation === 'add' ? amount : -amount)).toLocaleString()} HC
                  </span>
                </div>

                {/* Motivo */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Motivo (obrigatório)</label>
                  <input
                    required value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="input-field w-full"
                    placeholder="Ex: Bônus por meta batida, correção, etc."
                  />
                </div>

                <button
                  disabled={saving} type="submit"
                  className={`w-full py-3 font-bold rounded-xl transition-all ${operation === 'add' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:scale-105 shadow-glow-gold' : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:scale-105'}`}
                >
                  {saving ? 'Aplicando...' : `${operation === 'add' ? '+ Adicionar' : '− Remover'} ${amount} HC para ${selectedEmployee.full_name.split(' ')[0]}`}
                </button>
              </form>
            )}
          </GlassCard>
        </div>
      ) : (
        /* Histórico */
        <GlassCard className="p-6">
          <h2 className="text-xl font-outfit font-bold text-white mb-6">Histórico de Transações</h2>
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhuma transação registrada.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 p-3 bg-slate-900/50 border border-white/5 rounded-xl"
                >
                  {/* Ícone +/- */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.amount > 0 ? 'bg-higame-success/20 text-higame-success' : 'bg-red-500/20 text-red-400'}`}>
                    {tx.amount > 0 ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{tx.profile?.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{tx.reason}</p>
                    {tx.admin?.full_name && (
                      <p className="text-[10px] text-slate-500">por {tx.admin.full_name}</p>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-outfit font-black text-sm ${tx.amount > 0 ? 'text-higame-success' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} HC
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
