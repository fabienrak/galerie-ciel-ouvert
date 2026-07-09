import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getFresques } from '../lib/supabase.js'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react'

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
const EARTH_RADIUS_METERS = 6371000
const DEFAULT_NEARBY_RADIUS = 600
const NEARBY_RADIUS_OPTIONS = [
  { value: 300, label: '300 m' },
  { value: 600, label: '600 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
]

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

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toRadians(value) {
  return Number(value) * Math.PI / 180
}

function getDistanceMeters(origin, fresque) {
  if (!origin || !hasValidCoordinates(fresque)) return Infinity

  const [lng, lat] = getLngLat(fresque)
  const dLat = toRadians(lat - origin.lat)
  const dLng = toRadians(lng - origin.lng)
  const originLat = toRadians(origin.lat)
  const targetLat = toRadians(lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(dLng / 2) ** 2

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(meters) {
  const value = Number(meters)
  if (!Number.isFinite(value)) return 'distance inconnue'
  if (value < 50) return 'moins de 50 m'
  if (value < 1000) return `${Math.round(value)} m`
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0).replace('.', ',')} km`
}

function getGeolocationErrorMessage(error) {
  if (error?.code === 1) return 'Autorise la localisation pour voir les fresques autour de toi.'
  if (error?.code === 2) return 'Position introuvable pour le moment.'
  if (error?.code === 3) return 'La localisation prend trop de temps. Réessaie.'
  return 'La localisation n’est pas disponible sur cet appareil.'
}

function getMapboxErrorMessage(error) {
  return String(error?.message || error?.error?.message || error?.statusText || '')
}

function isMapboxAuthError(message) {
  const text = message.toLowerCase()

  return [
    'invalid token',
    'access token invalid',
    'token is invalid',
    'token has expired',
    'unauthorized',
    'not authorized',
    'forbidden',
    '401',
    '403',
  ].some(pattern => text.includes(pattern))
}

function isNonCriticalMapboxResourceError(message) {
  const text = message.toLowerCase()

  return (
    text.includes('/fonts/v1/') ||
    text.includes('/models/v1/') ||
    text.includes('could not load model')
  )
}

export default function MapPage() {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const markersRef   = useRef([])
  const userMarkerRef = useRef(null)
  const initialFitRef = useRef(false)
  const navigate     = useNavigate()
  const [fresques, setFresques]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [mapReady, setMapReady]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [dataError, setDataError] = useState(null)
  const [mapError, setMapError]   = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [artistFilter, setArtistFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [nearbyMode, setNearbyMode] = useState(false)
  const [nearbyRadius, setNearbyRadius] = useState(DEFAULT_NEARBY_RADIUS)
  const [nearbyIndex, setNearbyIndex] = useState(0)
  const [userPosition, setUserPosition] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  const geolocatedFresques = useMemo(() => fresques.filter(hasValidCoordinates), [fresques])
  const artistOptions = useMemo(() => {
    const byId = new Map()
    fresques.forEach(f => {
      if (!f.artiste?.id || !f.artiste?.nom) return
      byId.set(f.artiste.id, f.artiste.nom)
    })
    return Array.from(byId, ([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom))
  }, [fresques])
  const tagOptions = useMemo(() => {
    const tags = new Set()
    fresques.forEach(f => {
      if (!Array.isArray(f.tags)) return
      f.tags.forEach(tag => {
        if (tag) tags.add(tag)
      })
    })
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [fresques])
  const visibleFresques = useMemo(() => {
    const q = normalizeText(searchTerm.trim())

    return geolocatedFresques.filter(f => {
      const tags = Array.isArray(f.tags) ? f.tags : []
      const matchesSearch = !q || [
        f.titre,
        f.description,
        f.adresse,
        f.artiste?.nom,
        ...tags,
      ].some(value => normalizeText(value).includes(q))
      const matchesArtist = !artistFilter || f.artiste?.id === artistFilter || f.artiste_id === artistFilter
      const matchesTag = !tagFilter || tags.includes(tagFilter)

      return matchesSearch && matchesArtist && matchesTag
    })
  }, [artistFilter, geolocatedFresques, searchTerm, tagFilter])
  const nearbyCandidates = useMemo(() => {
    if (!userPosition) return []

    return visibleFresques
      .map(f => ({
        ...f,
        distanceMeters: getDistanceMeters(userPosition, f),
      }))
      .filter(f => Number.isFinite(f.distanceMeters))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
  }, [userPosition, visibleFresques])
  const nearbyMatches = useMemo(() => {
    return nearbyCandidates.filter(f => f.distanceMeters <= nearbyRadius)
  }, [nearbyCandidates, nearbyRadius])
  const nearbyDiscoveryFresques = useMemo(() => {
    if (!nearbyMode || !userPosition) return []
    return nearbyMatches.length > 0 ? nearbyMatches : nearbyCandidates.slice(0, 3)
  }, [nearbyCandidates, nearbyMatches, nearbyMode, userPosition])
  const mapFresques = useMemo(() => {
    if (nearbyMode && userPosition) return nearbyDiscoveryFresques
    return visibleFresques
  }, [nearbyDiscoveryFresques, nearbyMode, userPosition, visibleFresques])
  const activeNearbyFresque = nearbyDiscoveryFresques.length > 0
    ? nearbyDiscoveryFresques[nearbyIndex % nearbyDiscoveryFresques.length]
    : null
  const filtersActive = Boolean(searchTerm.trim() || artistFilter || tagFilter)
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
      const error = event?.error || event
      const message = getMapboxErrorMessage(error)

      if (isMapboxAuthError(message)) {
        console.error('Mapbox auth error:', error)
        setMapError('La clé Mapbox est invalide ou expirée.')
        return
      }

      if (isNonCriticalMapboxResourceError(message)) {
        console.debug('Ressource Mapbox non critique ignorée:', message)
        return
      }

      if (instance.loaded() && message.toLowerCase().includes('networkerror')) {
        console.debug('Erreur réseau Mapbox ignorée après chargement:', message)
        return
      }

      console.error('Mapbox error:', error)
      setMapError('La carte n’a pas pu se charger correctement.')
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
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      instance.remove()
      map.current = null
    }
  }, [])

  /* ── Place markers when map + data ready ── */
  useEffect(() => {
    if (!mapReady || !map.current) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (mapFresques.length === 0) return

    mapFresques.forEach(f => {
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

        openFresquePreview(f)
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
  }, [mapReady, mapFresques])

  useEffect(() => {
    if (!selected) return

    const handleKeyDown = event => {
      if (event.key === 'Escape') closePanel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected])

  useEffect(() => {
    if (!nearbyMode || !activeNearbyFresque || selected) return
    setActiveMarkerById(activeNearbyFresque.id)
  }, [activeNearbyFresque?.id, nearbyMode, selected])

  useEffect(() => {
    if (!selected) return
    if (mapFresques.some(f => f.id === selected.id)) return
    closePanel()
  }, [selected, mapFresques])

  useEffect(() => {
    if (!mapReady || !map.current || !filtersActive) return
    window.requestAnimationFrame(() => focusFresques({ duration: 600 }))
  }, [filtersActive, mapReady, mapFresques])

  useEffect(() => {
    if (nearbyDiscoveryFresques.length === 0) {
      setNearbyIndex(0)
      return
    }

    setNearbyIndex(index => Math.min(index, nearbyDiscoveryFresques.length - 1))
  }, [nearbyDiscoveryFresques.length])

  useEffect(() => {
    if (!mapReady || !map.current) return

    if (!nearbyMode || !userPosition) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    if (!userMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'gco-user-marker'
      el.setAttribute('aria-hidden', 'true')

      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map.current)
      return
    }

    userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat])
  }, [mapReady, nearbyMode, userPosition])

  useEffect(() => {
    if (!mapReady || !map.current || !nearbyMode || !userPosition) return

    window.requestAnimationFrame(() => {
      if (nearbyDiscoveryFresques.length > 0) {
        focusFresques({
          duration: 700,
          fresquesToFit: nearbyDiscoveryFresques.slice(0, 4),
        })
        return
      }

      map.current.flyTo({
        center: ANKADIVATO_CENTER,
        zoom: 16,
        pitch: 34,
        bearing: -10,
        duration: 700,
        essential: true,
      })
    })
  }, [mapReady, nearbyDiscoveryFresques, nearbyMode, userPosition])

  function clearActiveMarkers() {
    mapContainer.current
      ?.querySelectorAll('.gco-photo-marker')
      .forEach(m => m.classList.remove('active'))
  }

  function setActiveMarkerById(id) {
    clearActiveMarkers()
    mapContainer.current
      ?.querySelectorAll('.gco-photo-marker')
      .forEach(m => {
        if (m.dataset.id === String(id)) m.classList.add('active')
      })
  }

  function openFresquePreview(fresque, { openPanel = true } = {}) {
    if (!fresque) return

    if (map.current && hasValidCoordinates(fresque)) {
      map.current.flyTo({
        center: getLngLat(fresque),
        zoom: Math.min(18, Math.max(map.current.getZoom(), 17.35)),
        pitch: 42,
        bearing: -8,
        offset: [0, -72],
        duration: 800,
        essential: true,
      })
    }

    if (openPanel) setSelected(fresque)
    setActiveMarkerById(fresque.id)
  }

  function focusFresques({ duration = 800, panelOpen = false, fresquesToFit = mapFresques } = {}) {
    if (!map.current) return

    if (fresquesToFit.length === 0) {
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

    if (fresquesToFit.length === 1) {
      map.current.flyTo({
        center: getLngLat(fresquesToFit[0]),
        zoom: 17.2,
        pitch: 38,
        bearing: -8,
        duration,
        essential: true,
      })
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    fresquesToFit.forEach(f => bounds.extend(getLngLat(f)))
    map.current.fitBounds(bounds, {
      padding: {
        top: nearbyMode && userPosition ? 258 : 220,
        right: 64,
        bottom: panelOpen ? 230 : nearbyMode && userPosition ? 210 : 92,
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

  function clearFilters() {
    setSearchTerm('')
    setArtistFilter('')
    setTagFilter('')
    closePanel()
    window.requestAnimationFrame(() => {
      focusFresques({
        duration: 700,
        fresquesToFit: nearbyMode && userPosition && nearbyDiscoveryFresques.length > 0
          ? nearbyDiscoveryFresques
          : geolocatedFresques,
      })
    })
  }

  function requestNearbyDiscovery() {
    setLocationError('')

    if (!('geolocation' in navigator)) {
      setLocationError('La localisation n’est pas disponible sur cet appareil.')
      return
    }

    if (userPosition && !locating) {
      setNearbyMode(true)
      setNearbyIndex(0)
      closePanel()
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setNearbyMode(true)
        setNearbyIndex(0)
        setLocating(false)
        closePanel()
      },
      error => {
        setLocating(false)
        setNearbyMode(false)
        setLocationError(getGeolocationErrorMessage(error))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      },
    )
  }

  function disableNearbyDiscovery() {
    setNearbyMode(false)
    setLocationError('')
    setNearbyIndex(0)
    closePanel()
    window.requestAnimationFrame(() => focusFresques({ duration: 700, fresquesToFit: visibleFresques }))
  }

  function showNextNearby() {
    if (nearbyDiscoveryFresques.length < 2) return
    setNearbyIndex(index => (index + 1) % nearbyDiscoveryFresques.length)
  }

  function showPreviousNearby() {
    if (nearbyDiscoveryFresques.length < 2) return
    setNearbyIndex(index => (
      index === 0 ? nearbyDiscoveryFresques.length - 1 : index - 1
    ))
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
          {nearbyMode && userPosition
            ? `${mapFresques.length} proches`
            : `${visibleFresques.length} fresques`}
        </span>
      </div>

      {/* ── Search + filters ── */}
      <div className="gco-map-search">
        <div className="gco-map-search-row">
          <Search size={15} color="#777" strokeWidth={2.2} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher une fresque"
            aria-label="Rechercher une fresque"
          />
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Effacer la recherche et les filtres"
              title="Effacer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="gco-map-filter-row">
          <select
            value={artistFilter}
            onChange={e => setArtistFilter(e.target.value)}
            aria-label="Filtrer par artiste"
          >
            <option value="">Tous les artistes</option>
            {artistOptions.map(artist => (
              <option key={artist.id} value={artist.id}>{artist.nom}</option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            aria-label="Filtrer par tag"
          >
            <option value="">Tous les tags</option>
            {tagOptions.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="gco-nearby-launch-row">
          <button
            type="button"
            className={`gco-nearby-launch ${nearbyMode ? 'is-active' : ''}`}
            onClick={requestNearbyDiscovery}
            disabled={locating || !mapReady || loading}
          >
            <LocateFixed size={14} strokeWidth={2.4} />
            <span>{locating ? 'Localisation...' : nearbyMode ? 'Proximité active' : 'Découvrir près de moi'}</span>
          </button>

          {nearbyMode && userPosition && (
            <select
              className="gco-nearby-radius"
              value={nearbyRadius}
              onChange={e => setNearbyRadius(Number(e.target.value))}
              aria-label="Rayon de proximité"
            >
              {NEARBY_RADIUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}

          {nearbyMode && (
            <button
              type="button"
              className="gco-nearby-clear"
              onClick={disableNearbyDiscovery}
              aria-label="Désactiver la proximité"
              title="Désactiver"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {locationError && (
          <div className="gco-nearby-status">
            <AlertTriangle size={13} />
            {locationError}
          </div>
        )}
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

      {!loading && !dataError && geolocatedFresques.length === 0 && (
        <div className="gco-map-toast">
          Aucune fresque géolocalisée pour le moment.
        </div>
      )}

      {!loading && !dataError && geolocatedFresques.length > 0 && visibleFresques.length === 0 && (
        <div className="gco-map-toast">
          Aucun résultat pour ces filtres.
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

      {/* ── Nearby discovery deck ── */}
      {nearbyMode && userPosition && !selected && (
        <div className="gco-nearby-panel">
          <div className="gco-nearby-panel-head">
            <div>
              <span>À proximité</span>
              <strong>
                {nearbyMatches.length > 0
                  ? `${nearbyMatches.length} dans ${formatDistance(nearbyRadius)}`
                  : 'Les plus proches'}
              </strong>
            </div>
            {nearbyDiscoveryFresques.length > 1 && (
              <div className="gco-nearby-stepper">
                <button
                  type="button"
                  onClick={showPreviousNearby}
                  aria-label="Fresque précédente"
                >
                  <ChevronLeft size={15} />
                </button>
                <span>{nearbyIndex % nearbyDiscoveryFresques.length + 1}/{nearbyDiscoveryFresques.length}</span>
                <button
                  type="button"
                  onClick={showNextNearby}
                  aria-label="Fresque suivante"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {activeNearbyFresque ? (
            <div className="gco-nearby-card">
              <button
                type="button"
                className="gco-nearby-card-media"
                onClick={() => openFresquePreview(activeNearbyFresque)}
                aria-label={`Voir ${activeNearbyFresque.titre || 'cette fresque'}`}
                style={{
                  backgroundImage: getPhotoUrl(activeNearbyFresque)
                    ? `url("${escapeCssUrl(getPhotoUrl(activeNearbyFresque))}")`
                    : 'linear-gradient(135deg, #ff3b1f, #1a1a1a)',
                }}
              >
                <span>{formatDistance(activeNearbyFresque.distanceMeters)}</span>
              </button>

              <div className="gco-nearby-card-body">
                <div>
                  <p>{activeNearbyFresque.artiste?.nom || 'Artiste inconnu'}</p>
                  <h3>{activeNearbyFresque.titre || 'Fresque'}</h3>
                  <small>{activeNearbyFresque.adresse || activeNearbyFresque.tags?.slice(0, 2).join(' · ') || 'Quartier galerie'}</small>
                </div>

                <div className="gco-nearby-card-actions">
                  <button
                    type="button"
                    onClick={() => openFresquePreview(activeNearbyFresque, { openPanel: false })}
                    aria-label="Centrer sur la carte"
                    title="Centrer"
                  >
                    <Navigation size={14} />
                  </button>
                  <button type="button" onClick={showNextNearby} disabled={nearbyDiscoveryFresques.length < 2}>
                    Passer
                  </button>
                  <button type="button" onClick={() => openFresquePreview(activeNearbyFresque)}>
                    Découvrir <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gco-nearby-empty">
              Aucune fresque disponible avec ces filtres.
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
          border: 2px solid rgba(255,59,31,0.72);
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

        .gco-map-search {
          position: absolute;
          top: 68px;
          left: 16px;
          right: 16px;
          z-index: 12;
          max-width: 560px;
          margin: 0 auto;
          display: grid;
          gap: 8px;
          pointer-events: none;
        }

        .gco-map-search-row,
        .gco-map-filter-row {
          pointer-events: auto;
        }

        .gco-map-search-row {
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px 0 12px;
          border-radius: 14px;
          background: rgba(255,255,255,0.94);
          box-shadow: 0 4px 18px rgba(0,0,0,0.14);
          backdrop-filter: blur(12px);
        }

        .gco-map-search-row input {
          flex: 1;
          min-width: 0;
          height: 42px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1a1a1a;
          font-family: var(--font-display);
          font-size: 12px;
          letter-spacing: 0.04em;
        }

        .gco-map-search-row input::placeholder {
          color: rgba(26,26,26,0.48);
        }

        .gco-map-search-row button {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(26,26,26,0.08);
          color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .gco-map-filter-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 8px;
        }

        .gco-map-filter-row select {
          min-width: 0;
          height: 34px;
          border: 0;
          border-radius: 11px;
          padding: 0 10px;
          outline: 0;
          background: rgba(26,26,26,0.84);
          color: #fff;
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 16px rgba(0,0,0,0.16);
        }

        .gco-nearby-launch-row {
          pointer-events: auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 8px;
          align-items: center;
        }

        .gco-nearby-launch,
        .gco-nearby-radius,
        .gco-nearby-clear {
          height: 36px;
          border: 0;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.14);
          backdrop-filter: blur(12px);
        }

        .gco-nearby-launch {
          min-width: 0;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255,59,31,0.95);
          color: #fff;
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .gco-nearby-launch:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .gco-nearby-launch.is-active {
          background: rgba(26,26,26,0.92);
        }

        .gco-nearby-launch span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gco-nearby-radius {
          min-width: 88px;
          padding: 0 10px;
          background: rgba(255,255,255,0.94);
          color: #1a1a1a;
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 0.04em;
        }

        .gco-nearby-clear {
          width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.94);
          color: #1a1a1a;
        }

        .gco-nearby-status {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 11px;
          border-radius: 12px;
          background: rgba(255,255,255,0.96);
          color: #1a1a1a;
          font-family: var(--font-display);
          font-size: 10px;
          line-height: 1.25;
          letter-spacing: 0.03em;
          box-shadow: 0 4px 16px rgba(0,0,0,0.14);
        }

        .gco-user-marker {
          position: relative;
          width: 18px;
          height: 18px;
          border: 3px solid #fff;
          border-radius: 50%;
          background: #2563eb;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.35), 0 8px 18px rgba(0,0,0,0.22);
        }

        .gco-user-marker::after {
          content: '';
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: rgba(37,99,235,0.16);
          animation: userPulse 1.8s ease-out infinite;
        }

        .gco-nearby-panel {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 19;
          width: min(420px, calc(100% - 32px));
          margin: 0 auto;
          padding: 10px;
          border-radius: 14px;
          background: rgba(255,255,255,0.96);
          box-shadow: 0 18px 45px rgba(0,0,0,0.2);
          backdrop-filter: blur(14px);
          animation: slideUpPanel 0.3s ease both;
        }

        .gco-nearby-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 9px;
        }

        .gco-nearby-panel-head div:first-child {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .gco-nearby-panel-head span {
          font-family: var(--font-display);
          font-size: 9px;
          color: #ff3b1f;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .gco-nearby-panel-head strong {
          font-family: var(--font-display);
          font-size: 13px;
          color: #1a1a1a;
          letter-spacing: 0.04em;
          line-height: 1;
          white-space: nowrap;
        }

        .gco-nearby-stepper {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .gco-nearby-stepper button {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(26,26,26,0.08);
          color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gco-nearby-stepper span {
          min-width: 34px;
          text-align: center;
          color: #666;
        }

        .gco-nearby-card {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          min-height: 126px;
          border-radius: 10px;
          overflow: hidden;
          background: #f4f0e8;
        }

        .gco-nearby-card-media {
          position: relative;
          min-height: 126px;
          border: 0;
          background-size: cover;
          background-position: center;
        }

        .gco-nearby-card-media::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.04), rgba(0,0,0,0.45));
        }

        .gco-nearby-card-media span {
          position: absolute;
          left: 8px;
          bottom: 8px;
          z-index: 1;
          max-width: calc(100% - 16px);
          padding: 5px 7px;
          border-radius: 999px;
          background: rgba(255,59,31,0.92);
          color: #fff;
          font-family: var(--font-display);
          font-size: 9px;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .gco-nearby-card-body {
          min-width: 0;
          padding: 11px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
        }

        .gco-nearby-card-body p {
          margin: 0 0 4px;
          font-family: var(--font-display);
          font-size: 9px;
          color: #ff3b1f;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .gco-nearby-card-body h3 {
          margin: 0;
          color: #1a1a1a;
          font-family: var(--font-display);
          font-size: 18px;
          line-height: 0.98;
          letter-spacing: 0.03em;
          overflow-wrap: anywhere;
        }

        .gco-nearby-card-body small {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 11px;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .gco-nearby-card-actions {
          display: grid;
          grid-template-columns: 34px minmax(0, 0.85fr) minmax(0, 1fr);
          gap: 7px;
        }

        .gco-nearby-card-actions button {
          min-width: 0;
          height: 34px;
          border: 0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          background: #fff;
          color: #1a1a1a;
          font-family: var(--font-display);
          font-size: 9px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          box-shadow: inset 0 0 0 1px rgba(26,26,26,0.08);
        }

        .gco-nearby-card-actions button:disabled {
          opacity: 0.42;
          cursor: default;
        }

        .gco-nearby-card-actions button:last-child {
          background: #1a1a1a;
          color: #fff;
          box-shadow: none;
        }

        .gco-nearby-empty {
          padding: 16px;
          border-radius: 10px;
          background: #f4f0e8;
          color: #666;
          font-family: var(--font-display);
          font-size: 11px;
          letter-spacing: 0.04em;
          text-align: center;
        }

        /* Mapbox overrides */
        .mapboxgl-ctrl-top-right {
          top: 214px !important;
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

          .gco-map-search {
            left: 12px;
            right: 12px;
          }

          .gco-map-filter-row {
            grid-template-columns: 1fr;
          }

          .gco-nearby-launch-row {
            grid-template-columns: minmax(0, 1fr) auto;
          }

          .gco-nearby-clear {
            grid-column: 2;
            grid-row: 1;
          }

          .gco-nearby-radius {
            grid-column: 1 / -1;
            grid-row: 2;
            width: 100%;
          }

          .gco-nearby-panel {
            left: 12px;
            right: 12px;
            bottom: 12px;
            width: calc(100% - 24px);
            padding: 8px;
          }

          .gco-nearby-card {
            grid-template-columns: 94px minmax(0, 1fr);
          }

          .gco-nearby-card-actions {
            grid-template-columns: 34px minmax(0, 1fr);
          }

          .gco-nearby-card-actions button:nth-child(2) {
            display: none;
          }

          .mapboxgl-ctrl-top-right {
            top: 268px !important;
          }
        }

        @keyframes slideUpPanel {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes userPulse {
          from { transform: scale(0.55); opacity: 0.65; }
          to { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
