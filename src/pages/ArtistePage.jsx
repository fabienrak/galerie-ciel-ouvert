import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getArtisteById, MOCK_FRESQUES } from '../lib/supabase.js'
import { ArrowLeft, Instagram, Youtube, Music, ArrowRight } from 'lucide-react'

export default function ArtistePage() {
  const { id } = useParams()
  const [artiste, setArtiste] = useState(null)
  const [fresques, setFresques] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getArtisteById(id).then(a => {
      setArtiste(a)
      // fresques de cet artiste (depuis mock ou Supabase)
      const fs = a?.fresques || MOCK_FRESQUES.filter(f => f.artiste_id === id)
      setFresques(fs)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div style={{ padding: '40px 20px', fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--muted)' }}>Chargement...</div>
  )
  if (!artiste) return (
    <div style={{ padding: '40px 20px' }}>
      <p style={{ fontFamily: 'var(--font-display)', color: 'var(--muted)' }}>Artiste introuvable.</p>
      <Link to="/artistes" style={{ color: 'var(--accent)', marginTop: '12px', display: 'inline-block' }}>← Retour</Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100svh', paddingBottom: '80px', animation: 'fadeUp 0.4s ease' }}>

      {/* Back */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <Link to="/artistes" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-display)', fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <ArrowLeft size={12} /> Tous les artistes
        </Link>
      </div>

      {/* Profile header */}
      <div style={{
        padding: '32px 20px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px',
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', width: '100%' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={artiste.photo_url}
              alt={artiste.nom}
              style={{
                width: '88px', height: '88px', borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--accent)',
              }}
            />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Artiste
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', lineHeight: 0.9, letterSpacing: '0.02em', marginTop: '4px' }}>
              {artiste.nom}
            </h1>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>
              {artiste.specialite}
            </p>
          </div>
        </div>

        <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(245,240,232,0.7)' }}>
          {artiste.bio}
        </p>

        {/* Social links */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {artiste.instagram && (
            <a href={artiste.instagram} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--paper)', fontFamily: 'var(--font-display)',
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '10px 16px', borderRadius: 'var(--radius)',
            }}>
              <Instagram size={13} /> Instagram
            </a>
          )}
          {artiste.soundcloud && (
            <a href={artiste.soundcloud} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--paper)', fontFamily: 'var(--font-display)',
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '10px 16px', borderRadius: 'var(--radius)',
            }}>
              <Music size={13} /> Music
            </a>
          )}
          {artiste.youtube && (
            <a href={artiste.youtube} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--paper)', fontFamily: 'var(--font-display)',
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '10px 16px', borderRadius: 'var(--radius)',
            }}>
              <Youtube size={13} /> YouTube
            </a>
          )}
        </div>
      </div>

      {/* Fresques de l'artiste */}
      <div style={{ padding: '24px 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '0.04em', marginBottom: '16px' }}>
          SES FRESQUES
        </h2>
        {fresques.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--muted)' }}>Aucune fresque enregistrée.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {fresques.map((f, i) => (
              <Link
                key={f.id}
                to={`/fresque/${f.slug}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 20px',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border)',
                  transition: 'opacity 0.2s',
                  animation: `fadeUp 0.4s ${i * 0.07}s ease both`,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <img
                  src={f.photo_url}
                  alt={f.titre}
                  style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '2px' }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '0.04em' }}>{f.titre}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    {new Date(f.date_creation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <ArrowRight size={14} color="var(--muted)" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
