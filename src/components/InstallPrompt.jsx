import { useEffect, useState } from 'react'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isInStandaloneMode()) return
    if (localStorage.getItem('pwa-install-dismissed')) return

    const isIos = isIOS()
    setIos(isIos)

    if (isIos) {
      setTimeout(() => { setShow(true); setTimeout(() => setVisible(true), 50) }, 3000)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => { setShow(true); setTimeout(() => setVisible(true), 50) }, 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => setShow(false), 400)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: '80px', left: '12px', right: '12px',
      zIndex: 9000,
      transform: visible ? 'translateY(0)' : 'translateY(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,59,31,0.3)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,59,31,0.1)',
      }}>
        {/* Icon */}
        <img
          src="/icon-192.png"
          alt="Galerie"
          style={{ width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0 }}
        />

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            color: 'var(--paper)',
            marginBottom: '2px',
          }}>
            Installer l'application
          </div>
          {ios ? (
            <div style={{
              fontSize: '11px',
              color: 'rgba(245,240,232,0.5)',
              lineHeight: 1.4,
            }}>
              Appuie sur <strong style={{ color: 'rgba(245,240,232,0.75)' }}>Partager</strong>{' '}
              puis <strong style={{ color: 'rgba(245,240,232,0.75)' }}>"Sur l'écran d'accueil"</strong>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.5)' }}>
              Accès rapide, hors connexion, plein écran
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          {!ios && (
            <button
              onClick={install}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Installer
            </button>
          )}
          <button
            onClick={dismiss}
            style={{
              background: 'rgba(245,240,232,0.06)',
              color: 'rgba(245,240,232,0.45)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Plus tard
          </button>
        </div>
      </div>

      {/* iOS share arrow indicator */}
      {ios && (
        <div style={{
          textAlign: 'center',
          marginTop: '8px',
          fontSize: '11px',
          color: 'rgba(245,240,232,0.3)',
          fontFamily: 'var(--font-display)',
        }}>
          ↑ Icône partager en bas de Safari
        </div>
      )}
    </div>
  )
}
