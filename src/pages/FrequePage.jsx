import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { getFresqueBySlug } from '../lib/supabase.js'
import { ArrowLeft, MapPin, Calendar, Download, Instagram, Youtube, Music } from 'lucide-react'
import PanoViewer from '../components/PanoViewer.jsx'

export default function FrequePage() {
  const { slug } = useParams()
  const [fresque, setFresque] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    getFresqueBySlug(slug).then(f => {
      setFresque(f)
      setLoading(false)
      if (f) generateQR(f.slug)
    })
  }, [slug])

  async function generateQR(s) {
    const url = `${window.location.origin}/fresque/${s}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#f5f0e8' },
    })
    setQrDataUrl(dataUrl)
  }

  function downloadQR() {
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${slug}.png`
    a.click()
  }

  if (loading) return (
    <div style={{ padding: '40px 20px', fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--muted)' }}>
      Chargement...
    </div>
  )
  if (!fresque) return (
    <div style={{ padding: '40px 20px' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--muted)' }}>Fresque introuvable.</p>
      <Link to="/carte" style={{ color: 'var(--accent)', marginTop: '12px', display: 'inline-block' }}>← Retour carte</Link>
    </div>
  )

  const { artiste } = fresque

  return (
    <div style={{ minHeight: '100svh', animation: 'fadeUp 0.4s ease' }}>

      {/* Back nav */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/carte" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-display)', fontSize: '10px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <ArrowLeft size={12} /> Carte
        </Link>
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '44px', lineHeight: 0.9, letterSpacing: '0.02em' }}>
          {fresque.titre}
        </h1>
      </div>

      {/* Panoramic 3D viewer */}
      <PanoViewer imageUrl={fresque.photo_url} titre={fresque.titre} />

      {/* Tags */}
      {fresque.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', padding: '16px 20px 0', flexWrap: 'wrap' }}>
          {fresque.tags.map(tag => (
            <span key={tag} style={{
              fontFamily: 'var(--font-display)', fontSize: '10px',
              color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em',
              border: '1px solid var(--accent)', padding: '4px 10px', borderRadius: '20px',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={12} color="var(--muted)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--muted)' }}>{fresque.adresse}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={12} color="var(--muted)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--muted)' }}>
            {new Date(fresque.date_creation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(245,240,232,0.75)' }}>
          {fresque.description}
        </p>
      </div>

      {/* Artiste card */}
      {artiste && (
        <Link to={`/artiste/${artiste.id}`} style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <img
            src={artiste.photo_url}
            alt={artiste.nom}
            style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '0.04em' }}>{artiste.nom}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
              {artiste.specialite}
            </div>
          </div>
          <ArrowLeft size={16} color="var(--muted)" style={{ transform: 'rotate(180deg)' }} />
        </Link>
      )}

      {/* Liens artiste */}
      {artiste && (
        <div style={{ display: 'flex', gap: '12px', padding: '20px', borderBottom: '1px solid var(--border)' }}>
          {artiste.instagram && (
            <a href={artiste.instagram} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--paper)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <Instagram size={14} /> Insta
            </a>
          )}
          {artiste.soundcloud && (
            <a href={artiste.soundcloud} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--paper)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <Music size={14} /> Music
            </a>
          )}
          {artiste.youtube && (
            <a href={artiste.youtube} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--paper)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <Youtube size={14} /> Youtube
            </a>
          )}
        </div>
      )}

      {/* QR Code section */}
      <div style={{ padding: '24px 20px 40px' }}>
        <button
          onClick={() => setShowQr(!showQr)}
          style={{
            width: '100%',
            background: showQr ? 'var(--card)' : 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '14px',
            borderRadius: 'var(--radius)',
            transition: 'all 0.2s',
          }}
        >
          {showQr ? '↑ Masquer le QR code' : '↓ QR code de cette fresque'}
        </button>

        {showQr && qrDataUrl && (
          <div style={{
            marginTop: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            animation: 'fadeUp 0.3s ease',
          }}>
            <div style={{
              background: 'var(--paper)',
              padding: '16px',
              borderRadius: 'var(--radius)',
              display: 'inline-block',
            }}>
              <img src={qrDataUrl} alt="QR code" style={{ width: '160px', height: '160px' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Scanne pour ouvrir cette fiche
            </p>
            <button
              onClick={downloadQR}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--accent)', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '11px',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '12px 20px', borderRadius: 'var(--radius)',
              }}
            >
              <Download size={14} /> Télécharger PNG
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
