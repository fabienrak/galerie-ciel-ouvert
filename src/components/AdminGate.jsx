import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

// Mot de passe admin — change cette valeur
const ADMIN_PASSWORD = 'galerie2025'
const SESSION_KEY    = 'gco_admin_auth'

export default function AdminGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput]       = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState(false)
  const [shake, setShake]       = useState(false)

  // Persist session (sessionStorage — expire à la fermeture du navigateur)
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  if (unlocked) return children

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--ink)',
    }}>
      {/* Icon */}
      <div style={{
        width: '56px', height: '56px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px',
        background: 'var(--card)',
      }}>
        <Lock size={22} color="var(--accent)" />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '36px',
        letterSpacing: '0.04em',
        marginBottom: '6px',
        textAlign: 'center',
      }}>
        ACCÈS RESTREINT
      </h1>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '10px',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: '36px',
        textAlign: 'center',
      }}>
        Zone réservée au crew
      </p>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '320px',
          animation: shake ? 'shakeForm 0.4s ease' : 'none',
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'}
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Mot de passe"
            autoFocus
            style={{
              width: '100%',
              background: 'var(--card)',
              border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              padding: '14px 44px 14px 16px',
              outline: 'none',
              transition: 'border-color 0.2s',
              letterSpacing: '0.1em',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '10px',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '8px',
            animation: 'fadeUp 0.3s ease',
          }}>
            Mot de passe incorrect
          </p>
        )}

        <button
          type="submit"
          style={{
            marginTop: '12px',
            width: '100%',
            background: 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '14px',
            borderRadius: 'var(--radius)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Entrer
        </button>
      </form>

      <style>{`
        @keyframes shakeForm {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
