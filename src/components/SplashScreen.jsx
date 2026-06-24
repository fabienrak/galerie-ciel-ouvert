import { useEffect, useState } from 'react'

/*
  AKDVT — chaque lettre est dessinée comme un graffiti
  Les paths SVG sont tracés stroke-dashoffset pour l'effet "écriture"
  Viewbox 700 x 260, lettres espacées
*/

const LETTERS = [
  {
    char: 'A',
    paths: [
      "M 30 220 L 80 30 L 130 220",   // deux jambes
      "M 48 145 L 112 145",            // barre transversale
    ],
    delay: 0,
  },
  {
    char: 'K',
    paths: [
      "M 175 30 L 175 220",                        // jambe verticale
      "M 175 125 Q 210 125 240 30",               // bras haut
      "M 175 125 Q 215 125 255 220",              // bras bas
    ],
    delay: 600,
  },
  {
    char: 'D',
    paths: [
      "M 300 30 L 300 220",                                          // jambe verticale
      "M 300 30 Q 420 30 420 125 Q 420 220 300 220",               // courbe
    ],
    delay: 1200,
  },
  {
    char: 'V',
    paths: [
      "M 455 30 L 505 220",    // jambe gauche
      "M 555 30 L 505 220",    // jambe droite
    ],
    delay: 1800,
  },
  {
    char: 'T',
    paths: [
      "M 590 30 L 680 30",     // barre horizontale
      "M 635 30 L 635 220",    // jambe
    ],
    delay: 2300,
  },
]

/* Durée de tracé par path en ms */
const DRAW_DURATION = 380

/* Durée totale estimée */
const TOTAL_MS = 2300 + 600 + 200 + 700 // dernière lettre delay + ses paths + pause

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('drawing') // drawing | fadeout | done
  const [tick, setTick] = useState(0)

  /* Force re-render pour que les transitions démarrent après mount */
  useEffect(() => {
    const t = setTimeout(() => setTick(1), 30)
    return () => clearTimeout(t)
  }, [])

  /* Fin de l'animation → fadeout → done */
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('fadeout')
      setTimeout(() => { setPhase('done'); onDone?.() }, 700)
    }, TOTAL_MS)
    return () => clearTimeout(t)
  }, [])

  if (phase === 'done') return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '32px',
      opacity: phase === 'fadeout' ? 0 : 1,
      transition: 'opacity 0.7s ease',
    }}>

      {/* Grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
      }} />

      {/* SVG lettres */}
      <svg
        viewBox="0 0 710 250"
        style={{ width: '90vw', maxWidth: '520px' }}
        overflow="visible"
      >
        <defs>
          {/* Glow filter rouge */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Glow jaune pour ombre/fond */}
          <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>

        {LETTERS.map((letter, li) =>
          letter.paths.map((d, pi) => {
            const pathDelay = letter.delay + pi * (DRAW_DURATION * 0.85)
            return (
              <g key={`${li}-${pi}`}>
                {/* Ombre lumineuse jaune derrière */}
                <AnimatedPath
                  d={d}
                  stroke="#f5c800"
                  strokeWidth={22}
                  opacity={0.12}
                  filter="url(#glow2)"
                  startDelay={pathDelay}
                  duration={DRAW_DURATION}
                  started={tick > 0}
                />
                {/* Contour noir épais (outline graffiti) */}
                <AnimatedPath
                  d={d}
                  stroke="#000"
                  strokeWidth={18}
                  opacity={1}
                  startDelay={pathDelay}
                  duration={DRAW_DURATION}
                  started={tick > 0}
                />
                {/* Fill blanc cassé */}
                <AnimatedPath
                  d={d}
                  stroke="#f5f0e8"
                  strokeWidth={11}
                  opacity={0.95}
                  startDelay={pathDelay + 20}
                  duration={DRAW_DURATION}
                  started={tick > 0}
                />
                {/* Highlight rouge — trait fin au-dessus */}
                <AnimatedPath
                  d={d}
                  stroke="#ff3b1f"
                  strokeWidth={3}
                  opacity={0.8}
                  filter="url(#glow)"
                  startDelay={pathDelay + 60}
                  duration={DRAW_DURATION - 60}
                  started={tick > 0}
                />
              </g>
            )
          })
        )}
      </svg>

      {/* Sous-titre */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(9px, 2.5vw, 12px)',
        color: 'rgba(245,240,232,0.35)',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        opacity: tick > 0 ? 1 : 0,
        transition: `opacity 0.8s ${TOTAL_MS - 600}ms ease`,
      }}>
        Ankadivato · Antananarivo
      </div>

      {/* Barre de progression */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '2px', background: 'rgba(245,240,232,0.07)',
      }}>
        <div style={{
          height: '100%',
          background: 'var(--accent)',
          boxShadow: '0 0 10px var(--accent)',
          width: tick > 0 ? '100%' : '0%',
          transition: `width ${TOTAL_MS}ms linear`,
        }} />
      </div>
    </div>
  )
}

/* ── Composant path animé via stroke-dashoffset ── */
function AnimatedPath({ d, stroke, strokeWidth, opacity, filter, startDelay, duration, started }) {
  const [len, setLen] = useState(500)
  const ref = (el) => {
    if (el) {
      const l = el.getTotalLength()
      if (l && l !== len) setLen(l)
    }
  }

  const active = started
  const dashoffset = active ? 0 : len

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      filter={filter}
      strokeDasharray={len}
      strokeDashoffset={dashoffset}
      style={{
        transition: active
          ? `stroke-dashoffset ${duration}ms cubic-bezier(0.4,0,0.2,1) ${startDelay}ms`
          : 'none',
      }}
    />
  )
}
