import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader, GlassCard, Skeleton } from '@/components/ui/index'
import { Store, CheckCircle, XCircle, Clock, Plus, Edit2, X, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { FramePreview } from '@/components/ui/AvatarFrame'
import { BannerPreview, BANNER_STYLES } from '@/components/ui/ProfileBanner'

interface PurchaseRequest {
  id: string
  employee_id: string
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

interface StoreItem {
  id: string
  name: string
  description: string
  type: 'frame' | 'banner' | 'title' | 'real_reward'
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  price_coins: number
  asset_url: string | null
  is_active: boolean
  purchase_limit: number | null
}

const EMOJI_LIBRARY = [
  '🎁', '💸', '🍔', '🍕', '☕', '🍺', '🍿', '🎟️',
  '🏝️', '⏰', '🏃', '✈️', '⛵', '🚗', '🛵', '🚲',
  '👕', '🧢', '🎒', '👟', '📱', '🎧', '💻', '⌚',
  '👑', '💎', '🏆', '🌟', '✨', '🔥', '⚡', '🎭'
]

const FRAME_KEYS = ['frame:neon', 'frame:gold', 'frame:fire', 'frame:galaxy', 'frame:silver']
const FRAME_NAMES: Record<string, string> = {
  'frame:neon': 'Neon', 'frame:gold': 'Dourada',
  'frame:fire': 'Chamas', 'frame:galaxy': 'Galáxia', 'frame:silver': 'Prata'
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600',
  mythic: 'from-red-500 to-rose-700',
}

export default function AdminStore() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [items, setItems] = useState<StoreItem[]>([])
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'requests' | 'create'>('requests')

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'frame'|'banner'|'title'|'real_reward'>('real_reward')
  const [rarity, setRarity] = useState<'common'|'rare'|'epic'|'legendary'|'mythic'>('common')
  const [price, setPrice] = useState(1000)
  const [purchaseLimit, setPurchaseLimit] = useState<number | null>(null)
  const [selectedIcon, setSelectedIcon] = useState('🎁')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [reqsData, itemsData] = await Promise.all([
        supabase
          .from('employee_purchases')
          .select('id, employee_id, status, purchased_at, profile:profiles(full_name, team), item:store_items(name, price_coins, type)')
          .order('purchased_at', { ascending: false }),
        supabase
          .from('store_items')
          .select('*')
          .order('created_at', { ascending: false })
      ])

      const mappedReqs = (reqsData.data ?? []).map((d: any) => ({
        id: d.id,
        employee_id: d.employee_id,
        status: d.status,
        purchased_at: d.purchased_at,
        profile: Array.isArray(d.profile) ? d.profile[0] : d.profile,
        item: Array.isArray(d.item) ? d.item[0] : d.item
      })) as PurchaseRequest[]

      setRequests(mappedReqs)
      setItems(itemsData.data as StoreItem[] ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados da loja')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleFulfill = async (req: PurchaseRequest, newStatus: 'fulfilled' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('employee_purchases')
        .update({ status: newStatus, fulfilled_at: new Date().toISOString() })
        .eq('id', req.id)

      if (error) throw error

      // Inserir notificação
      await supabase.from('notifications').insert({
        profile_id: req.employee_id,
        title: newStatus === 'fulfilled' ? 'Compra Aprovada!' : 'Compra Recusada',
        message: newStatus === 'fulfilled' 
          ? `O item "${req.item.name}" foi entregue para você.` 
          : `Sua solicitação de "${req.item.name}" não foi aprovada.`,
        type: newStatus === 'fulfilled' ? 'store_approved' : 'store_rejected'
      })
      
      toast.success(newStatus === 'fulfilled' ? 'Pedido Entregue!' : 'Pedido Recusado.')
      void fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar pedido')
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setType('real_reward')
    setRarity('common')
    setPrice(0)
    setPurchaseLimit(null)
    setSelectedIcon('🎁')
  }

  const startEditing = (item: StoreItem) => {
    setActiveTab('create')
    setEditingId(item.id)
    setName(item.name)
    setDescription(item.description || '')
    setType(item.type)
    setRarity(item.rarity)
    setPrice(item.price_coins)
    setPurchaseLimit(item.purchase_limit)
    setSelectedIcon(item.asset_url || '🎁')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { 
        name, 
        description, 
        type, 
        rarity, 
        price_coins: price, 
        asset_url: selectedIcon,
        is_active: true,
        purchase_limit: purchaseLimit
      }

      if (editingId) {
        const { error } = await supabase.from('store_items').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Item atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('store_items').insert(payload)
        if (error) throw error
        toast.success('Item criado com sucesso!')
      }

      resetForm()
      void fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar item.')
    } finally {
      setSaving(false)
    }
  }

  const toggleItemActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('store_items').update({ is_active: !currentStatus }).eq('id', id)
      if (error) throw error
      toast.success(currentStatus ? 'Item desativado da loja.' : 'Item ativado na loja.')
      void fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar status do item')
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  const pending = requests.filter(r => r.status === 'pending')
  const history = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Gestão da Loja" 
        subtitle="Gerencie os itens à venda e aprove as compras dos colaboradores"
      />

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'requests' ? 'bg-amber-500 text-slate-900 shadow-glow-gold' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Clock className="w-5 h-5" /> Pedidos de Compra
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">
              {pending.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => { setActiveTab('create'); resetForm(); }}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'create' ? 'bg-higame-purple text-white shadow-glow-purple' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <Plus className="w-5 h-5" /> {editingId ? 'Editar Item' : 'Criar Novo Item'}
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pedidos Pendentes */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Pedidos Pendentes ({pending.length})
            </h2>

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
                      <button onClick={() => handleFulfill(req, 'fulfilled')} className="flex items-center gap-1 px-4 py-2 bg-higame-success/10 text-higame-success border border-higame-success/20 rounded-lg hover:bg-higame-success hover:text-slate-950 transition-colors font-bold text-sm">
                        <CheckCircle className="w-4 h-4" /> Entregar
                      </button>
                      <button onClick={() => handleFulfill(req, 'rejected')} className="flex items-center gap-1 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-slate-950 transition-colors font-bold text-sm">
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
            <h2 className="text-xl font-outfit font-bold text-white mb-6 flex items-center gap-2">
              <Store className="w-5 h-5 text-higame-purple" /> Histórico Recente
            </h2>

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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Criação/Edição */}
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
                <><Edit2 className="w-5 h-5 text-higame-purple" /> Editando Item</>
              ) : (
                <><ShoppingBag className="w-5 h-5 text-higame-purple" /> Novo Item da Loja</>
              )}
            </h2>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Tipo de Item</label>
                <select value={type} onChange={e => { setType(e.target.value as any); setSelectedIcon(e.target.value === 'frame' ? 'frame:neon' : e.target.value === 'banner' ? 'banner:aurora' : '🎁') }} className="input-field w-full">
                  <option value="real_reward">🎁 Recompensa Real</option>
                  <option value="frame">🖼️ Moldura de Avatar</option>
                  <option value="banner">🎨 Banner de Fundo</option>
                  <option value="title">🏷️ Título do Jogador</option>
                </select>
              </div>

              {/* Seletor inteligente por tipo */}
              {type === 'frame' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Escolha a Moldura</label>
                  <div className="flex flex-wrap gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    {FRAME_KEYS.map(fk => (
                      <button
                        key={fk} type="button"
                        onClick={() => setSelectedIcon(fk)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selectedIcon === fk ? 'bg-higame-purple/20 border-2 border-higame-purple' : 'border-2 border-transparent hover:bg-white/5'}`}
                      >
                        <FramePreview frameKey={fk} size={48} />
                        <span className="text-[10px] text-slate-400">{FRAME_NAMES[fk]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {type === 'banner' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Escolha o Banner</label>
                  <div className="flex flex-wrap gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    {Object.keys(BANNER_STYLES).map(bk => (
                      <button
                        key={bk} type="button"
                        onClick={() => setSelectedIcon(bk)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selectedIcon === bk ? 'bg-higame-purple/20 border-2 border-higame-purple' : 'border-2 border-transparent hover:bg-white/5'}`}
                      >
                        <BannerPreview bannerKey={bk} width={80} height={44} />
                        <span className="text-[10px] text-slate-400">{BANNER_STYLES[bk].label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(type === 'real_reward' || type === 'title') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Escolha um Ícone</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                    {EMOJI_LIBRARY.map(emoji => (
                      <button
                        key={emoji} type="button"
                        onClick={() => setSelectedIcon(emoji)}
                        className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-all ${selectedIcon === emoji ? 'bg-higame-purple/20 border-2 border-higame-purple scale-110 shadow-glow-purple' : 'hover:bg-white/10 border-2 border-transparent'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome do Produto</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="input-field w-full" placeholder="Ex: 1 Dia de Folga" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Raridade</label>
                  <select value={rarity} onChange={e => setRarity(e.target.value as any)} className="input-field w-full capitalize">
                    <option value="common">Comum</option>
                    <option value="rare">Raro</option>
                    <option value="epic">Épico</option>
                    <option value="legendary">Lendário</option>
                    <option value="mythic">Mítico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição</label>
                <input required value={description} onChange={e => setDescription(e.target.value)} className="input-field w-full" placeholder="Ex: Troque por um dia livre." />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Preço (HiCoins) — 0 = Grátis</label>
                <input type="number" required min="0" value={price} onChange={e => setPrice(Math.max(0, Number(e.target.value)))} className="input-field w-full" />
                {price === 0 && (
                  <p className="text-xs text-higame-success font-bold mt-1">✅ Este item será exibido como <strong>Grátis</strong> na loja e terá resgate automático.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Limite de Resgates (0 = Ilimitado)</label>
                <input type="number" min="0" value={purchaseLimit || 0} onChange={e => { const val = Number(e.target.value); setPurchaseLimit(val > 0 ? val : null) }} className="input-field w-full" placeholder="Ex: 1" />
                <p className="text-[10px] text-slate-500 mt-1">Deixe 0 para permitir que os usuários comprem este item quantas vezes quiserem.</p>
              </div>

              <button disabled={saving} type="submit" className="w-full btn-primary py-3 mt-4 flex justify-center items-center gap-2">
                {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Colocar à Venda')}
              </button>
            </form>
          </GlassCard>

          {/* Catálogo Atual */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-outfit font-bold text-white mb-6">Itens à Venda</h2>
            <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 col-span-full">Nenhum item na loja.</p>
              ) : (
                items.map(item => (
                  <div key={item.id} className={`relative flex flex-col items-center text-center p-4 rounded-xl border border-white/10 bg-gradient-to-b ${RARITY_COLORS[item.rarity]} bg-opacity-20 group ${!item.is_active && 'grayscale opacity-50'}`}>
                    
                    {/* Controles */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toggleItemActive(item.id, item.is_active)}
                        className={`w-6 h-6 rounded bg-slate-900 border flex items-center justify-center ${item.is_active ? 'border-red-500/50 text-red-400 hover:bg-red-500/20' : 'border-higame-success/50 text-higame-success hover:bg-higame-success/20'}`}
                        title={item.is_active ? "Ocultar da loja" : "Mostrar na loja"}
                      >
                        {item.is_active ? <X className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      </button>
                      <button 
                        onClick={() => startEditing(item)}
                        className="w-6 h-6 rounded bg-slate-900 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center hover:bg-white/10"
                        title="Editar Item"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-3xl mb-2 drop-shadow-md">
                      {item.asset_url?.startsWith('frame:') ? <FramePreview frameKey={item.asset_url} size={40} /> :
                       item.asset_url?.startsWith('banner:') ? <BannerPreview bannerKey={item.asset_url} width={56} height={32} /> :
                       item.asset_url || '🎁'}
                    </div>
                    <h3 className="font-outfit font-bold text-white text-xs px-1 leading-tight mb-2">{item.name}</h3>
                    <div className="mt-auto flex items-center gap-1 font-bold text-sm bg-slate-950/50 px-2 py-0.5 rounded-full">
                      {item.price_coins === 0
                        ? <span className="text-higame-success">Grátis</span>
                        : <span className="text-amber-400">{item.price_coins} HC</span>
                      }
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  )
}
