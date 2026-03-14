import { supabase } from './lib/supabase.js'

const GOALS_KEY = 'ridelog_goals_v1'
const ROUTES_KEY = 'ridelog_routes_v2'
const BIKES_KEY = 'ridelog_bikes_v1'
const BIKE_SERVICE_KEY = 'ridelog_bike_service_v1'
const RIDE_EXTRAS_KEY = 'ridelog_ride_extras_v1'
const SETTINGS_KEY = 'ridelog_settings_v1'

export async function getRides() {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error loading rides:', error)
    return []
  }

  return data || []
}

export async function addRide(ride) {
  const { data, error } = await supabase
    .from('rides')
    .insert([ride])
    .select()
    .single()

  if (error) {
    console.error('Error adding ride:', error)
    throw error
  }

  return data
}

export async function updateRide(id, updates) {
  const { data, error } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating ride:', error)
    throw error
  }

  return data
}

export async function deleteRide(id) {
  const { error } = await supabase
    .from('rides')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting ride:', error)
    throw error
  }

  deleteRideExtra(id)
}

function safeRead(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getGoals() {
  return safeRead(GOALS_KEY, [])
}

export function saveGoals(goals) {
  safeWrite(GOALS_KEY, goals)
}

export function getRoutes() {
  return safeRead(ROUTES_KEY, [])
}

export function saveRoutes(routes) {
  safeWrite(ROUTES_KEY, routes)
}

export function getBikes() {
  return safeRead(BIKES_KEY, [])
}

export function saveBikes(bikes) {
  safeWrite(BIKES_KEY, bikes)
}

export function getBikeService() {
  return safeRead(BIKE_SERVICE_KEY, [])
}

export function saveBikeService(items) {
  safeWrite(BIKE_SERVICE_KEY, items)
}

export function getRideExtrasMap() {
  return safeRead(RIDE_EXTRAS_KEY, {})
}

export function saveRideExtra(rideId, extra) {
  const current = getRideExtrasMap()
  current[String(rideId)] = {
    ...(current[String(rideId)] || {}),
    ...extra
  }
  safeWrite(RIDE_EXTRAS_KEY, current)
}

export function deleteRideExtra(rideId) {
  const current = getRideExtrasMap()
  delete current[String(rideId)]
  safeWrite(RIDE_EXTRAS_KEY, current)
}

export async function getRidesWithExtras() {
  const rides = await getRides()
  const extras = getRideExtrasMap()
  return rides.map(ride => ({
    ...ride,
    ...(extras[String(ride.id)] || {})
  }))
}

export function getSettings() {
  return safeRead(SETTINGS_KEY, {
    theme: 'dark'
  })
}

export function saveSettings(next) {
  const current = getSettings()
  safeWrite(SETTINGS_KEY, { ...current, ...next })
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  saveSettings({ theme })
}

export function applySavedTheme() {
  const { theme = 'dark' } = getSettings()
  applyTheme(theme)
}

export const TYPE_COLORS = {
  Road: '#c8ff47',
  MTB: '#47cfff',
  Gravel: '#ff9e47',
  Indoor: '#b047ff',
  'E-Bike': '#47ffb0'
}

export function pad(n) {
  return String(n).padStart(2, '0')
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`
}

export function fmtDur(m) {
  if (!m) return null
  const h = Math.floor(m / 60)
  const min = m % 60
  return h ? `${h}h${pad(min)}` : `${min}m`
}

export function fmtSpeed(dist, dur) {
  if (!dist || !dur) return null
  return ((dist / dur) * 60).toFixed(1) + ' km/h'
}

export function computeRideStreak(rides) {
  const uniqueDays = [...new Set((rides || []).map(r => r.date).filter(Boolean))].sort()
  if (!uniqueDays.length) return { current: 0, best: 0 }

  let best = 1
  let current = 1

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1] + 'T00:00:00')
    const next = new Date(uniqueDays[i] + 'T00:00:00')
    const diffDays = Math.round((next - prev) / 86400000)
    if (diffDays === 1) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 1
    }
  }

  let trailing = 1
  for (let i = uniqueDays.length - 1; i > 0; i--) {
    const prev = new Date(uniqueDays[i - 1] + 'T00:00:00')
    const next = new Date(uniqueDays[i] + 'T00:00:00')
    const diffDays = Math.round((next - prev) / 86400000)
    if (diffDays === 1) trailing += 1
    else break
  }

  return { current: trailing, best }
}