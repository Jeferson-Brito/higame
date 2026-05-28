import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard, PageHeader, Skeleton } from '@/components/ui/index'
import { useAuth } from '@/contexts/AuthContext'
import { Store as StoreIcon, Coins, Clock, Search, ShoppingCart, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface StoreItem {
  id: string
  name: string
  description: string
  type: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  price_coins: number
  asset_url: string
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600 shadow-glow-gold',
  mythic: 'from-red-500 to-rose-700 shadow-glow-neon',
}

export default function Store() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<StoreItem[]>([])
  const [search, setSearch] = useState('')
  const [balance, setBalance] = useState(0)
  const [buyingId, setBuyingId] = useState<string | null>(null)

  const fetchStore = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const [{ data: storeData }, { data: profileData }] = await Promise.all([
        supabase.from('store_items').select('*').eq('is_active', true).order('price_coins', { ascending: true }),
        supabase.from('profiles').select('coins_balance').eq('id', profile.id).single()
      ])
      
      setItems((storeData ?? []) as StoreItem[])
      setBalance(profileData?.coins_balance ?? 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void fetchStore()
  }, [fetchStore])

  const handleBuy = async (item: StoreItem) => {
    if (!profile?.id) return
    if (balance < item.price_coins) {
      toast.error('Saldo insuficiente!')
      return
    }

    setBuyingId(item.id)
    try {
      // Cria a compra (status pending default)
      const { error: purchaseError } = await supabase.from('employee_purchases').insert({
        employee_id: profile.id,
        item_id: item.id
      })

      if (purchaseError) throw purchaseError

      // Desconta o saldo (precisará de uma trigger ou RPC no futuro para evitar race conditions, mas faremos simples no frontend por agora)
      const newBalance = balance - item.price_coins
      await supabase.from('profiles').update({ coins_balance: newBalance }).eq('id', profile.id)
      
      setBalance(newBalance)
      toast.success('Compra realizada! O RH será notificado.', { icon: '🎉' })
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar compra.')
    } finally {
      setBuyingId(null)
    }
  }

  const filteredItems = items.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header com Saldo Flutuante */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-900/80 border border-white/5 p-8 rounded-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-outfit font-black text-white flex items-center gap-3 mb-2">
            <StoreIcon className="w-8 h-8 text-amber-400" />
            Mercado Negro
          </h1>
          <p className="text-slate-400 font-inter">
            Troque suas HiCoins por folgas, dinheiro e muito mais!
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-end">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Seu Cofre</p>
          <div className="flex items-center gap-2 bg-slate-950 px-6 py-3 rounded-2xl border border-amber-500/20 shadow-glow-gold">
            <Coins className="w-6 h-6 text-amber-400 animate-pulse" />
            <span className="text-3xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
              {balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-outfit font-bold text-white">Catálogo de Recompensas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-48 bg-slate-900/50"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400">
          A loja está vazia. Rode o script SQL 004!
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, i) => {
            const canAfford = balance >= item.price_coins
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5 flex flex-col group hover:border-white/20 transition-all"
              >
                {/* Imagem do Item (Banner/Cor) */}
                <div className={`h-32 w-full bg-gradient-to-r ${RARITY_COLORS[item.rarity]} flex items-center justify-center text-5xl relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <motion.span whileHover={{ scale: 1.2, rotate: 5 }} className="relative z-10 drop-shadow-xl cursor-default">
                    {item.asset_url || '🎁'}
                  </motion.span>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-outfit font-black text-white text-lg">{item.name}</h3>
                  </div>
                  
                  <p className="text-sm font-inter text-slate-400 mb-6 flex-1">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
                    <div className={`flex items-center gap-1.5 font-outfit font-black text-lg ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>
                      <Coins className="w-5 h-5" />
                      {item.price_coins.toLocaleString()}
                    </div>
                    
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford || buyingId === item.id}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        buyingId === item.id 
                          ? 'bg-slate-700 text-white cursor-wait'
                          : canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:scale-105 shadow-glow-gold'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {buyingId === item.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : canAfford ? (
                        <><ShoppingCart className="w-4 h-4" /> Comprar</>
                      ) : (
                        'Sem Saldo'
                      )}
                    </button>
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
