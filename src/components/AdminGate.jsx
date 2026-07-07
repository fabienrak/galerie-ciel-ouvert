import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

// Mot de passe admin — change cette valeur
const ADMIN_PASSWORD = 'galerie2025'
const SESSION_KEY    = 'gco_admin_auth'
const USE_SUPABASE_AUTH = isSupabaseConfigured()

export default function AdminGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [email, setEmail]       = useState('')
  const [input, setInput]       = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState(false)
  const [shake, setShake]       = useState(false)
  const [checking, setChecking] = useState(USE_SUPABASE_AUTH)
  const [submitting, setSubmitting] = useState(false)

  // En mode Supabase, la session vient de Supabase Auth. En mode demo, on garde
  // le mot de passe local existant pour pouvoir tester sans backend.
  useEffect(() => {
    if (!USE_SUPABASE_AUTH) {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUnlocked(Boolean(data.session))
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUnlocked(Boolean(session))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(false)

    if (USE_SUPABASE_AUTH) {
      setSubmitting(true)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: input,
      })
      setSubmitting(false)

      if (!authError) {
        setUnlocked(true)
        setInput('')
        return
      }

      setError(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 500)
      return
    }

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

  if (checking) return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ink)',
      color: 'var(--muted)',
      fontFamily: 'var(--font-display)',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      Vérification...
    </div>
  )

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
        {USE_SUPABASE_AUTH ? 'Connexion Supabase requise' : 'Zone réservée au crew'}
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
        {USE_SUPABASE_AUTH && (
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(false) }}
            placeholder="Email admin"
            autoComplete="email"
            autoFocus
            required
            style={{
              width: '100%',
              background: 'var(--card)',
              border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              padding: '14px 16px',
              outline: 'none',
              transition: 'border-color 0.2s',
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}
          />
        )}

        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'}
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Mot de passe"
            autoComplete={USE_SUPABASE_AUTH ? 'current-password' : 'off'}
            autoFocus={!USE_SUPABASE_AUTH}
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
            {USE_SUPABASE_AUTH ? 'Identifiants Supabase incorrects' : 'Mot de passe incorrect'}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '12px',
            width: '100%',
            background: submitting ? 'var(--muted)' : 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '14px',
            borderRadius: 'var(--radius)',
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
          }}
        >
          {submitting ? 'Connexion...' : 'Entrer'}
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
