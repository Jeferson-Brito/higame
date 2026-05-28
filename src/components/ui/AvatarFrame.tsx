import { getInitials } from '@/lib/utils'

interface AvatarFrameProps {
  avatarUrl?: string | null
  fullName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  frameRarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | null
  frameUrl?: string | null
  className?: string
}

// frameUrl pode ser 'frame:neon', 'frame:gold', 'frame:fire', 'frame:galaxy', 'frame:silver'
// ou null (usa a raridade para estilizar)
const FRAME_STYLES: Record<string, { ring: string; glow: string; extra?: string }> = {
  'frame:neon': {
    ring: 'ring-[3px] ring-[#00F5C4]',
    glow: 'shadow-[0_0_16px_4px_rgba(0,245,196,0.6)]',
    extra: 'animate-pulse-slow',
  },
  'frame:gold': {
    ring: 'ring-[4px] ring-amber-400',
    glow: 'shadow-[0_0_20px_6px_rgba(245,158,11,0.7)]',
    extra: '',
  },
  'frame:fire': {
    ring: 'ring-[3px] ring-orange-500',
    glow: 'shadow-[0_0_18px_4px_rgba(249,115,22,0.6)]',
    extra: '',
  },
  'frame:galaxy': {
    ring: 'ring-[4px] ring-purple-500',
    glow: 'shadow-[0_0_24px_8px_rgba(168,85,247,0.6)]',
    extra: 'animate-pulse',
  },
  'frame:silver': {
    ring: 'ring-[3px] ring-slate-300',
    glow: 'shadow-[0_0_12px_3px_rgba(148,163,184,0.5)]',
    extra: '',
  },
}

const RARITY_STYLES = {
  common: 'ring-[2px] ring-slate-500',
  rare: 'ring-[2px] ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]',
  epic: 'ring-[3px] ring-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.5)] animate-pulse-slow',
  legendary: 'ring-[3px] ring-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.6)] animate-pulse',
  mythic: 'ring-[4px] ring-red-500 shadow-[0_0_22px_rgba(239,68,68,0.7)] ring-offset-2 ring-offset-slate-900',
}

const SIZE_STYLES = {
  sm:  { container: 'w-8 h-8',   text: 'text-xs' },
  md:  { container: 'w-12 h-12', text: 'text-sm' },
  lg:  { container: 'w-16 h-16', text: 'text-xl' },
  xl:  { container: 'w-24 h-24', text: 'text-3xl' },
}

export function AvatarFrame({
  avatarUrl,
  fullName,
  size = 'md',
  frameRarity,
  frameUrl,
  className = '',
}: AvatarFrameProps) {
  const sizeStyle = SIZE_STYLES[size]

  // Se tiver frameUrl específico (ex: 'frame:neon'), usa o estilo avançado
  const frameStyle = frameUrl ? FRAME_STYLES[frameUrl] : null
  const ringClasses = frameStyle
    ? `${frameStyle.ring} ${frameStyle.glow} ${frameStyle.extra ?? ''}`
    : frameRarity
    ? RARITY_STYLES[frameRarity]
    : 'ring-[1px] ring-white/10'

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Avatar */}
      <div className={`relative rounded-xl overflow-hidden ${sizeStyle.container} ${ringClasses} transition-all duration-300`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-higame flex items-center justify-center font-outfit font-black text-white">
            <span className={sizeStyle.text}>{getInitials(fullName || '?')}</span>
          </div>
        )}

        {/* Brilho interno para raridades altas */}
        {frameRarity && ['epic', 'legendary', 'mythic'].includes(frameRarity) && (
          <div className="absolute inset-0 ring-inset ring-1 ring-white/30 mix-blend-overlay rounded-xl pointer-events-none" />
        )}
      </div>

      {/* Anel giratório para Mythic / Galaxy */}
      {(frameRarity === 'mythic' || frameUrl === 'frame:galaxy') && (
        <div className={`absolute -inset-1 border-2 border-dashed rounded-2xl animate-spin-slow pointer-events-none ${frameUrl === 'frame:galaxy' ? 'border-purple-500/40' : 'border-red-500/30'}`} />
      )}

      {/* Partículas de fogo para frame:fire */}
      {frameUrl === 'frame:fire' && (
        <>
          <div className="absolute -inset-1 rounded-2xl pointer-events-none overflow-hidden">
            <div className="absolute bottom-0 left-1/4 w-1 h-3 bg-orange-400/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="absolute bottom-0 left-1/2 w-1 h-2 bg-red-400/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="absolute bottom-0 left-3/4 w-1 h-3 bg-amber-400/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </>
      )}
    </div>
  )
}

// Componente de pré-visualização de moldura (para a loja e admin)
export function FramePreview({ frameKey, size = 48 }: { frameKey: string; size?: number }) {
  const style = FRAME_STYLES[frameKey]
  if (!style) return null

  const previewMap: Record<string, { bg: string; label: string; icon: string }> = {
    'frame:neon':   { bg: 'from-[#00F5C4]/30 to-slate-900', label: 'Neon',    icon: '⚡' },
    'frame:gold':   { bg: 'from-amber-500/30 to-slate-900', label: 'Dourada', icon: '👑' },
    'frame:fire':   { bg: 'from-orange-600/30 to-slate-900', label: 'Chamas', icon: '🔥' },
    'frame:galaxy': { bg: 'from-purple-600/30 to-slate-900', label: 'Galáxia', icon: '🌌' },
    'frame:silver': { bg: 'from-slate-400/30 to-slate-900', label: 'Prata',   icon: '🥈' },
  }

  const preview = previewMap[frameKey]

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-b ${preview.bg} overflow-hidden`}
      style={{ width: size, height: size }}
    >
      <div className={`w-3/4 h-3/4 rounded-lg bg-slate-700 ${style.ring} ${style.glow} ${style.extra ?? ''} flex items-center justify-center text-xs`}>
        {preview.icon}
      </div>
    </div>
  )
}
