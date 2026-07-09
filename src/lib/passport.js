const PASSPORT_STORAGE_KEY = 'gco_visited_fresques_v1'
const PASSPORT_EVENT = 'gco-passport-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readPassport() {
  if (!canUseStorage()) return {}

  try {
    const stored = JSON.parse(localStorage.getItem(PASSPORT_STORAGE_KEY) || '{}')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  } catch {
    return {}
  }
}

function writePassport(passport) {
  if (!canUseStorage()) return passport

  try {
    localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(passport))
    window.dispatchEvent(new CustomEvent(PASSPORT_EVENT, { detail: passport }))
  } catch {
    // Ignore storage errors in private mode or full storage.
  }

  return passport
}

export function getVisitedPassport() {
  return readPassport()
}

export function getVisitedFresqueSlugs() {
  return Object.keys(readPassport())
}

export function getVisitedFresqueCount() {
  return getVisitedFresqueSlugs().length
}

export function isFresqueVisited(slug) {
  if (!slug) return false
  return Boolean(readPassport()[slug])
}

export function markFresqueVisited(slug) {
  if (!slug) return readPassport()

  const passport = readPassport()
  if (!passport[slug]) {
    passport[slug] = new Date().toISOString()
  }
  return writePassport(passport)
}

export function unmarkFresqueVisited(slug) {
  if (!slug) return readPassport()

  const passport = readPassport()
  delete passport[slug]
  return writePassport(passport)
}

export function toggleFresqueVisited(slug) {
  if (!slug) return readPassport()

  return isFresqueVisited(slug)
    ? unmarkFresqueVisited(slug)
    : markFresqueVisited(slug)
}

export function subscribePassport(listener) {
  if (typeof window === 'undefined') return () => {}

  const handlePassportEvent = event => listener(event.detail || readPassport())
  const handleStorageEvent = event => {
    if (event.key === PASSPORT_STORAGE_KEY) listener(readPassport())
  }

  window.addEventListener(PASSPORT_EVENT, handlePassportEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(PASSPORT_EVENT, handlePassportEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}
