import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getFresques } from '../lib/supabase.js'
import { AlertTriangle, ArrowRight, Calendar, Crosshair, MapPin, X } from 'lucide-react'

// ── Mets ta clé Mapbox ici ou dans .env ──────────────────
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN'

// Style Mapbox clair et moderne
const MAP_STYLE = 'mapbox://styles/fabienrak/cmqphszet002101s35j4n9dgw'
// const MAP_STYLE = 'mapbox://styles/fabienrak/cmrb3f817002c01qz1xgm01tp'

const ANKADIVATO_CENTER = [47.5348, -18.9128]
// Bounds de quartier, assez larges pour garder les fresques de demo visibles
const ANKADIVATO_BOUNDS = [
  [47.5258, -18.9170],   // SW — coin sud-ouest
  [47.5410, -18.9072],   // NE — coin nord-est
]

const HAS_MAPBOX_TOKEN = Boolean(MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN')

function hasValidCoordinates(fresque) {
  return Number.isFinite(Number(fresque?.lat)) && Number.isFinite(Number(fresque?.lng))
}

function getLngLat(fresque) {
  return [Number(fresque.lng), Number(fresque.lat)]
}

function getPhotoUrl(fresque) {
  const photos = Array.isArray(fresque?.photos) ? fresque.photos : []
  return fresque?.photo_url || photos.find(Boolean) || ''
}

function escapeCssUrl(url) {
  return String(url).replace(/"/g, '\\"')
}

function formatCreationDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

export default function MapPage() {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const markersRef   = useRef([])
  const initialFitRef = useRef(false)
  const navigate     = useNavigate()
  const [fresques, setFresques]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [mapReady, setMapReady]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [dataError, setDataError] = useState(null)
  const [mapError, setMapError]   = useState('')

  const visibleFresques = useMemo(() => fresques.filter(hasValidCoordinates), [fresques])
  const selectedPhotoUrl = getPhotoUrl(selected)
  const selectedDate = formatCreationDate(selected?.date_creation)

  /* ── Load fresques ── */
  useEffect(() => {
    let mounted = true

    setLoading(true)
    setDataError(null)

    getFresques()
      .then(data => {
        if (!mounted) return
        setFresques(Array.isArray(data) ? data : [])
      })
      .catch(error => {
        if (!mounted) return
        console.error('Erreur de chargement des fresques:', error)
        setDataError(error)
        setFresques([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  /* ── Init Mapbox ── */
  useEffect(() => {
    if (map.current || !mapContainer.current) return
    if (!HAS_MAPBOX_TOKEN) {
      setMapError('Ajoute VITE_MAPBOX_TOKEN dans ton fichier .env pour afficher la carte interactive.')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    let instance
    try {
      instance = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: ANKADIVATO_CENTER,
        zoom: 16,
        minZoom: 15.5,         // ne peut pas dézoomer hors du quartier
        maxZoom: 18.5,
        maxBounds: ANKADIVATO_BOUNDS,
        pitch: 30,
        bearing: -10,
        attributionControl: false,
        cooperativeGestures: false,
      })
    } catch (error) {
      console.error('Mapbox init error:', error)
      setMapError('La carte ne peut pas être initialisée pour le moment.')
      return
    }

    map.current = instance

    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: true }), 'top-right')

    if ('geolocation' in navigator) {
      instance.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showAccuracyCircle: true,
        showUserHeading: true,
        fitBoundsOptions: { maxZoom: 17.8 },
      }), 'top-right')
    }

    const handleMapError = event => {
      const message = event?.error?.message || ''
      console.error('Mapbox error:', event?.error || event)
      setMapError(
        message.toLowerCase().includes('token')
          ? 'La clé Mapbox est invalide ou expirée.'
          : 'La carte n’a pas pu se charger correctement.'
      )
    }

    const handleMapClick = () => {
      setSelected(null)
      clearActiveMarkers()
    }

    const handleResize = () => {
      instance.resize()
    }

    let resizeObserver = null
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(mapContainer.current)
    } else {
      window.addEventListener('resize', handleResize)
    }

    instance.on('error', handleMapError)
    instance.on('click', handleMapClick)

    instance.on('load', () => {
      /* Style tweaks — make streets pop, buildings subtle */
      const m = instance

      /* 3D buildings */
      if (m.getLayer('building') && m.getSource('composite') && !m.getLayer('buildings-3d')) {
        try {
          m.addLayer({
            id: 'buildings-3d',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#e8e4dc',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.55,
            },
          }, 'building')
        } catch (error) {
          console.warn('Impossible d’ajouter les bâtiments 3D:', error)
        }
      }

      setMapError('')
      setMapReady(true)
    })

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      instance.off('error', handleMapError)
      instance.off('click', handleMapClick)
      markersRef.current.forEach(m => m.remove())
      instance.remove()
      map.current = null
    }
  }, [])

  /* ── Place markers when map + data ready ── */
  useEffect(() => {
    if (!mapReady || !map.current) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (visibleFresques.length === 0) return

    visibleFresques.forEach(f => {
      const title = f.titre || 'Fresque'
      const thumbnailUrl = getPhotoUrl(f)
      const [lng, lat] = getLngLat(f)

      const el = document.createElement('button')
      el.className = 'gco-marker'
      el.type = 'button'
      el.setAttribute('aria-label', `Voir ${title}`)

      const marker = document.createElement('div')
      marker.className = 'gco-photo-marker'
      marker.dataset.id = f.id

      const thumb = document.createElement('div')
      thumb.className = thumbnailUrl ? 'gco-photo-marker-thumb' : 'gco-photo-marker-thumb is-empty'
      if (thumbnailUrl) {
        thumb.style.backgroundImage = `url("${escapeCssUrl(thumbnailUrl)}")`
      } else {
        thumb.textContent = title.slice(0, 1).toUpperCase()
      }

      const ring = document.createElement('div')
      ring.className = 'gco-photo-marker-ring'

      const tail = document.createElement('div')
      tail.className = 'gco-photo-marker-tail'

      const label = document.createElement('div')
      label.className = 'gco-photo-marker-label'
      label.textContent = title.length > 18 ? `${title.slice(0, 17)}…` : title

      marker.append(thumb, ring, tail, label)
      el.append(marker)

      el.addEventListener('click', event => {
        event.stopPropagation()

        /* Animate fly-to */
        map.current.flyTo({
          center: [lng, lat],
          zoom: Math.min(18, Math.max(map.current.getZoom(), 17.35)),
          pitch: 42,
          bearing: -8,
          offset: [0, -72],
          duration: 800,
          essential: true,
        })
        setSelected(f)
        /* Highlight active */
        clearActiveMarkers()
        marker.classList.add('active')
      })

      const mapMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map.current)

      markersRef.current.push(mapMarker)
    })

    if (!initialFitRef.current) {
      initialFitRef.current = true
      window.requestAnimationFrame(() => focusFresques({ duration: 0 }))
    }
  }, [mapReady, visibleFresques])

  useEffect(() => {
    if (!selected) return

    const handleKeyDown = event => {
      if (event.key === 'Escape') closePanel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected])

  function clearActiveMarkers() {
    mapContainer.current
      ?.querySelectorAll('.gco-photo-marker')
      .forEach(m => m.classList.remove('active'))
  }

  function focusFresques({ duration = 800, panelOpen = false } = {}) {
    if (!map.current) return

    if (visibleFresques.length === 0) {
      map.current.flyTo({
        center: ANKADIVATO_CENTER,
        zoom: 16,
        pitch: 30,
        bearing: -10,
        duration,
        essential: true,
      })
      return
    }

    if (visibleFresques.length === 1) {
      map.current.flyTo({
        center: getLngLat(visibleFresques[0]),
        zoom: 17.2,
        pitch: 38,
        bearing: -8,
        duration,
        essential: true,
      })
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    visibleFresques.forEach(f => bounds.extend(getLngLat(f)))
    map.current.fitBounds(bounds, {
      padding: {
        top: 112,
        right: 64,
        bottom: panelOpen ? 230 : 92,
        left: 64,
      },
      maxZoom: 17,
      duration,
      essential: true,
    })
  }

  function closePanel() {
    setSelected(null)
    clearActiveMarkers()
  }

  function resetView() {
    closePanel()
    focusFresques({ duration: 850 })
  }

  return (
    <div style={{
      position: 'relative',
      height: 'calc(100svh - 72px)',
      background: '#f0ede6',
      overflow: 'hidden',
    }}>

      {/* ── Map container ── */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* ── Header pill ── */}
      <div style={{
        position: 'absolute', top: '16px', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '32px',
        padding: '10px 20px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', gap: '10px',
        whiteSpace: 'nowrap',
      }}>
        <MapPin size={13} color="#ff3b1f" strokeWidth={2.5} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          letterSpacing: '0.06em',
          color: '#1a1a1a',
        }}>
          ANKADIVATO
        </span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '10px',
          color: '#999',
          letterSpacing: '0.08em',
        }}>
          {visibleFresques.length} fresques
        </span>
      </div>

      {/* ── Quick recenter ── */}
      <button
        type="button"
        onClick={resetView}
        aria-label="Recentrer sur les fresques"
        title="Recentrer"
        disabled={!mapReady}
        style={{
          position: 'absolute', top: '16px', left: '16px',
          zIndex: 11,
          width: '42px', height: '42px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.94)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          color: '#1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: mapReady ? 1 : 0.5,
          cursor: mapReady ? 'pointer' : 'default',
        }}
      >
        <Crosshair size={17} strokeWidth={2.2} />
      </button>

      {loading && !mapError && (
        <div className="gco-map-toast">
          Chargement des fresques...
        </div>
      )}

      {dataError && (
        <div className="gco-map-toast is-error">
          <AlertTriangle size={14} />
          Impossible de charger les fresques.
        </div>
      )}

      {!loading && !dataError && visibleFresques.length === 0 && (
        <div className="gco-map-toast">
          Aucune fresque géolocalisée pour le moment.
        </div>
      )}

      {mapError && !mapReady && (
        <div className="gco-map-fallback">
          <AlertTriangle size={22} color="#ff3b1f" />
          <h2>Carte indisponible</h2>
          <p>{mapError}</p>
          {visibleFresques.length > 0 && (
            <div className="gco-map-fallback-list">
              {visibleFresques.slice(0, 4).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => navigate(`/fresque/${f.slug}`)}
                >
                  <span
                    className="gco-map-fallback-thumb"
                    style={{
                      backgroundImage: getPhotoUrl(f)
                        ? `url("${escapeCssUrl(getPhotoUrl(f))}")`
                        : undefined,
                    }}
                  />
                  <span>{f.titre || 'Fresque'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Detail panel (bottom sheet) ── */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: '16px', left: '16px', right: '16px',
          zIndex: 20,
          maxWidth: '340px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
          animation: 'slideUpPanel 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {/* Photo */}
          <div style={{
            height: '96px',
            backgroundImage: selectedPhotoUrl
              ? `url("${escapeCssUrl(selectedPhotoUrl)}")`
              : 'linear-gradient(135deg, #ff3b1f, #1a1a1a)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)',
            }} />
            {/* Close */}
            <button
              onClick={closePanel}
              type="button"
              aria-label="Fermer les détails"
              style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}
            >
              <X size={14} />
            </button>
            {/* Tags */}
            {Array.isArray(selected.tags) && selected.tags.length > 0 && (
              <div style={{ position: 'absolute', bottom: '8px', left: '10px', display: 'flex', gap: '5px' }}>
                {selected.tags.filter(Boolean).slice(0, 2).map(t => (
                  <span key={t} style={{
                    background: 'rgba(255,59,31,0.85)',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '10px 12px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px', letterSpacing: '0.03em',
                  color: '#1a1a1a', lineHeight: 1,
                  wordBreak: 'break-word',
                }}>
                  {selected.titre || 'Fresque'}
                </h2>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginTop: '5px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selected.artiste?.photo_url && (
                      <img
                        src={selected.artiste.photo_url}
                        alt=""
                        style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', color: '#ff3b1f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {selected.artiste?.nom || 'Artiste inconnu'}
                    </span>
                  </div>
                  {selectedDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={10} color="#999" />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', color: '#999' }}>
                        {selectedDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p style={{
              fontSize: '12px', color: '#666', lineHeight: 1.35,
              marginTop: '8px',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {selected.description}
            </p>

            <button
              onClick={() => navigate(`/fresque/${selected.slug}`)}
              disabled={!selected.slug}
              style={{
                marginTop: '10px',
                width: '100%',
                background: '#1a1a1a',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: selected.slug ? 'pointer' : 'default',
                opacity: selected.slug ? 1 : 0.55,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              Voir la fresque <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Marker + panel styles ── */}
      <style>{`
        .gco-marker {
          width: 64px;
          height: 70px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          appearance: none;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
        }

        .gco-marker:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 4px;
          border-radius: 999px;
        }

        .gco-photo-marker {
          position: relative;
          width: 58px;
          height: 66px;
          transform-origin: bottom center;
          transition: transform 0.18s ease, filter 0.18s ease;
          filter: drop-shadow(0 8px 14px rgba(24,24,24,0.34));
        }

        .gco-photo-marker-thumb {
          position: absolute;
          left: 50%;
          top: 0;
          z-index: 2;
          width: 54px;
          height: 54px;
          border: 3px solid #fff;
          border-radius: 50%;
          background-color: #1a1a1a;
          background-size: cover;
          background-position: center;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.12),
            inset 0 0 0 1px rgba(255,255,255,0.24);
          transform: translateX(-50%);
        }

        .gco-photo-marker-thumb.is-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-family: var(--font-display);
          font-size: 22px;
          background:
            linear-gradient(135deg, rgba(255,59,31,0.95), rgba(26,26,26,0.95));
        }

        .gco-photo-marker-ring {
          position: absolute;
          left: 50%;
          top: -3px;
          z-index: 3;
          width: 60px;
          height: 60px;
          border: 2px solid rgba(255,59,31,0);
          border-radius: 50%;
          transform: translateX(-50%);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          pointer-events: none;
        }

        .gco-photo-marker-tail {
          position: absolute;
          left: 50%;
          top: 43px;
          z-index: 1;
          width: 18px;
          height: 18px;
          background: #fff;
          border-radius: 3px 2px 4px 2px;
          transform: translateX(-50%) rotate(45deg);
          box-shadow: 3px 3px 8px rgba(24,24,24,0.18);
        }

        .gco-photo-marker-tail::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 7px;
          height: 7px;
          border-radius: 2px;
          background: var(--accent);
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .gco-photo-marker-label {
          position: absolute;
          left: 50%;
          bottom: 72px;
          z-index: 4;
          max-width: 150px;
          transform: translateX(-50%) translateY(4px);
          opacity: 0;
          background: rgba(26,26,26,0.92);
          color: #fff;
          font-family: var(--font-display);
          font-size: 10px;
          line-height: 1.1;
          letter-spacing: 0.04em;
          padding: 6px 9px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          white-space: nowrap;
          box-shadow: 0 8px 20px rgba(0,0,0,0.28);
          pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }

        .gco-marker:hover .gco-photo-marker,
        .gco-photo-marker.active {
          transform: translateY(-5px) scale(1.1);
          filter: drop-shadow(0 12px 20px rgba(255,59,31,0.28));
        }

        .gco-marker:hover .gco-photo-marker-ring,
        .gco-marker:focus-visible .gco-photo-marker-ring,
        .gco-photo-marker.active .gco-photo-marker-ring {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(255,59,31,0.18);
        }

        .gco-marker:hover .gco-photo-marker-tail::after,
        .gco-photo-marker.active .gco-photo-marker-tail::after {
          opacity: 1;
        }

        .gco-marker:hover .gco-photo-marker-label,
        .gco-marker:focus-visible .gco-photo-marker-label,
        .gco-photo-marker.active .gco-photo-marker-label {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        /* Mapbox overrides */
        .mapboxgl-ctrl-top-right {
          top: 16px !important;
          right: 16px !important;
        }
        .mapboxgl-ctrl-top-right .mapboxgl-ctrl {
          margin: 0 0 8px 0 !important;
        }
        .mapboxgl-ctrl-bottom-left  {
          bottom: 10px !important;
          left: 10px !important;
        }
        .mapboxgl-ctrl-group {
          background: rgba(255,255,255,0.9) !important;
          backdrop-filter: blur(8px) !important;
          border-radius: 10px !important;
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important;
          overflow: hidden;
        }
        .mapboxgl-ctrl-group button {
          width: 36px !important; height: 36px !important;
        }
        .mapboxgl-ctrl-attrib {
          font-family: var(--font-display) !important;
          font-size: 9px !important;
          background: rgba(255,255,255,0.8) !important;
          border-radius: 6px !important;
          padding: 3px 8px !important;
        }

        .gco-map-toast {
          position: absolute;
          left: 50%;
          bottom: 18px;
          z-index: 15;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: calc(100% - 32px);
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(26,26,26,0.88);
          color: #fff;
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(0,0,0,0.2);
          pointer-events: none;
        }

        .gco-map-toast.is-error {
          background: rgba(255,255,255,0.95);
          color: #1a1a1a;
        }

        .gco-map-fallback {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 18;
          width: min(360px, calc(100% - 32px));
          transform: translate(-50%, -50%);
          padding: 18px;
          border-radius: 12px;
          background: rgba(255,255,255,0.96);
          box-shadow: 0 18px 45px rgba(0,0,0,0.18);
          color: #1a1a1a;
        }

        .gco-map-fallback h2 {
          margin-top: 8px;
          font-family: var(--font-display);
          font-size: 22px;
          line-height: 1;
          letter-spacing: 0.03em;
        }

        .gco-map-fallback p {
          margin-top: 8px;
          color: #666;
          font-size: 12px;
          line-height: 1.4;
        }

        .gco-map-fallback-list {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .gco-map-fallback-list button {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          padding: 7px 10px 7px 7px;
          border-radius: 8px;
          background: #f4f0e8;
          color: #1a1a1a;
          text-align: left;
          font-family: var(--font-display);
          font-size: 12px;
          letter-spacing: 0.03em;
        }

        .gco-map-fallback-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff3b1f, #1a1a1a);
          background-size: cover;
          background-position: center;
          flex: 0 0 auto;
        }

        @media (max-width: 380px) {
          .gco-map-toast {
            max-width: calc(100% - 24px);
            white-space: normal;
            border-radius: 12px;
            text-align: center;
            justify-content: center;
          }

          .gco-photo-marker-label {
            display: none;
          }
        }

        @keyframes slideUpPanel {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
