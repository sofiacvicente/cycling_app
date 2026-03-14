const RIDES_KEY  = 'ridelog_rides_v1'
const GOALS_KEY  = 'ridelog_goals_v1'
const ROUTES_KEY = 'ridelog_routes_v1'

export function getRides()  { try { return JSON.parse(localStorage.getItem(RIDES_KEY))  || [] } catch { return [] } }
export function saveRides(r)  { localStorage.setItem(RIDES_KEY,  JSON.stringify(r)) }
export function getGoals()  { try { return JSON.parse(localStorage.getItem(GOALS_KEY))  || [] } catch { return [] } }
export function saveGoals(g)  { localStorage.setItem(GOALS_KEY,  JSON.stringify(g)) }
export function getRoutes() { try { return JSON.parse(localStorage.getItem(ROUTES_KEY)) || [] } catch { return [] } }
export function saveRoutes(r) { localStorage.setItem(ROUTES_KEY, JSON.stringify(r)) }

export const TYPE_COLORS = {
  Road: '#c8ff47', MTB: '#47cfff', Gravel: '#ff9e47', Indoor: '#b047ff', 'E-Bike': '#47ffb0'
}

export function pad(n) { return String(n).padStart(2, '0') }

export function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)}`
}

export function fmtDur(m) {
  if (!m) return null
  const h = Math.floor(m / 60), min = m % 60
  return h ? `${h}h${pad(min)}` : `${min}m`
}

export function fmtSpeed(dist, dur) {
  if (!dist || !dur) return null
  return ((dist / dur) * 60).toFixed(1) + ' km/h'
}
