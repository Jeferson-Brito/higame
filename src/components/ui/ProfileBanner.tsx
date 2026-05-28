// Componente de Banner de Fundo do Perfil
// Banners são identificados por asset_url: 'banner:aurora', 'banner:night', etc.

export const BANNER_STYLES: Record<string, {
  bg: string
  label: string
  description: string
  particles?: boolean
}> = {
  'banner:aurora': {
    bg: 'linear-gradient(135deg, #0f2027 0%, #203a43 30%, #2c5364 50%, #7B2D8B 75%, #00F5C4 100%)',
    label: 'Aurora',
    description: 'Aurora Boreal',
    particles: false,
  },
  'banner:night': {
    bg: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 40%, #0d0d2b 70%, #1a0533 100%)',
    label: 'Noite Estrelada',
    description: 'Noite Estrelada',
    particles: true,
  },
  'banner:flames': {
    bg: 'linear-gradient(135deg, #1a0000 0%, #7f1d1d 30%, #dc2626 60%, #f97316 85%, #fbbf24 100%)',
    label: 'Chamas',
    description: 'Chamas Épicas',
    particles: false,
  },
  'banner:ocean': {
    bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 30%, #0ea5e9 60%, #38bdf8 85%, #bae6fd 100%)',
    label: 'Oceano',
    description: 'Oceano Profundo',
    particles: false,
  },
  'banner:cyber': {
    bg: 'linear-gradient(135deg, #020617 0%, #0f172a 25%, #1e1b4b 50%, #312e81 75%, #4f46e5 90%, #00F5C4 100%)',
    label: 'Ciberpunk',
    description: 'Ciberpunk',
    particles: true,
  },
}

interface ProfileBannerProps {
  bannerUrl: string | null | undefined
  height?: number | string
  className?: string
  children?: React.ReactNode
}

export function ProfileBanner({ bannerUrl, height = 160, className = '', children }: ProfileBannerProps) {
  const banner = bannerUrl ? BANNER_STYLES[bannerUrl] : null

  const style: React.CSSProperties = banner
    ? { background: banner.bg, height }
    : { background: 'linear-gradient(135deg, #12121F 0%, #1E1E35 50%, #12121F 100%)', height }

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={style}
    >
      {/* Estrelas para banners nocturnos */}
      {banner?.particles && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
            />
          ))}
        </div>
      )}

      {/* Grade ciberpunk */}
      {bannerUrl === 'banner:cyber' && (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,245,196,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,196,0.3) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
      )}

      {/* Overlay escuro no rodapé para legibilidade do conteúdo */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

      {children}
    </div>
  )
}

// Preview card do banner (para a loja e admin)
export function BannerPreview({ bannerKey, width = 120, height = 60 }: { bannerKey: string; width?: number; height?: number }) {
  const banner = BANNER_STYLES[bannerKey]
  if (!banner) return null

  return (
    <div
      className="relative rounded-lg overflow-hidden flex items-center justify-center"
      style={{ width, height, background: banner.bg }}
    >
      {banner.particles && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full"
              style={{
                left: `${(i * 13 + 5) % 100}%`,
                top: `${(i * 17 + 10) % 100}%`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}
      {bannerKey === 'banner:cyber' && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,245,196,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,196,0.5) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
      )}
      <span className="relative z-10 text-xs font-bold text-white/80 drop-shadow">{banner.label}</span>
    </div>
  )
}
