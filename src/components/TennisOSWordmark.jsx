/**
 * TennisOSWordmark — Componente de wordmark "55TC.OS"
 * 
 * Uso no portal:
 *   import TennisOSWordmark from '@/components/TennisOSWordmark'
 *   <TennisOSWordmark />                    ← sand sobre forest (padrão — header)
 *   <TennisOSWordmark variant="dark" />     ← forest sobre sand (fundos claros)
 *   <TennisOSWordmark variant="mono" />     ← tudo sand (backgrounds escuros)
 *   <TennisOSWordmark size="sm" />          ← versão compacta
 * 
 * Para substituir "TENNISOS" no portal, troque pelo componente em:
 *   src/components/Layout.jsx  (header nav)
 *   src/pages/Login.jsx        (tela de login)
 *   qualquer outro lugar com texto "TENNISOS"
 */

const sizes = {
  sm: { height: 28, fontSize: 28, dotSize: 28 },
  md: { height: 40, fontSize: 40, dotSize: 40 },
  lg: { height: 56, fontSize: 56, dotSize: 56 },
  xl: { height: 72, fontSize: 72, dotSize: 72 },
}

const variants = {
  // Sand sobre qualquer fundo — padrão do header forest
  default: {
    brandColor: '#F5EDE0',   // 55TC em sand
    suffixColor: '#F5EDE0',  // .OS em sand também, mas com opacity diferente
    dotColor: '#F5EDE0',
    suffixOpacity: 0.45,     // .OS aparece mais suave — leitura hierárquica
  },
  // Forest sobre sand — para fundos claros
  dark: {
    brandColor: '#1C3526',
    suffixColor: '#1C3526',
    dotColor: '#1C3526',
    suffixOpacity: 0.4,
  },
  // Tudo sand sólido — para quando precisa de contraste máximo
  mono: {
    brandColor: '#F5EDE0',
    suffixColor: '#F5EDE0',
    dotColor: '#F5EDE0',
    suffixOpacity: 1,
  },
  // Tudo ink — máximo contraste em fundo claro
  ink: {
    brandColor: '#0D0D0D',
    suffixColor: '#0D0D0D',
    dotColor: '#0D0D0D',
    suffixOpacity: 0.45,
  },
}

export default function TennisOSWordmark({ 
  variant = 'default', 
  size = 'md',
  className = '' 
}) {
  const { height } = sizes[size] || sizes.md
  const { brandColor, suffixColor, suffixOpacity } = variants[variant] || variants.default

  return (
    <svg
      viewBox="0 0 320 60"
      height={height}
      width="auto"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="55TC.OS"
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
          .wm-brand { font-family: 'Bebas Neue', 'Arial Black', sans-serif; }
          .wm-suffix { font-family: 'Bebas Neue', 'Arial Black', sans-serif; }
        `}</style>
      </defs>

      {/* 55TC — marca principal, peso total */}
      <text
        className="wm-brand"
        x="2"
        y="50"
        fontSize="54"
        fontWeight="400"
        fill={brandColor}
        letterSpacing="1"
      >
        55TC
      </text>

      {/* .OS — sufixo de produto, hierarquia visual via opacity */}
      <text
        className="wm-suffix"
        x="227"
        y="50"
        fontSize="54"
        fontWeight="400"
        fill={suffixColor}
        fillOpacity={suffixOpacity}
        letterSpacing="1"
      >
        .OS
      </text>
    </svg>
  )
}
