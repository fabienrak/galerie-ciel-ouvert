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
// Bounds serrés sur Ankadivato — impossible de sortir du quartier
const ANKADIVATO_BOUNDS = [
  [47.5258, -18.9138],   // SW — coin sud-ouest
  [47.5328, -18.9072],   // NE — coin nord-est
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
      minZoom: 15.5,         // ne peut pas dézoomer hors du quartier
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
      // Spray can marker SVG — style street art
      el.innerHTML = `
        <div class="gco-marker-inner" data-id="${f.id}">
          <div class="gco-marker-wrap">
            <svg class="gco-spray-icon" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Spray burst particles -->
              <circle cx="34" cy="7"  r="1.5" class="gco-spray-dot d1"/>
              <circle cx="37" cy="11" r="1"   class="gco-spray-dot d2"/>
              <circle cx="36" cy="5"  r="1"   class="gco-spray-dot d3"/>
              <circle cx="39" cy="8"  r="1.2" class="gco-spray-dot d4"/>
              <circle cx="33" cy="4"  r="0.8" class="gco-spray-dot d5"/>
              <!-- Can body -->
              <rect x="10" y="14" width="18" height="28" rx="5" fill="currentColor"/>
              <!-- Can top cap -->
              <rect x="13" y="9" width="12" height="7" rx="3" fill="currentColor" opacity="0.75"/>
              <!-- Nozzle -->
              <rect x="21" y="7" width="11" height="5" rx="2.5" fill="currentColor"/>
              <!-- Label stripe -->
              <rect x="10" y="24" width="18" height="8" rx="0" fill="white" opacity="0.15"/>
              <!-- Button on top -->
              <circle cx="17" cy="11" r="2.5" fill="white" opacity="0.3"/>
              <!-- Pin dot at bottom -->
              <circle cx="19" cy="48" r="3" fill="currentColor"/>
              <line x1="19" y1="42" x2="19" y2="45" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="gco-marker-label">${f.titre.length > 9 ? f.titre.slice(0, 8) + '…' : f.titre}</span>
          </div>
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
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #ff3b1f;
          transition: transform 0.2s, color 0.2s;
          transform-origin: bottom center;
          position: relative;
        }

        .gco-marker-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }

        .gco-spray-icon {
          width: 36px;
          height: 46px;
          filter: drop-shadow(0 3px 8px rgba(255,59,31,0.45));
          transition: filter 0.2s, transform 0.2s;
        }

        /* Spray dot particles */
        .gco-spray-dot {
          fill: #ff3b1f;
          opacity: 0;
          animation: sprayPulse 1.8s ease-in-out infinite;
        }
        .d1 { animation-delay: 0s;    }
        .d2 { animation-delay: 0.25s; }
        .d3 { animation-delay: 0.5s;  }
        .d4 { animation-delay: 0.75s; }
        .d5 { animation-delay: 1s;    }

        .gco-marker-label {
          background: #1a1a1a;
          color: #fff;
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 10px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: background 0.2s;
        }

        .gco-marker-inner:hover .gco-spray-icon,
        .gco-marker-inner.active .gco-spray-icon {
          filter: drop-shadow(0 4px 14px rgba(255,59,31,0.7));
          transform: scale(1.12) translateY(-3px);
        }

        .gco-marker-inner:hover .gco-marker-label,
        .gco-marker-inner.active .gco-marker-label {
          background: #ff3b1f;
        }

        .gco-marker-inner.active .gco-spray-dot,
        .gco-marker-inner:hover .gco-spray-dot {
          fill: #ff3b1f;
        }

        @keyframes sprayPulse {
          0%, 100% { opacity: 0;   transform: scale(0.5) translate(0,0); }
          50%       { opacity: 0.9; transform: scale(1.2) translate(2px,-2px); }
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
