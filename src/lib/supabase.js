import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  if (SUPABASE_URL.includes('ton-projet') || SUPABASE_ANON_KEY.includes('ta-cle-anon')) return false

  try {
    new URL(SUPABASE_URL)
    return true
  } catch {
    return false
  }
}

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

const MOCK_VIEWS_STORAGE_KEY = 'gco_mock_fresque_views'

function getStoredMockViews() {
  if (typeof localStorage === 'undefined') return {}

  try {
    return JSON.parse(localStorage.getItem(MOCK_VIEWS_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function setStoredMockViews(views) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(MOCK_VIEWS_STORAGE_KEY, JSON.stringify(views))
  } catch {
    // Ignore storage errors in private mode.
  }
}

function withMockViews(fresque) {
  if (!fresque) return null
  const storedViews = getStoredMockViews()
  return {
    ...fresque,
    views: Number(storedViews[fresque.slug] ?? fresque.views ?? 0),
  }
}

// ─── Mock data (utilisé si Supabase n'est pas configuré) ───────────────────
export const MOCK_ARTISTES = [
  {
    id: 'a1',
    nom: 'KAZA',
    bio: 'Rappeur et visual artist basé à Tana. Ses fresques racontent les rues d\'Analakely avec une énergie brute.',
    specialite: 'Fresque & Rap',
    photo_url: 'https://picsum.photos/seed/kaza/400/400',
    instagram: 'https://instagram.com',
    soundcloud: 'https://soundcloud.com',
    youtube: 'https://youtube.com',
  },
  {
    id: 'a2',
    nom: 'TSIORY',
    bio: 'Artiste graffiti autodidacte. Il transforme les murs gris en scènes vivantes inspirées de la culture malagasy.',
    specialite: 'Graffiti & Lettrage',
    photo_url: 'https://picsum.photos/seed/tsiory/400/400',
    instagram: 'https://instagram.com',
    soundcloud: null,
    youtube: 'https://youtube.com',
  },
  {
    id: 'a3',
    nom: 'MIRANA',
    bio: 'Musicienne et peintre. Ses œuvres murales sont des partitions visuelles, entre jazz et folklore malgache.',
    specialite: 'Murale & Musique',
    photo_url: 'https://picsum.photos/seed/mirana/400/400',
    instagram: 'https://instagram.com',
    soundcloud: 'https://soundcloud.com',
    youtube: null,
  },
  {
    id: 'a4',
    nom: 'DADA',
    bio: 'Entrepreneur et rappeur. Co-fondateur du collectif, il apporte la vision business et la scène rap au projet.',
    specialite: 'Rap & Entrepreneuriat',
    photo_url: 'https://picsum.photos/seed/dada/400/400',
    instagram: 'https://instagram.com',
    soundcloud: 'https://soundcloud.com',
    youtube: 'https://youtube.com',
  },
]

export const MOCK_FRESQUES = [
  {
    id: 'f1',
    slug: 'les-ancetres-parlent',
    titre: 'Les ancêtres parlent',
    description: 'Une fresque géante qui rend hommage aux razana à travers des visages ancestraux mêlés aux immeubles modernes de Tana.',
    date_creation: '2024-11-15',
    lat: -18.9137,
    lng: 47.5361,
    adresse: 'Rue Andrianaivoravelona, Analakely',
    photo_url: 'https://picsum.photos/seed/fresque1/800/500',
    photos: ['https://picsum.photos/seed/fresque1/800/500','https://picsum.photos/seed/fresque1b/800/500','https://picsum.photos/seed/fresque1c/800/500'],
    views: 128,
    artiste_id: 'a1',
    artiste: MOCK_ARTISTES[0],
    tags: ['hommage', 'culture', 'ancestral'],
  },
  {
    id: 'f2',
    slug: 'urban-beats',
    titre: 'Urban Beats',
    description: 'Lettres en 3D explosives, un hymne au hip-hop malagasy qui pulse sur les murs du quartier.',
    date_creation: '2024-12-01',
    lat: -18.9155,
    lng: 47.5378,
    adresse: 'Av. de l\'Indépendance, Analakely',
    photo_url: 'https://picsum.photos/seed/fresque2/800/500',
    photos: ['https://picsum.photos/seed/fresque2/800/500','https://picsum.photos/seed/fresque2b/800/500'],
    views: 94,
    artiste_id: 'a2',
    artiste: MOCK_ARTISTES[1],
    tags: ['hip-hop', 'lettrage', 'couleur'],
  },
  {
    id: 'f3',
    slug: 'ranomasina',
    titre: 'Ranomasina',
    description: 'Une mer de visages flottants, vague après vague. La musique comme océan, le quartier comme rivage.',
    date_creation: '2025-01-10',
    lat: -18.9118,
    lng: 47.5345,
    adresse: 'Rue Rainizanabololona, Tsaralalana',
    photo_url: 'https://picsum.photos/seed/fresque3/800/500',
    photos: ['https://picsum.photos/seed/fresque3/800/500','https://picsum.photos/seed/fresque3b/800/500','https://picsum.photos/seed/fresque3c/800/500'],
    views: 211,
    artiste_id: 'a3',
    artiste: MOCK_ARTISTES[2],
    tags: ['musique', 'poésie', 'bleu'],
  },
  {
    id: 'f4',
    slug: 'fire-starter',
    titre: 'Fire Starter',
    description: 'Flammes et silhouettes dansantes — une ode à la scène rap underground de la capitale.',
    date_creation: '2025-02-20',
    lat: -18.9148,
    lng: 47.533,
    adresse: 'Rue Rambolamanana, Isoraka',
    photo_url: 'https://picsum.photos/seed/fresque4/800/500',
    photos: ['https://picsum.photos/seed/fresque4/800/500','https://picsum.photos/seed/fresque4b/800/500'],
    views: 76,
    artiste_id: 'a4',
    artiste: MOCK_ARTISTES[3],
    tags: ['rap', 'feu', 'energie'],
  },
  {
    id: 'f5',
    slug: 'ny-tanindrazana',
    titre: 'Ny Tanindrazana',
    description: 'Portrait monumental en noir et blanc d\'une femme malagasy regardant l\'horizon — la patrie comme identité.',
    date_creation: '2025-03-05',
    lat: -18.913,
    lng: 47.539,
    adresse: 'Pl. de l\'Indépendance, Analakely',
    photo_url: 'https://picsum.photos/seed/fresque5/800/500',
    photos: ['https://picsum.photos/seed/fresque5/800/500','https://picsum.photos/seed/fresque5b/800/500'],
    views: 143,
    artiste_id: 'a1',
    artiste: MOCK_ARTISTES[0],
    tags: ['portrait', 'identité', 'noir et blanc'],
  },
]

// ─── Fonctions de data (Supabase ou mock) ──────────────────────────────────
export async function getFresques() {
  if (!isSupabaseConfigured()) return MOCK_FRESQUES.map(withMockViews)
  const { data, error } = await supabase
    .from('fresques')
    .select('*, artiste:artistes(*)')
    .order('date_creation', { ascending: false })
  if (error) throw error
  return data
}

export async function getFresqueBySlug(slug) {
  if (!isSupabaseConfigured()) return withMockViews(MOCK_FRESQUES.find(f => f.slug === slug)) || null
  const { data, error } = await supabase
    .from('fresques')
    .select('*, artiste:artistes(*)')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function incrementFresqueViews(slug) {
  if (!slug) return null

  if (!isSupabaseConfigured()) {
    const fresque = MOCK_FRESQUES.find(f => f.slug === slug)
    if (!fresque) return null

    const storedViews = getStoredMockViews()
    const currentViews = Number(storedViews[slug] ?? fresque.views ?? 0)
    const nextViews = currentViews + 1
    setStoredMockViews({ ...storedViews, [slug]: nextViews })
    return nextViews
  }

  const { data, error } = await supabase.rpc('increment_fresque_views', {
    fresque_slug: slug,
  })

  if (error) {
    console.warn('Impossible d’incrémenter les vues:', error)
    return null
  }

  return Number(data)
}

export async function getArtistes() {
  if (!isSupabaseConfigured()) return MOCK_ARTISTES
  const { data, error } = await supabase
    .from('artistes')
    .select('*')
    .order('nom')
  if (error) throw error
  return data
}

export async function getArtisteById(id) {
  if (!isSupabaseConfigured()) return MOCK_ARTISTES.find(a => a.id === id) || null
  const { data, error } = await supabase
    .from('artistes')
    .select('*, fresques(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function addFresque(fresque) {
  if (!isSupabaseConfigured()) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.from('fresques').insert([fresque]).select().single()
  if (error) throw error
  return data
}

export async function addArtiste(artiste) {
  if (!isSupabaseConfigured()) throw new Error('Supabase non configuré')
  const { data, error } = await supabase.from('artistes').insert([artiste]).select().single()
  if (error) throw error
  return data
}
