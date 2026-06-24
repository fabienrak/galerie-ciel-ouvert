import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { getFresques } from '../lib/supabase.js'

export default function HomePage() {
  const [fresques, setFresques] = useState([])
  const [loading, setLoading]   = useState(true)
  const [slideIdx, setSlideIdx] = useState(0)
  const [prevIdx, setPrevIdx]   = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    getFresques().then(d => { setFresques(d); setLoading(false) })
  }, [])

  useEffect(() => {
    if (fresques.length < 2) return
    timerRef.current = setInterval(() => advance(), 5000)
    return () => clearInterval(timerRef.current)
  }, [fresques, slideIdx, transitioning])

  function advance() {
    if (transitioning || fresques.length === 0) return
    setPrevIdx(slideIdx)
    setTransitioning(true)
    setSlideIdx(i => (i + 1) % fresques.length)
    setTimeout(() => { setPrevIdx(null); setTransitioning(false) }, 900)
  }

  function goTo(i) {
    if (i === slideIdx || transitioning) return
    clearInterval(timerRef.current)
    setPrevIdx(slideIdx)
    setTransitioning(true)
    setSlideIdx(i)
    setTimeout(() => { setPrevIdx(null); setTransitioning(false) }, 900)
  }

  const slide = fresques[slideIdx]
  const prev  = prevIdx !== null ? fresques[prevIdx] : null

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <header style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 20px 100px',
        overflow: 'hidden',
      }}>

        {/* Slideshow BG — previous (fade out) */}
        {prev && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url(${prev.photo_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: 'slideOut 0.9s ease forwards',
          }} />
        )}

        {/* Slideshow BG — current (fade + Ken Burns) */}
        {slide && (
          <div key={slideIdx} style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url(${slide.photo_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: 'slideIn 0.9s ease forwards, kenBurns 6s ease-out forwards',
          }} />
        )}

        {/* Dark scrim */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(160deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.15) 45%, rgba(10,10,10,0.88) 100%)',
        }} />

        {/* Grain noise */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
        }} />

        {/* Red accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '20px', zIndex: 2,
          width: '2px', height: '40vh',
          background: 'linear-gradient(to bottom, var(--accent), transparent)',
        }} />

        {/* Slide dots + current label — top right */}
        {fresques.length > 1 && (
          <div style={{
            position: 'absolute', top: '20px', right: '20px', zIndex: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px',
          }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {fresques.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    width: i === slideIdx ? '22px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: i === slideIdx ? 'var(--accent)' : 'rgba(245,240,232,0.35)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'width 0.35s ease, background 0.35s ease',
                  }}
                />
              ))}
            </div>
            {slide && (
              <div key={slideIdx} style={{
                fontFamily: 'var(--font-display)', fontSize: '9px',
                color: 'rgba(245,240,232,0.55)', textTransform: 'uppercase',
                letterSpacing: '0.12em', textAlign: 'right',
                animation: 'fadeUp 0.5s ease both',
                maxWidth: '140px',
              }}>
                {slide.artiste?.nom}<br/>{slide.titre}
              </div>
            )}
          </div>
        )}

        {/* Tag line */}
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '11px',
          letterSpacing: '0.15em', color: 'var(--accent)',
          textTransform: 'uppercase', marginBottom: '16px',
          position: 'relative', zIndex: 2,
          animation: 'fadeUp 0.6s ease forwards',
        }}>
          Antananarivo — Quartier Galerie
        </p>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(72px, 22vw, 180px)',
          lineHeight: 0.88, letterSpacing: '-0.01em',
          position: 'relative', zIndex: 2,
          animation: 'fadeUp 0.6s 0.1s ease both',
        }}>
          <span style={{ display: 'block' }}>GALERIE</span>
          <span style={{ display: 'block', color: 'var(--accent)' }}>À CIEL</span>
          <span style={{ display: 'block' }}>OUVERT</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 300,
          color: 'rgba(245,240,232,0.75)', maxWidth: '300px', marginTop: '24px',
          position: 'relative', zIndex: 2,
          animation: 'fadeUp 0.6s 0.2s ease both',
        }}>
          Le quartier comme musée. Explore les fresques, découvre les artistes.
        </p>

        {/* CTA */}
        <div style={{
          display: 'flex', gap: '12px', marginTop: '32px',
          position: 'relative', zIndex: 2,
          animation: 'fadeUp 0.6s 0.3s ease both',
          flexWrap: 'wrap',
        }}>
          <Link to="/carte" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--accent)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '12px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '14px 24px', borderRadius: 'var(--radius)',
          }}>
            Explorer la carte <ArrowRight size={14} />
          </Link>
          <Link to="/artistes" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            border: '1px solid rgba(245,240,232,0.3)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-display)', fontSize: '12px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '14px 24px', borderRadius: 'var(--radius)',
            backdropFilter: 'blur(6px)',
            background: 'rgba(10,10,10,0.2)',
          }}>
            Le crew
          </Link>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: '32px', marginTop: '48px',
          position: 'relative', zIndex: 2,
          borderTop: '1px solid rgba(245,240,232,0.15)',
          paddingTop: '24px',
          animation: 'fadeUp 0.6s 0.4s ease both',
        }}>
          {[
            { n: fresques.length, label: 'Fresques' },
            { n: 4, label: 'Artistes' },
            { n: 1, label: 'Quartier' },
          ].map(({ n, label }) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', lineHeight: 1 }}>{n}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'rgba(245,240,232,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CSS keyframes */}
        <style>{`
          @keyframes slideIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes slideOut {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
          @keyframes kenBurns {
            from { transform: scale(1.0); }
            to   { transform: scale(1.08); }
          }
        `}</style>
      </header>

      {/* ── Fresques récentes ── */}
      <section style={{ padding: '60px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', letterSpacing: '0.02em' }}>
            FRESQUES
          </h2>
          <Link to="/carte" style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-display)', fontSize: '12px' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {fresques.map((f, i) => (
              <Link
                key={f.id}
                to={`/fresque/${f.slug}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr auto',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border)',
                  transition: 'opacity 0.2s',
                  animation: `fadeUp 0.4s ${i * 0.06}s ease both`,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{
                  width: '44px', height: '44px',
                  backgroundImage: `url(${f.photo_url})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  borderRadius: '2px', flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '0.04em' }}>{f.titre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <MapPin size={10} color="var(--accent)" />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)' }}>{f.artiste?.nom}</span>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--muted)" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
