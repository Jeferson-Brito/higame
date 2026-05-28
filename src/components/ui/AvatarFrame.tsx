import { getInitials } from '@/lib/utils'

interface AvatarFrameProps {
  avatarUrl?: string | null
  fullName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  frameRarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | null
  frameUrl?: string | null // Pode ser usado no futuro se a moldura for uma imagem, por enquanto usamos as classes de CSS
  className?: string
}

const RARITY_STYLES = {
  common: 'ring-slate-500 shadow-sm',
  rare: 'ring-blue-500 shadow-glow-neon shadow-blue-500/30',
  epic: 'ring-purple-500 shadow-glow-purple shadow-purple-500/40 animate-pulse-slow',
  legendary: 'ring-amber-500 shadow-glow-gold shadow-amber-500/50 animate-pulse',
  mythic: 'ring-red-500 shadow-glow-red shadow-red-500/60 ring-offset-2 ring-offset-slate-900',
}

const SIZE_STYLES = {
  sm: 'w-8 h-8 text-xs ring-1',
  md: 'w-12 h-12 text-sm ring-2',
  lg: 'w-16 h-16 text-xl ring-2',
  xl: 'w-24 h-24 text-3xl ring-4 ring-offset-4 ring-offset-higame-surface',
}

export function AvatarFrame({ 
  avatarUrl, 
  fullName, 
  size = 'md', 
  frameRarity,
  className = ''
}: AvatarFrameProps) {
  
  const baseSizeClasses = SIZE_STYLES[size]
  const rarityClasses = frameRarity ? RARITY_STYLES[frameRarity] : 'ring-white/10'

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Container principal do Avatar */}
      <div className={`relative rounded-xl overflow-hidden ${baseSizeClasses} ${rarityClasses} transition-all duration-300`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-higame flex items-center justify-center font-outfit font-black text-white">
            {getInitials(fullName || '?')}
          </div>
        )}
        
        {/* Camada de brilho interno para raridades altas */}
        {frameRarity && ['epic', 'legendary', 'mythic'].includes(frameRarity) && (
          <div className="absolute inset-0 ring-inset ring-1 ring-white/30 mix-blend-overlay rounded-xl pointer-events-none" />
        )}
      </div>

      {/* Partículas para Mythic */}
      {frameRarity === 'mythic' && (
        <div className="absolute -inset-1 border-2 border-dashed border-red-500/30 rounded-2xl animate-spin-slow pointer-events-none" />
      )}
    </div>
  )
}
