import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { addFresque, addArtiste, getArtistes, MOCK_ARTISTES } from '../lib/supabase.js'
import { Plus, Download, Check, AlertCircle } from 'lucide-react'

const isConfigured = () =>
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

function Input({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </label>
      {props.type === 'textarea' ? (
        <textarea
          {...props}
          type={undefined}
          rows={3}
          style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--paper)', fontFamily: 'var(--font-display)', fontSize: '14px',
            padding: '12px', borderRadius: 'var(--radius)',
            resize: 'vertical', outline: 'none', width: '100%',
          }}
        />
      ) : (
        <input
          {...props}
          style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--paper)', fontFamily: 'var(--font-display)', fontSize: '14px',
            padding: '12px', borderRadius: 'var(--radius)',
            outline: 'none', width: '100%',
          }}
        />
      )}
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState('fresque')
  const [artistes, setArtistes] = useState([])
  const [status, setStatus] = useState(null) // 'ok' | 'error' | null
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [lastSlug, setLastSlug] = useState('')

  const [fresque, setFresque] = useState({
    titre: '', slug: '', description: '', adresse: '',
    lat: '', lng: '', photo_url: '', artiste_id: '',
    date_creation: new Date().toISOString().slice(0, 10),
    tags: '',
  })
  const [artiste, setArtiste] = useState({
    nom: '', specialite: '', bio: '', photo_url: '',
    instagram: '', soundcloud: '', youtube: '',
  })

  useEffect(() => {
    const src = isConfigured() ? getArtistes() : Promise.resolve(MOCK_ARTISTES)
    src.then(setArtistes)
  }, [])

  function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function setF(key, val) {
    setFresque(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'titre') next.slug = slugify(val)
      return next
    })
  }
  function setA(key, val) { setArtiste(prev => ({ ...prev, [key]: val })) }

  async function handleAddFresque(e) {
    e.preventDefault()
    setStatus(null)
    try {
      const payload = {
        ...fresque,
        lat: parseFloat(fresque.lat),
        lng: parseFloat(fresque.lng),
        tags: fresque.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (isConfigured()) {
        await addFresque(payload)
      }
      // Generate QR
      const url = `${window.location.origin}/fresque/${fresque.slug}`
      const qr = await QRCode.toDataURL(url, {
        width: 300, margin: 2,
        color: { dark: '#0a0a0a', light: '#f5f0e8' },
      })
      setQrDataUrl(qr)
      setLastSlug(fresque.slug)
      setStatus('ok')
      setFresque({ titre: '', slug: '', description: '', adresse: '', lat: '', lng: '', photo_url: '', artiste_id: '', date_creation: new Date().toISOString().slice(0, 10), tags: '' })
    } catch {
      setStatus('error')
    }
  }

  async function handleAddArtiste(e) {
    e.preventDefault()
    setStatus(null)
    try {
      if (isConfigured()) await addArtiste(artiste)
      setStatus('ok')
      setArtiste({ nom: '', specialite: '', bio: '', photo_url: '', instagram: '', soundcloud: '', youtube: '' })
      const src = isConfigured() ? getArtistes() : Promise.resolve(MOCK_ARTISTES)
      src.then(setArtistes)
    } catch {
      setStatus('error')
    }
  }

  function downloadQR() {
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${lastSlug}.png`
    a.click()
  }

  const TABS = [
    { key: 'fresque', label: 'Ajouter fresque' },
    { key: 'artiste', label: 'Ajouter artiste' },
  ]

  return (
    <div style={{ minHeight: '100svh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '48px 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
          Administration
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '42px', letterSpacing: '0.02em', lineHeight: 0.9 }}>
          GALERIE<br/>ADMIN
        </h1>
        {!isConfigured() && (
          <div style={{
            marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start',
            background: 'rgba(245,200,0,0.08)', border: '1px solid rgba(245,200,0,0.3)',
            borderRadius: 'var(--radius)', padding: '12px',
          }}>
            <AlertCircle size={14} color="var(--accent2)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--accent2)', lineHeight: 1.6 }}>
              Mode démo — configure VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env pour sauvegarder en base.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatus(null); setQrDataUrl('') }}
            style={{
              flex: 1, padding: '14px',
              fontFamily: 'var(--font-display)', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none', transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Status */}
        {status === 'ok' && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
            background: 'rgba(0,180,100,0.1)', border: '1px solid rgba(0,180,100,0.3)',
            borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: '20px',
          }}>
            <Check size={14} color="#00b464" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: '#00b464' }}>
              {tab === 'fresque' ? 'Fresque ajoutée !' : 'Artiste ajouté !'}
            </span>
          </div>
        )}
        {status === 'error' && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
            background: 'rgba(255,59,31,0.1)', border: '1px solid rgba(255,59,31,0.3)',
            borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: '20px',
          }}>
            <AlertCircle size={14} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--accent)' }}>
              Erreur — vérifie la configuration Supabase.
            </span>
          </div>
        )}

        {/* ── Form fresque ── */}
        {tab === 'fresque' && (
          <form onSubmit={handleAddFresque} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Titre *" value={fresque.titre} onChange={e => setF('titre', e.target.value)} required />
            <Input label="Slug (auto)" value={fresque.slug} onChange={e => setF('slug', e.target.value)} required />
            <Input label="Description" type="textarea" value={fresque.description} onChange={e => setF('description', e.target.value)} />
            <Input label="Adresse" value={fresque.adresse} onChange={e => setF('adresse', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Latitude *" type="number" step="any" value={fresque.lat} onChange={e => setF('lat', e.target.value)} placeholder="-18.9137" required />
              <Input label="Longitude *" type="number" step="any" value={fresque.lng} onChange={e => setF('lng', e.target.value)} placeholder="47.5361" required />
            </div>
            <Input label="URL Photo" type="url" value={fresque.photo_url} onChange={e => setF('photo_url', e.target.value)} />
            <Input label="Date de création" type="date" value={fresque.date_creation} onChange={e => setF('date_creation', e.target.value)} />
            <Input label="Tags (séparés par virgule)" value={fresque.tags} onChange={e => setF('tags', e.target.value)} placeholder="hip-hop, mural, rouge" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Artiste
              </label>
              <select
                value={fresque.artiste_id}
                onChange={e => setF('artiste_id', e.target.value)}
                style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  color: 'var(--paper)', fontFamily: 'var(--font-display)', fontSize: '14px',
                  padding: '12px', borderRadius: 'var(--radius)', width: '100%',
                }}
              >
                <option value="">— Choisir un artiste —</option>
                {artistes.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>

            <button type="submit" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '16px', borderRadius: 'var(--radius)', marginTop: '8px',
            }}>
              <Plus size={14} /> Ajouter la fresque
            </button>
          </form>
        )}

        {/* ── Form artiste ── */}
        {tab === 'artiste' && (
          <form onSubmit={handleAddArtiste} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Nom *" value={artiste.nom} onChange={e => setA('nom', e.target.value)} required />
            <Input label="Spécialité" value={artiste.specialite} onChange={e => setA('specialite', e.target.value)} placeholder="Rap & Graffiti" />
            <Input label="Bio" type="textarea" value={artiste.bio} onChange={e => setA('bio', e.target.value)} />
            <Input label="URL Photo" type="url" value={artiste.photo_url} onChange={e => setA('photo_url', e.target.value)} />
            <Input label="Instagram" type="url" value={artiste.instagram} onChange={e => setA('instagram', e.target.value)} placeholder="https://instagram.com/..." />
            <Input label="SoundCloud / Music" type="url" value={artiste.soundcloud} onChange={e => setA('soundcloud', e.target.value)} />
            <Input label="YouTube" type="url" value={artiste.youtube} onChange={e => setA('youtube', e.target.value)} />

            <button type="submit" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '16px', borderRadius: 'var(--radius)', marginTop: '8px',
            }}>
              <Plus size={14} /> Ajouter l'artiste
            </button>
          </form>
        )}

        {/* QR code généré après ajout fresque */}
        {qrDataUrl && tab === 'fresque' && (
          <div style={{
            marginTop: '28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
            padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            animation: 'fadeUp 0.4s ease',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              QR Code généré
            </p>
            <div style={{ background: 'var(--paper)', padding: '12px', borderRadius: '4px' }}>
              <img src={qrDataUrl} alt="QR" style={{ width: '140px', height: '140px' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>
              Imprime et colle sur le mur !
            </p>
            <button onClick={downloadQR} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--paper)', fontFamily: 'var(--font-display)',
              fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '10px 20px', borderRadius: 'var(--radius)',
            }}>
              <Download size={13} /> Télécharger PNG
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
