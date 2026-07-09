import { useEffect, useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Gauge, LayoutGrid, Map, Users, WifiOff } from 'lucide-react'

const NAV = [
  { to: '/carte',    icon: Map,        label: 'Carte' },
  { to: '/',         icon: LayoutGrid, label: 'Accueil', exact: true },
  { to: '/artistes', icon: Users,      label: 'Artistes' },
]

function getNetworkState() {
  if (typeof navigator === 'undefined') return { online: true, lowData: false }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const effectiveType = connection?.effectiveType || ''

  return {
    online: navigator.onLine !== false,
    lowData: Boolean(connection?.saveData || ['slow-2g', '2g'].includes(effectiveType)),
  }
}

export default function Layout() {
  const [network, setNetwork] = useState(getNetworkState)

  useEffect(() => {
    const updateNetwork = () => setNetwork(getNetworkState())
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    connection?.addEventListener?.('change', updateNetwork)

    return () => {
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      connection?.removeEventListener?.('change', updateNetwork)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, paddingBottom: '72px' }}>
        <Outlet />
      </main>

      {(!network.online || network.lowData) && (
        <div style={{
          position: 'fixed',
          left: '12px',
          right: '12px',
          bottom: '80px',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '12px',
          background: network.online ? 'rgba(245,200,0,0.94)' : 'rgba(26,26,26,0.94)',
          color: network.online ? '#1a1a1a' : '#fff',
          boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
          fontFamily: 'var(--font-display)',
          fontSize: '10px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {network.online ? <Gauge size={15} /> : <WifiOff size={15} />}
          <span>
            {network.online
              ? 'Connexion faible : affichage allégé avec cache local'
              : 'Mode hors ligne : les fresques déjà ouvertes restent disponibles'}
          </span>
        </div>
      )}

      {/* Bottom nav mobile-first */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(245,240,232,0.1)',
        display: 'flex', zIndex: 1000,
      }}>
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '10px 0 14px',
              fontFamily: 'var(--font-display)',
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isActive ? 'var(--accent)' : 'rgba(245,240,232,0.4)',
              transition: 'color 0.2s',
              borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            })}
          >
            <Icon size={20} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
