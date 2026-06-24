import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Maximize2, X, RotateCcw, Smartphone } from 'lucide-react'

export default function PanoViewer({ imageUrl, titre }) {
  const mountRef   = useRef(null)
  const sceneRef   = useRef({})
  const [active, setActive]     = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [hint, setHint]         = useState(true)
  const [gyroAvail, setGyroAvail] = useState(false)
  const [gyroOn, setGyroOn]     = useState(false)

  /* ── Boot Three.js ── */
  useEffect(() => {
    if (!active || !mountRef.current) return

    const el = mountRef.current
    const W  = el.clientWidth
    const H  = el.clientHeight

    /* Scene */
    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000)
    camera.position.set(0, 0, 0.01)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(W, H)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    /* Sphere */
    const geo = new THREE.SphereGeometry(500, 60, 40)
    geo.scale(-1, 1, 1)
    const tex = new THREE.TextureLoader().load(imageUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshBasicMaterial({ map: tex })
    scene.add(new THREE.Mesh(geo, mat))

    /* State */
    let lon = 0, lat = 0
    let isPointer = false
    let startX = 0, startY = 0
    let startLon = 0, startLat = 0
    let momentum = { x: 0, y: 0 }
    let lastMoveX = 0, lastMoveY = 0
    let autoSpin = true
    const PHI_MIN = THREE.MathUtils.degToRad(-85)
    const PHI_MAX = THREE.MathUtils.degToRad(85)

    /* Pointer drag */
    function onDown(e) {
      isPointer = true
      autoSpin  = false
      momentum  = { x: 0, y: 0 }
      const p   = e.touches ? e.touches[0] : e
      startX = p.clientX; startY = p.clientY
      startLon = lon;      startLat = lat
    }
    function onMove(e) {
      if (!isPointer) return
      const p = e.touches ? e.touches[0] : e
      const dx = p.clientX - startX
      const dy = p.clientY - startY
      lon = startLon - dx * 0.18
      lat = Math.max(-85, Math.min(85, startLat + dy * 0.18))
      momentum.x = p.clientX - lastMoveX
      momentum.y = p.clientY - lastMoveY
      lastMoveX  = p.clientX
      lastMoveY  = p.clientY
    }
    function onUp() {
      isPointer = false
    }

    /* Pinch zoom */
    let lastPinch = null
    let fov = 75
    function onTouchMove(e) {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        if (lastPinch) {
          fov = Math.max(30, Math.min(100, fov - (d - lastPinch) * 0.1))
          camera.fov = fov
          camera.updateProjectionMatrix()
        }
        lastPinch = d
      } else {
        lastPinch = null
        onMove(e)
      }
    }
    function onWheel(e) {
      fov = Math.max(30, Math.min(100, fov + e.deltaY * 0.05))
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    /* Gyroscope */
    let gyroHandler = null
    function enableGyro() {
      gyroHandler = (e) => {
        if (!e.beta && !e.gamma) return
        lat = Math.max(-85, Math.min(85, e.beta - 45))
        lon = -e.gamma * 1.2
        autoSpin = false
      }
      window.addEventListener('deviceorientation', gyroHandler)
    }
    function disableGyro() {
      if (gyroHandler) window.removeEventListener('deviceorientation', gyroHandler)
    }

    /* Expose gyro toggles to React */
    sceneRef.current.enableGyro  = enableGyro
    sceneRef.current.disableGyro = disableGyro

    /* Events */
    el.addEventListener('mousedown',  onDown)
    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseup',    onUp)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('touchstart', onDown,     { passive: true })
    el.addEventListener('touchmove',  onTouchMove,{ passive: true })
    el.addEventListener('touchend',   onUp)
    el.addEventListener('wheel',      onWheel,    { passive: true })

    /* Resize */
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(el)

    /* Render loop */
    let rafId
    let spinAngle = 0
    function tick() {
      rafId = requestAnimationFrame(tick)

      if (autoSpin) {
        spinAngle += 0.04
        lon = spinAngle
      } else if (!isPointer) {
        /* momentum decay */
        lon -= momentum.x * 0.06
        lat = Math.max(-85, Math.min(85, lat + momentum.y * 0.06))
        momentum.x *= 0.90
        momentum.y *= 0.90
        /* slow drift back to auto-spin when momentum dies */
        if (Math.abs(momentum.x) < 0.01 && Math.abs(momentum.y) < 0.01) {
          spinAngle = lon
          setTimeout(() => { autoSpin = true }, 3000)
        }
      }

      const phi   = THREE.MathUtils.degToRad(90 - lat)
      const theta = THREE.MathUtils.degToRad(lon)
      camera.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      )
      renderer.render(scene, camera)
    }
    tick()

    /* Hint auto-hide */
    const hintTimer = setTimeout(() => setHint(false), 3200)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      clearTimeout(hintTimer)
      disableGyro()
      el.removeEventListener('mousedown',  onDown)
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseup',    onUp)
      el.removeEventListener('mouseleave', onUp)
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onUp)
      el.removeEventListener('wheel',      onWheel)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [active, fullscreen, imageUrl])

  /* Detect DeviceOrientation support */
  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined') setGyroAvail(true)
  }, [])

  async function toggleGyro() {
    if (!gyroOn) {
      /* iOS 13+ needs permission */
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const perm = await DeviceOrientationEvent.requestPermission()
        if (perm !== 'granted') return
      }
      sceneRef.current.enableGyro?.()
      setGyroOn(true)
    } else {
      sceneRef.current.disableGyro?.()
      setGyroOn(false)
    }
  }

  /* ── Thumbnail (before activation) ── */
  if (!active) {
    return (
      <div
        onClick={() => { setActive(true); setHint(true) }}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#111',
        }}
      >
        <img
          src={imageUrl}
          alt={titre}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.7 }}
        />
        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.6) 100%)',
        }} />
        {/* Play button */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <div style={{
            width: '56px', height: '56px',
            borderRadius: '50%',
            border: '2px solid rgba(245,240,232,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(10,10,10,0.4)',
          }}>
            <Maximize2 size={22} color="#f5f0e8" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '10px',
            color: 'rgba(245,240,232,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            Vue panoramique 3D
          </span>
        </div>
        {/* Corner badge */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(10,10,10,0.7)',
          border: '1px solid rgba(245,240,232,0.15)',
          borderRadius: '4px', padding: '4px 8px',
          fontFamily: 'var(--font-display)', fontSize: '9px',
          color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>
          360°
        </div>
      </div>
    )
  }

  /* ── Active viewer ── */
  return (
    <div style={{
      position: fullscreen ? 'fixed' : 'relative',
      inset: fullscreen ? 0 : 'auto',
      zIndex: fullscreen ? 2000 : 1,
      width: '100%',
      height: fullscreen ? '100dvh' : 'min(70vw, 340px)',
      background: '#000',
      overflow: 'hidden',
      touchAction: 'none',
    }}>
      {/* Canvas mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* Drag hint */}
      {hint && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'fadeUp 0.4s ease',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            background: 'rgba(10,10,10,0.65)',
            border: '1px solid rgba(245,240,232,0.12)',
            borderRadius: '12px', padding: '16px 24px',
            backdropFilter: 'blur(8px)',
          }}>
            {/* Hand swipe icon using unicode */}
            <div style={{ fontSize: '28px', animation: 'swipeHint 1.5s ease-in-out infinite' }}>👆</div>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '10px',
              color: 'rgba(245,240,232,0.8)', textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Fais glisser pour explorer
            </span>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px',
        display: 'flex', gap: '8px', zIndex: 10,
      }}>
        {/* Gyro toggle (mobile) */}
        {gyroAvail && (
          <button
            onClick={toggleGyro}
            title="Gyroscope"
            style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              background: gyroOn ? 'var(--accent)' : 'rgba(10,10,10,0.7)',
              border: `1px solid ${gyroOn ? 'var(--accent)' : 'rgba(245,240,232,0.2)'}`,
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
            }}
          >
            <Smartphone size={15} />
          </button>
        )}
        {/* Reset */}
        <button
          onClick={() => { setActive(false); setTimeout(() => setActive(true), 50) }}
          title="Reset"
          style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: 'rgba(10,10,10,0.7)',
            border: '1px solid rgba(245,240,232,0.2)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} />
        </button>
        {/* Fullscreen */}
        <button
          onClick={() => setFullscreen(f => !f)}
          title={fullscreen ? 'Réduire' : 'Plein écran'}
          style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: 'rgba(10,10,10,0.7)',
            border: '1px solid rgba(245,240,232,0.2)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
          }}
        >
          {fullscreen ? <X size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* Badge 360 */}
      <div style={{
        position: 'absolute', bottom: '12px', left: '12px',
        background: 'rgba(10,10,10,0.7)',
        border: '1px solid rgba(245,240,232,0.15)',
        borderRadius: '4px', padding: '4px 10px',
        fontFamily: 'var(--font-display)', fontSize: '9px',
        color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em',
        backdropFilter: 'blur(4px)',
      }}>
        360° · Pinch pour zoomer
      </div>

      <style>{`
        @keyframes swipeHint {
          0%, 100% { transform: translateX(0); }
          40%       { transform: translateX(12px); }
          60%       { transform: translateX(-12px); }
        }
      `}</style>
    </div>
  )
}
