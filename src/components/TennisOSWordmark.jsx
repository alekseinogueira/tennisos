/**
 * TennisOSWordmark — Logo 55TC original + sufixo "OS"
 * 
 * Usa os paths exatos do 55tc-logo.svg com "OS" adicionado
 * na mesma tipografia/estilo, opacidade reduzida para hierarquia.
 * 
 * Uso:
 *   <TennisOSWordmark />                    → sand (header forest)
 *   <TennisOSWordmark variant="dark" />     → forest (fundo sand)
 *   <TennisOSWordmark size="sm" />          → compacto
 */

const sizes = {
  sm: { height: 20 },
  md: { height: 32 },
  lg: { height: 44 },
  xl: { height: 56 },
}

const variants = {
  default: { color: '#F5EDE0' },
  dark:    { color: '#1C3526' },
  ink:     { color: '#0D0D0D' },
}

export default function TennisOSWordmark({
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const { height } = sizes[size] || sizes.md
  const { color } = variants[variant] || variants.default

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 920 218"
      height={height}
      width="auto"
      aria-label="55TC OS"
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="wm-shadow" x="-10%" y="-10%" width="130%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="6"
            floodColor="#000000"
            floodOpacity="0.22"
          />
        </filter>
      </defs>

      {/* Logo 55TC — paths originais exatos */}
      <g
        filter="url(#wm-shadow)"
        transform="translate(-149.8, 610.864) scale(0.1, -0.1)"
        fill={color}
        stroke="none"
      >
        <path d="M7609 6025 c-437 -83 -763 -369 -871 -765 -31 -113 -33 -344 -4 -460
48 -193 124 -328 266 -471 153 -154 292 -234 517 -297 91 -25 112 -27 288 -27
221 0 278 12 453 95 104 50 222 125 222 142 0 11 -249 368 -256 368 -3 0 -35
-18 -72 -40 -100 -60 -177 -82 -311 -88 -88 -3 -129 0 -180 13 -192 51 -349
192 -400 359 -44 144 -35 261 29 392 150 306 565 406 881 212 25 -15 49 -28
52 -28 3 0 54 69 113 153 59 83 118 166 131 184 l24 31 -83 55 c-105 70 -208
119 -323 153 -76 22 -113 27 -245 30 -107 2 -179 -1 -231 -11z"/>
        <path d="M1688 6011 c-40 -4 -62 -12 -72 -26 -13 -17 -15 -99 -16 -597 l0
-577 22 -21 c17 -15 35 -20 77 -20 31 0 208 -1 393 -2 401 -4 373 6 373 -124
0 -73 -3 -88 -19 -100 -16 -11 -88 -14 -400 -14 -392 0 -447 -5 -466 -40 -6
-11 -10 -107 -10 -230 0 -211 0 -211 25 -235 l24 -25 523 0 c580 1 598 2 723
64 135 67 215 180 236 336 12 90 11 450 -1 535 -25 168 -123 283 -290 337 -57
18 -96 21 -322 26 l-258 4 0 89 0 89 359 0 360 0 28 24 28 24 0 204 c0 111 -3
215 -8 230 -15 54 -5 53 -652 54 -330 1 -626 -1 -657 -5z"/>
        <path d="M3465 6013 c-73 -6 -86 -12 -101 -48 -12 -28 -14 -128 -14 -573 0
-558 2 -592 41 -613 12 -6 134 -10 322 -9 346 0 472 -6 493 -27 10 -10 14 -39
14 -97 0 -68 -3 -86 -18 -99 -17 -15 -59 -17 -399 -17 -209 0 -395 -3 -412 -6
-57 -12 -66 -38 -70 -217 -4 -195 3 -261 32 -287 20 -19 37 -20 547 -20 488 0
532 1 602 19 181 47 291 145 339 302 19 62 20 89 17 366 -3 287 -4 300 -27
358 -17 43 -42 77 -85 121 -109 108 -214 134 -552 134 l-204 0 0 90 0 89 366
3 366 3 19 24 c17 21 19 41 19 237 0 211 0 213 -24 241 l-24 28 -604 1 c-331
1 -621 0 -643 -3z"/>
        <path d="M4972 5774 l3 -227 265 2 c146 1 273 -1 283 -4 16 -7 17 -55 17 -756
l0 -749 270 0 270 0 0 755 0 755 285 0 285 0 0 225 0 225 -840 0 -840 0 2
-226z"/>
        <path d="M7745 5458 c-83 -9 -174 -44 -185 -71 -4 -12 -12 -58 -18 -102 -14
-104 -63 -257 -119 -368 l-44 -88 27 -49 c36 -66 130 -155 197 -185 73 -34
158 -48 242 -42 116 9 129 17 144 90 27 132 104 277 203 383 l62 66 -13 46
c-25 94 -97 192 -186 251 -84 57 -197 82 -310 69z"/>
        <path d="M7478 5333 c-89 -96 -130 -199 -130 -326 0 -45 5 -93 10 -107 9 -24
11 -22 41 38 39 78 85 213 105 314 24 119 21 130 -26 81z"/>
        <path d="M8217 5011 c-53 -59 -120 -164 -150 -236 -29 -71 -59 -167 -53 -173
8 -8 94 58 131 100 73 85 122 224 113 318 l-3 33 -38 -42z"/>
      </g>

      {/* OS — mesmo peso visual, opacidade 38% cria hierarquia */}
      <text
        x="734"
        y="178"
        fontFamily="'Bebas Neue', 'Arial Black', Impact, sans-serif"
        fontSize="195"
        fontWeight="400"
        fill={color}
        fillOpacity="0.38"
        filter="url(#wm-shadow)"
        letterSpacing="-2"
      >
        OS
      </text>
    </svg>
  )
}
