import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Map, Users, LayoutGrid, Settings } from 'lucide-react'

const NAV = [
  { to: '/carte',    icon: Map,        label: 'Carte' },
  { to: '/',         icon: LayoutGrid, label: 'Accueil', exact: true },
  { to: '/artistes', icon: Users,      label: 'Artistes' },
]

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, paddingBottom: '72px' }}>
        <Outlet />
      </main>

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
