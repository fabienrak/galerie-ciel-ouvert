import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getArtistes } from '../lib/supabase.js'
import { ArrowRight } from 'lucide-react'

export default function ArtistesPage() {
  const [artistes, setArtistes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getArtistes().then(d => { setArtistes(d); setLoading(false) })
  }, [])

  return (
    <div style={{ minHeight: '100svh', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{
        padding: '48px 20px 32px',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20px', right: '-10px',
          fontFamily: 'var(--font-display)',
          fontSize: '120px',
          color: 'rgba(245,240,232,0.03)',
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>CREW</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
          Le collectif
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '52px', letterSpacing: '0.02em', lineHeight: 0.9 }}>
          LES ARTISTES
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: '40px 20px', fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--muted)' }}>Chargement...</div>
      ) : (
        <div style={{ padding: '8px 20px' }}>
          {artistes.map((a, i) => (
            <Link
              key={a.id}
              to={`/artiste/${a.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr 24px',
                alignItems: 'center',
                gap: '16px',
                padding: '20px 0',
                borderBottom: '1px solid var(--border)',
                transition: 'opacity 0.2s',
                animation: `fadeUp 0.4s ${i * 0.08}s ease both`,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={a.photo_url}
                  alt={a.nom}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--border)',
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '14px', height: '14px',
                  background: 'var(--accent)', borderRadius: '50%',
                  border: '2px solid var(--ink)',
                }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', letterSpacing: '0.04em' }}>{a.nom}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                  {a.specialite}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.5)', marginTop: '6px', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.bio}
                </p>
              </div>
              <ArrowRight size={16} color="var(--muted)" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
