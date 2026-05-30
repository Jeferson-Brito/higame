import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Zap, Shield, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // States for animation
  const [insertingCoin, setInsertingCoin] = useState(false)
  const [coinPhase, setCoinPhase] = useState<'falling' | 'inserted' | 'ready'>('falling')

  const { signIn, user, profile, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirecionar se já autenticado e não estiver rodando a animação
  useEffect(() => {
    if (!isLoading && user && profile && !insertingCoin) {
      const from = (location.state as { from?: Location })?.from?.pathname
      const target = from || (profile.role === 'admin' ? '/admin' : '/dashboard')
      navigate(target, { replace: true })
    }
  }, [user, profile, isLoading, navigate, location, insertingCoin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha email e senha')
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast.error('Email ou senha inválidos', {
        style: {
          background: '#12121F',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#E2E8F0',
        },
      })
    } else {
      // Sucesso no login - Iniciar Animação!
      setInsertingCoin(true)
      
      // Phase 1: Coin falls (1s)
      setTimeout(() => {
        setCoinPhase('inserted')
      }, 800)

      // Phase 2: Ready / Press Start (1.8s)
      setTimeout(() => {
        setCoinPhase('ready')
      }, 1500)

      // Phase 3: Redirect (2.5s)
      setTimeout(() => {
        const from = (location.state as { from?: Location })?.from?.pathname
        // Need to fetch latest profile if not ready yet, but `profile` is in context
        // In the context, it takes a tiny bit to load the profile, so it's safe to assume it might be ready.
        // We can just rely on the useEffect redirect now by turning off `insertingCoin`.
        setInsertingCoin(false)
      }, 2500)
    }
  }

  return (
    <div className="h-screen w-screen bg-[#0a0f1c] overflow-hidden relative font-outfit text-white flex items-center justify-center">
      {/* Background idêntico ao Dashboard */}
      <img src="/assets/lobby_bg.png" alt="Lobby BG" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c]/50 pointer-events-none" />

      {/* Caixa de Arcade Central */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border-4 border-higame-neon rounded-3xl p-8 shadow-[0_0_50px_rgba(34,211,238,0.3)] overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-higame-neon to-transparent opacity-50" />
        
        {/* Header - Título */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.5)] mb-4">
            <Zap className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-md">
            HIGAME
          </h1>
          <p className="text-xs text-higame-neon tracking-[0.2em] font-bold mt-2 uppercase">Arcade Edition</p>
        </div>

        {/* Content (Form ou Animação) */}
        <AnimatePresence mode="wait">
          {!insertingCoin ? (
            <motion.form 
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSubmit} 
              className="space-y-6"
            >
              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="PLAYER 1 EMAIL"
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:outline-none focus:border-higame-neon transition-colors placeholder:text-slate-600"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:outline-none focus:border-higame-neon transition-colors placeholder:text-slate-600 pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-higame-neon transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden bg-gradient-to-b from-amber-400 to-amber-600 hover:to-orange-500 border-4 border-amber-200 rounded-xl py-4 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                ) : (
                  <span className="text-xl font-black text-[#7c2d12] tracking-widest drop-shadow-sm relative z-10 flex items-center gap-2">
                    INSERT COIN <span className="animate-pulse">▶</span>
                  </span>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div 
              key="coin-animation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-[280px]"
            >
              {/* Coin Slot Area */}
              <div className="relative w-24 h-32 flex flex-col items-center justify-end mb-8">
                {/* The Coin */}
                <motion.div
                  initial={{ y: -100, opacity: 0, rotateY: 0 }}
                  animate={{ 
                    y: coinPhase === 'falling' ? -20 : 60, 
                    opacity: coinPhase === 'inserted' ? 0 : 1,
                    rotateY: coinPhase === 'falling' ? 360 : 0
                  }}
                  transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
                  className="w-12 h-12 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-500 rounded-full border-2 border-yellow-200 shadow-[0_0_20px_rgba(251,191,36,0.8)] absolute z-20 flex items-center justify-center"
                >
                  <span className="font-black text-[#7c2d12] text-sm tracking-tighter">1 HC</span>
                </motion.div>

                {/* The Slot */}
                <div className="w-16 h-4 bg-slate-950 rounded-full border border-slate-700 shadow-inner relative z-30" />
                <div className="w-20 h-10 bg-slate-800 rounded-b-xl border-x-2 border-b-2 border-slate-600 absolute bottom-[-10px] z-10" />
              </div>

              {/* Text Effects */}
              <div className="text-center h-16">
                {coinPhase === 'falling' && (
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="text-xl font-black text-amber-400 animate-pulse tracking-widest"
                  >
                    INSERTING COIN...
                  </motion.p>
                )}
                {coinPhase === 'inserted' && (
                  <motion.p 
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                    className="text-2xl font-black text-higame-neon drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] tracking-widest"
                  >
                    CREDIT 1
                  </motion.p>
                )}
                {coinPhase === 'ready' && (
                  <motion.p 
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                    className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-bounce tracking-widest mt-2"
                  >
                    PRESS START!
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
