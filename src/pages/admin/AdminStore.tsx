import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { Store, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface PurchaseRequest {
  id: string
  status: 'pending' | 'fulfilled' | 'rejected'
  purchased_at: string
  profile: {
    full_name: string
    team: string | null
  }
  item: {
    name: string
    price_coins: number
    type: string
  }
}

export default function AdminStore() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<PurchaseRequest[]>([])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('employee_purchases')
        .select(`
          id, status, purchased_at,
          profile:profiles(full_name, team),
          item:store_items(name, price_coins, type)
        `)
        .order('purchased_at', { ascending: false })

      const mapped = (data ?? []).map((d: any) => ({
        id: d.id,
        status: d.status,
        purchased_at: d.purchased_at,
        profile: Array.isArray(d.profile) ? d.profile[0] : d.profile,
        item: Array.isArray(d.item) ? d.item[0] : d.item
      })) as PurchaseRequest[]

      setRequests(mapped)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const handleFulfill = async (id: string, newStatus: 'fulfilled' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('employee_purchases')
        .update({ status: newStatus, fulfilled_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      toast.success(newStatus === 'fulfilled' ? 'Pedido Entregue!' : 'Pedido Recusado.')
      void fetchRequests() // Atualiza a lista
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar pedido')
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  const pending = requests.filter(r => r.status === 'pending')
  const history = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Gestão da Loja" 
        subtitle="Aprove e entregue as recompensas resgatadas pelos colaboradores"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pedidos Pendentes */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-outfit font-bold text-white">Pedidos Pendentes ({pending.length})</h2>
          </div>

          {pending.length === 0 ? (
            <div className="text-center p-8 text-slate-500 border border-dashed border-white/10 rounded-xl">
              Nenhum pedido pendente no momento.
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map(req => (
                <div key={req.id} className="p-4 rounded-xl bg-slate-900/50 border border-amber-500/30 flex flex-col sm:flex-row gap-4 justify-between">
                  <div>
                    <h3 className="font-outfit font-black text-white text-lg">{req.item.name}</h3>
                    <p className="text-sm font-bold text-amber-400 mb-1">{req.item.price_coins} HC</p>
                    <p className="text-sm font-inter text-slate-400">
                      Solicitado por: <span className="text-slate-200">{req.profile.full_name}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Em {new Date(req.purchased_at).toLocaleDateString()} às {new Date(req.purchased_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex sm:flex-col gap-2 justify-center">
                    <button onClick={() => handleFulfill(req.id, 'fulfilled')} className="flex items-center gap-1 px-4 py-2 bg-higame-success/10 text-higame-success border border-higame-success/20 rounded-lg hover:bg-higame-success hover:text-slate-950 transition-colors font-bold text-sm">
                      <CheckCircle className="w-4 h-4" /> Entregar
                    </button>
                    <button onClick={() => handleFulfill(req.id, 'rejected')} className="flex items-center gap-1 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-slate-950 transition-colors font-bold text-sm">
                      <XCircle className="w-4 h-4" /> Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Histórico */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Store className="w-5 h-5 text-higame-purple" />
            <h2 className="text-xl font-outfit font-bold text-white">Histórico Recente</h2>
          </div>

          <div className="space-y-3">
            {history.slice(0, 10).map(req => (
              <div key={req.id} className="p-3 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
                <div>
                  <p className="font-outfit font-bold text-white text-sm">{req.item.name}</p>
                  <p className="text-xs text-slate-400">{req.profile.full_name}</p>
                </div>
                <div>
                  {req.status === 'fulfilled' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-higame-success bg-higame-success/10 px-2 py-1 rounded">Entregue</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-2 py-1 rounded">Recusado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
