import { supabase } from './lib/supabase.js'

const GOALS_KEY = 'ridelog_goals_v1'
const ROUTES_KEY = 'ridelog_routes_v1'

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

export async function deleteRide(id) {
  const { error } = await supabase
    .from('rides')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting ride:', error)
    throw error
  }
}

export function getGoals() {
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY)) || []
  } catch {
    return []
  }
}

export function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

export function getRoutes() {
  try {
    return JSON.parse(localStorage.getItem(ROUTES_KEY)) || []
  } catch {
    return []
  }
}

export function saveRoutes(routes) {
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes))
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