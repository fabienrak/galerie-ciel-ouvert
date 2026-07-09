import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { getFresqueBySlug, incrementFresqueViews } from '../lib/supabase.js'
import { getVisitedPassport, markFresqueVisited, subscribePassport, toggleFresqueVisited } from '../lib/passport.js'
import {
  ArrowLeft,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Globe,
  Images,
  Instagram,
  MapPin,
  Music,
  QrCode,
  Share2,
  Youtube,
} from 'lucide-react'
import PanoViewer from '../components/PanoViewer.jsx'
import PhotoGallery from '../components/PhotoGallery.jsx'

const countedViewSlugs = new Set()

function getFresquePhotos(fresque) {
  const photos = Array.isArray(fresque?.photos) ? fresque.photos : []
  return Array.from(new Set([
    fresque?.photo_url,
    ...photos,
  ].filter(Boolean)))
}

export default function FrequePage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [fresque, setFresque]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showQr, setShowQr]     = useState(false)
  const [viewMode, setViewMode] = useState('gallery') // 'gallery' | 'pano'
  const [shareStatus, setShareStatus] = useState('')
  const [visitedPassport, setVisitedPassport] = useState(getVisitedPassport)
  const shareStatusTimer = useRef(null)
  const isQrEntry = searchParams.get('source') === 'qr' ||
    searchParams.get('from') === 'qr' ||
    searchParams.get('scan') === '1'

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setShareStatus('')

    getFresqueBySlug(slug)
      .then(f => {
        if (!mounted) return
        setFresque(f)
        setLoading(false)
        if (f) {
          generateQR(f.slug)
          registerView(f.slug)
          if (isQrEntry) {
            markFresqueVisited(f.slug)
            setVisitedPassport(getVisitedPassport())
          }
        }
      })
      .catch(error => {
        console.error('Erreur de chargement de la fresque:', error)
        if (!mounted) return
        setFresque(null)
        setLoading(false)
      })

    async function registerView(fresqueSlug) {
      if (countedViewSlugs.has(fresqueSlug)) return
      countedViewSlugs.add(fresqueSlug)

      const views = await incrementFresqueViews(fresqueSlug)
      if (!mounted || !Number.isFinite(Number(views))) return

      setFresque(prev => (
        prev?.slug === fresqueSlug
          ? { ...prev, views: Number(views) }
          : prev
      ))
    }

    return () => {
      mounted = false
    }
  }, [isQrEntry, slug])

  useEffect(() => () => {
    if (shareStatusTimer.current) clearTimeout(shareStatusTimer.current)
  }, [])

  useEffect(() => {
    return subscribePassport(setVisitedPassport)
  }, [])

  async function generateQR(s) {
    const url = `${window.location.origin}/fresque/${s}?source=qr`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300, margin: 2,
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

  function showShareStatus(message) {
    setShareStatus(message)
    if (shareStatusTimer.current) clearTimeout(shareStatusTimer.current)
    shareStatusTimer.current = setTimeout(() => setShareStatus(''), 1800)
  }

  async function copyShareLink(url) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return
    }

    const input = document.createElement('textarea')
    input.value = url
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.top = '-999px'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }

  async function shareFresque() {
    if (!fresque) return

    const url = `${window.location.origin}/fresque/${fresque.slug}`
    const shareData = {
      title: fresque.titre || 'Galerie à Ciel Ouvert',
      text: `Découvre cette fresque de Galerie à Ciel Ouvert : ${fresque.titre}`,
      url,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }

    try {
      await copyShareLink(url)
      showShareStatus('Lien copié')
    } catch {
      showShareStatus('Copie impossible')
    }
  }

  function toggleVisited() {
    if (!fresque?.slug) return
    setVisitedPassport(toggleFresqueVisited(fresque.slug))
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
  const photos = getFresquePhotos(fresque)
  const views = Number(fresque.views || 0)
  const isVisited = Boolean(visitedPassport[fresque.slug])
  const visitedCount = Object.keys(visitedPassport).length

  return (
    <div style={{ minHeight: '100svh', animation: 'fadeUp 0.4s ease' }}>

      {/* Back nav */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/carte" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-display)', fontSize: '11px',
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <ArrowLeft size={12} /> Carte
        </Link>

        {/* View mode toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '3px',
          gap: '2px',
        }}>
          {[
            { key: 'gallery', icon: Images,  label: 'Photos' },
            { key: 'pano',    icon: Globe,   label: '360°' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 10px', borderRadius: '6px',
                fontFamily: 'var(--font-display)', fontSize: '10px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: viewMode === key ? 'var(--accent)' : 'transparent',
                color: viewMode === key ? '#fff' : 'var(--muted)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px 14px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '44px', lineHeight: 0.9, letterSpacing: '0.02em' }}>
          {fresque.titre}
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '14px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            <Eye size={13} color="var(--accent)" />
            {views} vues
          </div>

          <button
            type="button"
            onClick={shareFresque}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              minHeight: '36px',
              padding: '0 13px',
              borderRadius: '999px',
              background: shareStatus === 'Lien copié' ? 'rgba(0,180,100,0.16)' : 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {shareStatus === 'Lien copié' ? <Check size={13} /> : <Share2 size={13} />}
            {shareStatus || 'Partager'}
          </button>
        </div>
      </div>

      {isQrEntry && (
        <div style={{
          margin: '0 20px 14px',
          padding: '14px',
          borderRadius: '12px',
          background: 'rgba(255,59,31,0.14)',
          border: '1px solid rgba(255,59,31,0.36)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <QrCode size={18} color="var(--accent)" style={{ flex: '0 0 auto', marginTop: '2px' }} />
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              lineHeight: 1.3,
            }}>
              QR mural scanné
            </p>
            <p style={{ marginTop: '5px', fontSize: '12px', lineHeight: 1.45, color: 'rgba(245,240,232,0.72)' }}>
              Cette fresque a été ajoutée à ton passeport de visite.
            </p>
          </div>
        </div>
      )}

      <div style={{
        margin: '0 20px 18px',
        padding: '14px',
        borderRadius: '12px',
        background: isVisited ? 'rgba(0,180,100,0.12)' : 'var(--card)',
        border: `1px solid ${isVisited ? 'rgba(0,180,100,0.34)' : 'var(--border)'}`,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '12px',
        alignItems: 'center',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isVisited ? <CheckCircle2 size={15} color="#00b464" /> : <Award size={15} color="var(--accent2)" />}
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              color: isVisited ? '#00b464' : 'var(--accent2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {isVisited ? 'Dans ton passeport' : 'Passeport de visite'}
            </span>
          </div>
          <p style={{ marginTop: '5px', fontSize: '12px', color: 'rgba(245,240,232,0.62)', lineHeight: 1.35 }}>
            {visitedCount} fresque{visitedCount > 1 ? 's' : ''} déjà validée{visitedCount > 1 ? 's' : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVisited}
          style={{
            minHeight: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            background: isVisited ? 'rgba(255,255,255,0.08)' : 'var(--accent)',
            color: isVisited ? 'rgba(245,240,232,0.8)' : '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: '9px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {isVisited ? 'Retirer' : 'Marquer vue'}
        </button>
      </div>

      {/* Media viewer */}
      {viewMode === 'gallery'
        ? <PhotoGallery photos={photos} titre={fresque.titre} />
        : <PanoViewer imageUrl={fresque.photo_url} titre={fresque.titre} />
      }

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
      <div style={{ padding: '16px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {fresque.adresse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={12} color="var(--muted)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--muted)' }}>{fresque.adresse}</span>
          </div>
        )}
        {fresque.date_creation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={12} color="var(--muted)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--muted)' }}>
              {new Date(fresque.date_creation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
        {photos.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Images size={12} color="var(--muted)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--muted)' }}>
              {photos.length} photos
            </span>
          </div>
        )}
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
          padding: '20px', borderBottom: '1px solid var(--border)',
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <img
            src={artiste.photo_url} alt={artiste.nom}
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
      {artiste && (artiste.instagram || artiste.soundcloud || artiste.youtube) && (
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
      <div style={{ padding: '24px 20px 80px' }}>
        <button
          onClick={() => setShowQr(!showQr)}
          style={{
            width: '100%',
            background: showQr ? 'var(--card)' : 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-display)',
            fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '14px', borderRadius: 'var(--radius)', transition: 'all 0.2s',
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
            <div style={{ background: 'var(--paper)', padding: '16px', borderRadius: 'var(--radius)' }}>
              <img src={qrDataUrl} alt="QR code" style={{ width: '160px', height: '160px' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Scanne sur le mur pour ouvrir cette fiche et valider le passeport
            </p>
            <button onClick={downloadQR} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '12px 20px', borderRadius: 'var(--radius)',
            }}>
              <Download size={14} /> Télécharger PNG
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
