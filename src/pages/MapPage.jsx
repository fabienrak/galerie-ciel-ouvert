import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getFresques } from '../lib/supabase.js'
import { ArrowRight, X, MapPin, Calendar } from 'lucide-react'

// ── Mets ta clé Mapbox ici ou dans .env ──────────────────
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN'

// Style Mapbox clair et moderne
const MAP_STYLE = 'mapbox://styles/fabienrak/cmqphszet002101s35j4n9dgw'

const ANKADIVATO_CENTER = [47.5290, -18.9102]
const ANKADIVATO_BOUNDS = [
  [47.5245, -18.9150],
  [47.5340, -18.9060],
]

export default function MapPage() {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const markersRef   = useRef([])
  const navigate     = useNavigate()
  const [fresques, setFresques]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [mapReady, setMapReady]   = useState(false)

  /* ── Load fresques ── */
  useEffect(() => {
    getFresques().then(setFresques)
  }, [])

  /* ── Init Mapbox ── */
  useEffect(() => {
    if (map.current || !mapContainer.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: ANKADIVATO_CENTER,
      zoom: 16,
      minZoom: 15,
      maxZoom: 18.5,
      maxBounds: ANKADIVATO_BOUNDS,
      pitch: 30,
      bearing: -10,
      attributionControl: false,
    })

    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.current.on('load', () => {
      /* Style tweaks — make streets pop, buildings subtle */
      const m = map.current

      /* 3D buildings */
      if (m.getLayer('building')) {
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
      }

      setMapReady(true)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      map.current?.remove()
      map.current = null
    }
  }, [])

  /* ── Place markers when map + data ready ── */
  useEffect(() => {
    if (!mapReady || !map.current || fresques.length === 0) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    fresques.forEach(f => {
      /* Pill marker element */
      const el = document.createElement('div')
      el.className = 'gco-marker'
      el.innerHTML = `
        <div class="gco-marker-inner" data-id="${f.id}">
          <div class="gco-marker-dot"></div>
          <span class="gco-marker-label">${f.titre.length > 10 ? f.titre.slice(0, 9) + '…' : f.titre}</span>
        </div>`

      el.addEventListener('click', () => {
        /* Animate fly-to */
        map.current.flyTo({
          center: [f.lng, f.lat],
          zoom: 17.5,
          pitch: 45,
          bearing: Math.random() * 20 - 10,
          duration: 900,
          essential: true,
        })
        setSelected(f)
        /* Highlight active */
        document.querySelectorAll('.gco-marker-inner').forEach(m => m.classList.remove('active'))
        el.querySelector('.gco-marker-inner').classList.add('active')
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([f.lng, f.lat])
        .addTo(map.current)

      markersRef.current.push(marker)
    })
  }, [mapReady, fresques])

  function closePanel() {
    setSelected(null)
    document.querySelectorAll('.gco-marker-inner').forEach(m => m.classList.remove('active'))
    map.current?.flyTo({
      center: ANKADIVATO_CENTER,
      zoom: 16, pitch: 30, bearing: -10, duration: 800,
    })
  }

  return (
    <div style={{ position: 'relative', height: '100svh', background: '#f0ede6' }}>

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
          {fresques.length} fresques
        </span>
      </div>

      {/* ── Detail panel (bottom sheet) ── */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: '72px', left: '12px', right: '12px',
          zIndex: 20,
          background: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          animation: 'slideUpPanel 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {/* Photo */}
          <div style={{
            height: '140px',
            backgroundImage: `url(${selected.photo_url})`,
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
              style={{
                position: 'absolute', top: '10px', right: '10px',
                width: '30px', height: '30px',
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
            {selected.tags?.length > 0 && (
              <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', gap: '6px' }}>
                {selected.tags.slice(0, 2).map(t => (
                  <span key={t} style={{
                    background: 'rgba(255,59,31,0.85)',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '3px 8px',
                    borderRadius: '10px',
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px', letterSpacing: '0.04em',
                  color: '#1a1a1a', lineHeight: 1,
                }}>
                  {selected.titre}
                </h2>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginTop: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selected.artiste?.photo_url && (
                      <img
                        src={selected.artiste.photo_url}
                        style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: '#ff3b1f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {selected.artiste?.nom}
                    </span>
                  </div>
                  {selected.date_creation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={10} color="#999" />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: '#999' }}>
                        {new Date(selected.date_creation).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p style={{
              fontSize: '13px', color: '#666', lineHeight: 1.6,
              marginTop: '10px',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {selected.description}
            </p>

            <button
              onClick={() => navigate(`/fresque/${selected.slug}`)}
              style={{
                marginTop: '12px',
                width: '100%',
                background: '#1a1a1a',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
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
        .gco-marker { cursor: pointer; }

        .gco-marker-inner {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #1a1a1a;
          color: #fff;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 7px 13px 7px 9px;
          border-radius: 24px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
          transform-origin: bottom center;
          position: relative;
          white-space: nowrap;
        }

        .gco-marker-inner::after {
          content: '';
          position: absolute;
          bottom: -7px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid #1a1a1a;
          transition: border-top-color 0.2s;
        }

        .gco-marker-inner:hover,
        .gco-marker-inner.active {
          background: #ff3b1f;
          box-shadow: 0 4px 20px rgba(255,59,31,0.4);
          transform: scale(1.08) translateY(-2px);
        }

        .gco-marker-inner.active::after,
        .gco-marker-inner:hover::after {
          border-top-color: #ff3b1f;
        }

        .gco-marker-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #ff3b1f;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .gco-marker-inner:hover .gco-marker-dot,
        .gco-marker-inner.active .gco-marker-dot {
          background: rgba(255,255,255,0.8);
        }

        /* Mapbox overrides */
        .mapboxgl-ctrl-bottom-right { bottom: 80px !important; }
        .mapboxgl-ctrl-bottom-left  { bottom: 80px !important; }
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

        @keyframes slideUpPanel {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
