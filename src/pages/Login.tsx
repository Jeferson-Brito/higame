import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap, Shield, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: Trophy, label: 'Ranking em tempo real' },
  { icon: Zap,    label: 'Sistema de XP e Níveis' },
  { icon: Shield, label: 'KPIs Gamificados' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signIn, user, profile, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirecionar se já autenticado
  useEffect(() => {
    if (!isLoading && user && profile) {
      const from = (location.state as { from?: Location })?.from?.pathname
      const target = from || (profile.role === 'admin' ? '/admin' : '/dashboard')
      navigate(target, { replace: true })
    }
  }, [user, profile, isLoading, navigate, location])

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
    }
  }

  return (
    <div className="min-h-screen bg-higame-bg flex">

      {/* === Painel Esquerdo — Branding === */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12">

        {/* Gradiente de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-higame-purple/20 via-transparent to-higame-neon/10" />

        {/* Partículas decorativas */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-higame-purple/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-higame-neon/10 blur-3xl" />

        {/* Grade decorativa */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 max-w-md text-center">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-higame flex items-center justify-center shadow-glow-purple">
              <Zap className="w-8 h-8 text-white" fill="white" />
            </div>
            <span className="text-4xl font-outfit font-black text-gradient">
              HIGAME
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-outfit font-bold text-higame-text mb-4"
          >
            Gamificação que <span className="text-gradient">motiva</span> equipes
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-higame-muted font-inter text-base leading-relaxed mb-10"
          >
            Transforme metas operacionais em um sistema competitivo,
            visual e motivador para sua equipe de atendimento.
          </motion.p>

          {/* Features */}
          <div className="flex flex-col gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 glass-card px-4 py-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-higame flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-inter font-medium text-higame-text">
                  {f.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* === Painel Direito — Formulário === */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >

          {/* Header mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-higame flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-2xl font-outfit font-black text-gradient">HIGAME</span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h2 className="text-2xl font-outfit font-bold text-higame-text mb-1">
              Bem-vindo de volta
            </h2>
            <p className="text-sm font-inter text-higame-muted">
              Entre com suas credenciais para acessar a plataforma
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label htmlFor="email" className="input-label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="input-label">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-higame-muted hover:text-higame-text transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Entrar no HIGAME</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs font-inter text-higame-muted">
            Acesso restrito a colaboradores cadastrados.
            <br />
            Fale com seu administrador para solicitar acesso.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
