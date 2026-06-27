import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('visible')

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('fadeout')
      setTimeout(() => { setPhase('done'); onDone?.() }, 600)
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  if (phase === 'done') return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '40px',
      opacity: phase === 'fadeout' ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>

      {/* Grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
      }} />

      {/* Logo texte */}
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.5s ease both' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 14vw, 80px)',
          lineHeight: 0.9,
          letterSpacing: '0.04em',
          color: 'var(--paper)',
        }}>
          <span style={{ display: 'block' }}>GALERIE</span>
          <span style={{ display: 'block', color: 'var(--accent)' }}>À CIEL</span>
          <span style={{ display: 'block' }}>OUVERT</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          color: 'rgba(245,240,232,0.35)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginTop: '16px',
        }}>
          Ankadivato · Antananarivo
        </div>
      </div>

      {/* Spinner */}
      <div style={{ position: 'relative', width: '36px', height: '36px' }}>
        <svg viewBox="0 0 36 36" style={{ animation: 'spin 1s linear infinite', width: '36px', height: '36px' }}>
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke="rgba(245,240,232,0.08)"
            strokeWidth="2"
          />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="40 60"
            strokeDashoffset="0"
          />
        </svg>
        {/* Dot centre */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '5px', height: '5px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
