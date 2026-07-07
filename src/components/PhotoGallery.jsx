import { useState, useRef, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

export default function PhotoGallery({ photos = [], titre = '' }) {
  const [activeIdx, setActiveIdx]   = useState(0)
  const [lightbox, setLightbox]     = useState(false)
  const [dragStart, setDragStart]   = useState(null)
  const [offset, setOffset]         = useState(0)
  const trackRef = useRef(null)

  const cleanPhotos = Array.from(new Set(photos.filter(Boolean)))
  const count = cleanPhotos.length

  /* ── Swipe handlers ── */
  function onPointerDown(e) {
    setDragStart(e.touches ? e.touches[0].clientX : e.clientX)
    setOffset(0)
  }
  function onPointerMove(e) {
    if (dragStart === null) return
    const x = e.touches ? e.touches[0].clientX : e.clientX
    setOffset(x - dragStart)
  }
  function onPointerUp() {
    if (Math.abs(offset) > 50) {
      if (offset < 0 && activeIdx < count - 1) setActiveIdx(i => i + 1)
      if (offset > 0 && activeIdx > 0) setActiveIdx(i => i - 1)
    }
    setDragStart(null)
    setOffset(0)
  }

  function prev() { if (activeIdx > 0) setActiveIdx(i => i - 1) }
  function next() { if (activeIdx < count - 1) setActiveIdx(i => i + 1) }

  useEffect(() => {
    if (activeIdx >= count) setActiveIdx(0)
  }, [activeIdx, count])

  /* Keyboard nav in lightbox */
  useEffect(() => {
    if (!lightbox) return
    function onKey(e) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') setLightbox(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, activeIdx])

  if (count === 0) return null

  return (
    <>
      {/* ── Main carousel ── */}
      <div style={{ position: 'relative', userSelect: 'none' }}>

        {/* Track */}
        <div
          ref={trackRef}
          style={{
            overflow: 'hidden',
            aspectRatio: '16/9',
            background: '#111',
            cursor: count > 1 ? 'grab' : 'default',
          }}
          onMouseDown={count > 1 ? onPointerDown : undefined}
          onMouseMove={count > 1 ? onPointerMove : undefined}
          onMouseUp={count > 1 ? onPointerUp : undefined}
          onMouseLeave={count > 1 ? onPointerUp : undefined}
          onTouchStart={count > 1 ? onPointerDown : undefined}
          onTouchMove={count > 1 ? onPointerMove : undefined}
          onTouchEnd={count > 1 ? onPointerUp : undefined}
        >
          <div style={{
            display: 'flex',
            width: `${count * 100}%`,
            height: '100%',
            transform: `translateX(calc(${-activeIdx * (100 / count)}% + ${offset / count}px))`,
            transition: dragStart !== null ? 'none' : 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}>
            {cleanPhotos.map((url, i) => (
              <div
                key={i}
                style={{
                  width: `${100 / count}%`,
                  flexShrink: 0,
                  height: '100%',
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
          </div>
        </div>

        {/* Zoom button */}
        <button
          onClick={() => setLightbox(true)}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'rgba(10,10,10,0.6)',
            border: '1px solid rgba(245,240,232,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}
        >
          <ZoomIn size={14} />
        </button>

        {/* Counter badge */}
        {count > 1 && (
          <div style={{
            position: 'absolute', bottom: '12px', right: '12px',
            background: 'rgba(10,10,10,0.65)',
            border: '1px solid rgba(245,240,232,0.12)',
            borderRadius: '20px', padding: '4px 10px',
            fontFamily: 'var(--font-display)', fontSize: '11px',
            color: 'rgba(245,240,232,0.8)', letterSpacing: '0.08em',
            backdropFilter: 'blur(6px)',
          }}>
            {activeIdx + 1} / {count}
          </div>
        )}

        {/* Arrow prev */}
        {count > 1 && activeIdx > 0 && (
          <button onClick={prev} style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(245,240,232,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}>
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Arrow next */}
        {count > 1 && activeIdx < count - 1 && (
          <button onClick={next} style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(245,240,232,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}>
            <ChevronRight size={16} />
          </button>
        )}

        {/* Dot indicators */}
        {count > 1 && (
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: '6px',
          }}>
            {cleanPhotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                style={{
                  width: i === activeIdx ? '20px' : '6px',
                  height: '6px', borderRadius: '3px',
                  background: i === activeIdx ? 'var(--accent)' : 'rgba(245,240,232,0.4)',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnails strip ── */}
      {count > 1 && (
        <div style={{
          display: 'flex', gap: '4px',
          padding: '4px 0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {cleanPhotos.map((url, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              style={{
                flexShrink: 0,
                width: '64px', height: '46px',
                backgroundImage: `url(${url})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: `2px solid ${i === activeIdx ? 'var(--accent)' : 'transparent'}`,
                borderRadius: '3px', cursor: 'pointer', padding: 0,
                opacity: i === activeIdx ? 1 : 0.5,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0,0,0,0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeUp 0.2s ease',
          }}
        >
          {/* Image */}
          <img
            src={cleanPhotos[activeIdx]}
            alt={`${titre} — photo ${activeIdx + 1}`}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '95vw', maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          />

          {/* Close */}
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

          {/* Counter */}
          <div style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-display)', fontSize: '13px',
            color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em',
          }}>
            {activeIdx + 1} / {count}
          </div>

          {/* Arrows */}
          {activeIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); prev() }} style={{
              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronLeft size={20} />
            </button>
          )}
          {activeIdx < count - 1 && (
            <button onClick={e => { e.stopPropagation(); next() }} style={{
              position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </>
  )
}
