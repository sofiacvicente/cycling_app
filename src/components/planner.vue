<template>
  <div>
    <div class="page-header">
      <div class="page-title">Ride Planner</div>
      <div class="page-subtitle">Plan rides with forecast, routes, checklist and calendar</div>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-card">
        <div class="stat-val">{{ upcomingCount }}</div>
        <div class="stat-lbl">Upcoming rides</div>
      </div>

      <div class="stat-card">
        <div class="stat-val">{{ plannedKm }}</div>
        <div class="stat-lbl">Planned km</div>
      </div>

      <div class="stat-card">
        <div class="stat-val">{{ startedCount }}</div>
        <div class="stat-lbl">Started</div>
      </div>

      <div class="stat-card">
        <div class="stat-val">{{ doneCount }}</div>
        <div class="stat-lbl">Completed</div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-title">{{ editingId ? 'Edit planned ride' : 'Plan a ride' }}</div>

      <div class="form-grid">
        <div class="form-group">
          <label>Date</label>
          <input type="date" v-model="form.date" @change="handleDateOrLocationChange" />
        </div>

        <div class="form-group">
          <label>Title</label>
          <input v-model="form.title" placeholder="Sunday endurance ride" />
        </div>

        <div class="form-group">
          <label>Training purpose</label>
          <select v-model="form.purpose">
            <option>Recovery</option>
            <option>Endurance</option>
            <option>Tempo</option>
            <option>Climbing</option>
            <option>Fun ride</option>
          </select>
        </div>

        <div class="form-group">
          <label>Bike</label>
          <select v-model="form.bike">
            <option value="">No bike selected</option>
            <option v-for="bike in bikes" :key="bike.id" :value="bike.name">
              {{ bike.name }}
            </option>
          </select>
        </div>

        <div class="form-group full">
          <label>Saved route</label>
          <select v-model="selectedRouteId" @change="applySelectedRoute">
            <option value="">Choose a saved route</option>
            <option v-for="route in routes" :key="route.id" :value="String(route.id)">
              {{ route.name }}{{ route.dist ? ` · ${route.dist} km` : '' }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Route name</label>
          <input v-model="form.routeName" placeholder="Coastal loop" />
        </div>

        <div class="form-group">
          <label>Start location</label>
          <input v-model="form.startLocation" placeholder="Lisbon" @change="handleDateOrLocationChange" />
        </div>

        <div class="form-group">
          <label>Target distance (km)</label>
          <input type="number" v-model="form.targetDist" min="0" step="0.1" />
        </div>

        <div class="form-group">
          <label>Target duration (min)</label>
          <input type="number" v-model="form.targetDur" min="0" />
        </div>

        <div class="form-group">
          <label>Target elevation (m)</label>
          <input type="number" v-model="form.targetElev" min="0" />
        </div>

        <div class="form-group full">
          <label>Route link</label>
          <input v-model="form.routeLink" placeholder="https://www.strava.com/routes/..." />
        </div>

        <div class="form-group full">
            <label>Packing checklist</label>
            <div class="planner-checklist-grid">
                <label class="check-item">
                <input type="checkbox" v-model="form.checklist.helmet" />
                <span>Helmet</span>
                </label>

                <label class="check-item">
                <input type="checkbox" v-model="form.checklist.lights" />
                <span>Lights</span>
                </label>

                <label class="check-item">
                <input type="checkbox" v-model="form.checklist.repairKit" />
                <span>Repair kit</span>
                </label>

                <label class="check-item">
                <input type="checkbox" v-model="form.checklist.water" />
                <span>Water</span>
                </label>

                <label class="check-item">
                <input type="checkbox" v-model="form.checklist.gels" />
                <span>Gels / food</span>
                </label>
            </div>
        </div>

        <div class="form-group full">
          <label>Notes</label>
          <textarea v-model="form.notes" placeholder="Windy route, coffee stop at km 30, bring extra layer..."></textarea>
        </div>
      </div>

      <div class="planner-weather-box planner-weather-spacing mb-3">
        <div class="planner-weather-head">
          <strong>Weather forecast</strong>
          <button class="btn btn-ghost" type="button" @click="fetchWeatherPreview" :disabled="weatherLoading">
            {{ weatherLoading ? 'Loading...' : 'Refresh forecast' }}
          </button>
        </div>

        <div v-if="weatherPreview" class="ride-meta" style="margin-top:10px">
          <span class="pill accent">{{ fmtDate(weatherPreview.date) }}</span>
          <span class="pill">{{ weatherPreview.temp }}°C</span>
          <span class="pill">Wind {{ weatherPreview.wind }} km/h</span>
          <span class="pill">Rain {{ weatherPreview.rain }}%</span>
          <span class="pill">{{ weatherPreview.label }}</span>
        </div>

        <div v-else class="helper-text" style="margin-top:8px">
          Add a date and start location to preview forecast.
        </div>
      </div>
      
    <button
        class="btn btn-primary btn-full"
        @click="savePlannedRide"
        :disabled="!form.title.trim() || !form.date"
        >
        {{ editingId ? 'Save changes' : '+ Save planned ride' }}
    </button>

      <button
        v-if="editingId"
        class="btn btn-ghost btn-full"
        style="margin-top:10px"
        @click="cancelEdit"
      >
        Cancel edit
      </button>
    </div>

    <div class="card mb-3">
      <div class="card-title">Planner calendar</div>
      <div class="planner-weekdays">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>
      <div class="planner-calendar-grid">
        <div
          v-for="day in calendarDays"
          :key="day.key"
          class="planner-day"
          :class="{ muted: !day.inMonth, today: day.isToday }"
        >
          <div class="planner-day-top">
            <span>{{ day.label }}</span>
            <span v-if="day.items.length" class="planner-day-count">{{ day.items.length }}</span>
          </div>

          <div class="planner-day-items">
            <div v-for="item in day.items.slice(0, 2)" :key="item.id" class="planner-mini-item">
              {{ item.title }}
            </div>
            <div v-if="day.items.length > 2" class="planner-mini-more">
              +{{ day.items.length - 2 }} more
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!sortedPlanned.length" class="empty">
      <div class="empty-icon">🗓️</div>
      <p>No planned rides yet.</p>
    </div>

    <div v-else class="planner-list">
      <div v-for="ride in sortedPlanned" :key="ride.id" class="ride-card planner-card">
        <div class="ride-body">
          <div class="flex items-center justify-between gap-2">
            <div class="ride-name">{{ ride.title }}</div>
            <span class="pill" :class="statusClass(ride.status)">{{ ride.status }}</span>
          </div>

          <div class="ride-meta">
            <span class="pill accent">{{ fmtDate(ride.date) }}</span>
            <span v-if="ride.routeName" class="pill">{{ ride.routeName }}</span>
            <span v-if="ride.targetDist" class="pill">{{ Number(ride.targetDist).toFixed(1) }} km</span>
            <span v-if="ride.targetDur" class="pill">{{ ride.targetDur }} min</span>
            <span v-if="ride.targetElev" class="pill">↑{{ ride.targetElev }}m</span>
            <span v-if="ride.bike" class="pill">🚲 {{ ride.bike }}</span>
            <span v-if="ride.purpose" class="pill">{{ ride.purpose }}</span>
          </div>

          <div v-if="ride.weatherPreview" class="ride-note">
            🌤 {{ ride.weatherPreview.temp }}°C · Wind {{ ride.weatherPreview.wind }} km/h · Rain {{ ride.weatherPreview.rain }}% · {{ ride.weatherPreview.label }}
          </div>

          <div v-if="ride.notes" class="ride-note">{{ ride.notes }}</div>

          <div class="planner-checklist-row">
            <span v-for="item in checklistSummary(ride.checklist)" :key="item" class="pill">
              {{ item }}
            </span>
          </div>

          <div class="planner-actions">
            <button class="btn btn-ghost" @click="startEdit(ride)">Edit</button>

            <button
              class="btn btn-ghost"
              @click="startRide(ride)"
              v-if="ride.status === 'planned'"
            >
              Start ride
            </button>

            <button
              class="btn btn-ghost"
              @click="completeRide(ride)"
              v-if="ride.status === 'started'"
            >
              Complete ride
            </button>

            <button
              class="btn btn-ghost"
              @click="markSkipped(ride.id)"
              v-if="ride.status !== 'done' && ride.status !== 'skipped'"
            >
              Skip
            </button>

            <a v-if="ride.routeLink" :href="ride.routeLink" target="_blank" class="btn btn-ghost">
              Open route
            </a>

            <button class="del-btn" @click="deletePlannedRide(ride.id)">✕</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  getPlannedRides,
  savePlannedRides,
  getBikes,
  getRoutes,
  saveRideDraft,
  fmtDate
} from '../storage.js'

const router = useRouter()
const bikes = ref(getBikes())
const routes = ref(getRoutes())
const plannedRides = ref(getPlannedRides())
const selectedRouteId = ref('')
const editingId = ref(null)
const weatherLoading = ref(false)

const today = new Date().toISOString().slice(0, 10)
const weatherPreview = ref(null)

function defaultForm() {
  return {
    date: today,
    title: '',
    purpose: 'Endurance',
    bike: '',
    routeName: '',
    startLocation: '',
    targetDist: '',
    targetDur: '',
    targetElev: '',
    routeLink: '',
    notes: '',
    checklist: {
      helmet: true,
      lights: false,
      repairKit: true,
      water: true,
      gels: false
    }
  }
}

const form = ref(defaultForm())

const sortedPlanned = computed(() =>
  [...plannedRides.value].sort((a, b) => a.date.localeCompare(b.date))
)

const upcomingCount = computed(() =>
  plannedRides.value.filter(r => r.status === 'planned').length
)

const startedCount = computed(() =>
  plannedRides.value.filter(r => r.status === 'started').length
)

const doneCount = computed(() =>
  plannedRides.value.filter(r => r.status === 'done').length
)

const plannedKm = computed(() =>
  plannedRides.value
    .filter(r => r.status === 'planned' || r.status === 'started')
    .reduce((sum, r) => sum + Number(r.targetDist || 0), 0)
    .toFixed(1)
)

function persist() {
  savePlannedRides(plannedRides.value)
}

function resetForm() {
  form.value = defaultForm()
  selectedRouteId.value = ''
  editingId.value = null
  weatherPreview.value = null
}

function cancelEdit() {
  resetForm()
}

function checklistSummary(checklist = {}) {
  const list = []
  if (checklist.helmet) list.push('Helmet')
  if (checklist.lights) list.push('Lights')
  if (checklist.repairKit) list.push('Repair kit')
  if (checklist.water) list.push('Water')
  if (checklist.gels) list.push('Gels')
  return list
}

function statusClass(status) {
  if (status === 'done') return 'planner-status-done'
  if (status === 'started') return 'planner-status-started'
  if (status === 'skipped') return 'planner-status-skipped'
  return 'planner-status-planned'
}

function applySelectedRoute() {
  if (!selectedRouteId.value) return
  const route = routes.value.find(r => String(r.id) === String(selectedRouteId.value))
  if (!route) return

  form.value.routeName = route.name || ''
  form.value.targetDist = route.dist || ''
  form.value.targetElev = route.elev || ''
  form.value.routeLink = route.link || ''
  if (route.desc && !form.value.notes) form.value.notes = route.desc
}

function savePlannedRide() {
  if (!form.value.date) {
    alert('Please choose a date.')
    return
  }

  if (!form.value.title.trim()) {
    alert('Please add a title for the planned ride.')
    return
  }

  const payload = {
    id: editingId.value || Date.now(),
    ...form.value,
    title: form.value.title.trim(),
    status: editingId.value
      ? plannedRides.value.find(r => r.id === editingId.value)?.status || 'planned'
      : 'planned',
    weatherPreview: weatherPreview.value
  }

  if (editingId.value) {
    plannedRides.value = plannedRides.value.map(r =>
      r.id === editingId.value ? payload : r
    )
  } else {
    plannedRides.value.push(payload)
  }

  persist()
  resetForm()
  alert('Planned ride saved.')
}

function startEdit(ride) {
  editingId.value = ride.id
  selectedRouteId.value = ''
  form.value = {
    date: ride.date || today,
    title: ride.title || '',
    purpose: ride.purpose || 'Endurance',
    bike: ride.bike || '',
    routeName: ride.routeName || '',
    startLocation: ride.startLocation || '',
    targetDist: ride.targetDist ?? '',
    targetDur: ride.targetDur ?? '',
    targetElev: ride.targetElev ?? '',
    routeLink: ride.routeLink || '',
    notes: ride.notes || '',
    checklist: {
      helmet: !!ride.checklist?.helmet,
      lights: !!ride.checklist?.lights,
      repairKit: !!ride.checklist?.repairKit,
      water: !!ride.checklist?.water,
      gels: !!ride.checklist?.gels
    }
  }
  weatherPreview.value = ride.weatherPreview || null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function deletePlannedRide(id) {
  plannedRides.value = plannedRides.value.filter(r => r.id !== id)
  persist()
  if (editingId.value === id) resetForm()
}

function markSkipped(id) {
  plannedRides.value = plannedRides.value.map(r =>
    r.id === id ? { ...r, status: 'skipped' } : r
  )
  persist()
}

function buildDraftFromPlannedRide(ride) {
  return {
    plannedRideId: ride.id,
    date: ride.date,
    type: inferRideType(ride.purpose),
    dist: ride.targetDist || '',
    dur: ride.targetDur || '',
    elev: ride.targetElev || '',
    title: ride.title || '',
    notes: buildRideNotes(ride)
  }
}

function startRide(ride) {
  saveRideDraft(buildDraftFromPlannedRide(ride))

  plannedRides.value = plannedRides.value.map(r =>
    r.id === ride.id ? { ...r, status: 'started' } : r
  )
  persist()

  router.push('/app/rides')
}

function completeRide(ride) {
  saveRideDraft(buildDraftFromPlannedRide(ride))
  router.push('/app/rides')
}

function inferRideType(purpose) {
  if (purpose === 'Fun ride') return 'Gravel'
  return 'Road'
}

function buildRideNotes(ride) {
  const parts = []

  if (ride.routeName) parts.push(`Route: ${ride.routeName}`)
  if (ride.startLocation) parts.push(`Start: ${ride.startLocation}`)
  if (ride.bike) parts.push(`Bike: ${ride.bike}`)
  if (ride.purpose) parts.push(`Purpose: ${ride.purpose}`)

  const checklist = checklistSummary(ride.checklist)
  if (checklist.length) parts.push(`Checklist: ${checklist.join(', ')}`)

  if (ride.notes) parts.push(ride.notes)

  return parts.join(' · ')
}

function weatherCodeToLabel(code) {
  const map = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Cloudy',
    45: 'Fog',
    48: 'Fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Snow',
    80: 'Showers',
    95: 'Thunderstorm'
  }
  return map[code] || 'Forecast'
}

async function fetchWeatherPreview() {
  if (!form.value.date || !form.value.startLocation) {
    alert('Please add a date and start location first.')
    return
  }

  weatherLoading.value = true

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(form.value.startLocation)}&count=1&language=en&format=json`
    )

    if (!geoRes.ok) {
      throw new Error('Geocoding request failed')
    }

    const geoJson = await geoRes.json()
    const first = geoJson?.results?.[0]

    if (!first) {
      alert('Could not find that location.')
      return
    }

    const lat = Number(first.latitude)
    const lon = Number(first.longitude)

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&timezone=auto&start_date=${form.value.date}&end_date=${form.value.date}`
    )

    if (!weatherRes.ok) {
      throw new Error('Weather request failed')
    }

    const weatherJson = await weatherRes.json()
    const daily = weatherJson.daily

    if (!daily || !daily.time?.length) {
      alert('No weather data found for that date.')
      return
    }

    weatherPreview.value = {
      date: daily.time[0],
      temp: Math.round(daily.temperature_2m_max?.[0] ?? 0),
      wind: Math.round(daily.wind_speed_10m_max?.[0] ?? 0),
      rain: Math.round(daily.precipitation_probability_max?.[0] ?? 0),
      label: weatherCodeToLabel(daily.weather_code?.[0]),
      lat,
      lon
    }
  } catch (error) {
    console.error('Weather preview error:', error)
    alert('Could not load weather preview.')
  } finally {
    weatherLoading.value = false
  }
}

function handleDateOrLocationChange() {
  weatherPreview.value = null
}

const calendarDays = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = new Date(year, month, 1)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - startWeekday)

  const days = []

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)

    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    days.push({
      key: iso,
      label: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === today,
      items: plannedRides.value.filter(r => r.date === iso)
    })
  }

  return days
})
</script>

<style scoped>
.planner-list {
  display: grid;
  gap: 12px;
}

.planner-card {
  align-items: stretch;
}

.planner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.planner-checklist-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  text-transform: none;
  letter-spacing: 0;
}

.check-item input {
  width: 16px;
  height: 16px;
  margin: 0;
  flex-shrink: 0;
}

.planner-weather-box {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
}

.planner-weather-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.planner-weather-head strong {
  font-size: 16px;
  line-height: 1.2;
}

.planner-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}

.planner-weekdays > div {
  text-align: center;
}

.planner-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.planner-day {
  min-height: 105px;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  min-width: 0;
}

.planner-day.muted {
  opacity: 0.45;
}

.planner-day.today {
  border-color: var(--accent);
}

.planner-day-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 10px;
}

.planner-day-count {
  background: var(--accent-dim);
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 11px;
}

.planner-day-items {
  display: grid;
  gap: 6px;
}

.planner-mini-item,
.planner-mini-more {
  font-size: 11px;
  padding: 5px 7px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planner-checklist-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.planner-status-planned {
  background: rgba(71, 207, 255, 0.15);
  color: #47cfff;
}

.planner-status-started {
  background: rgba(200, 255, 71, 0.15);
  color: #c8ff47;
}

.planner-status-done {
  background: rgba(71, 255, 176, 0.15);
  color: #47ffb0;
}

.planner-status-skipped {
  background: rgba(255, 158, 71, 0.15);
  color: #ff9e47;
}

@media (max-width: 900px) {
  .planner-checklist-grid {
    grid-template-columns: 1fr;
  }

  .planner-weather-head {
    flex-direction: column;
    align-items: stretch;
  }

  .planner-weekdays,
  .planner-calendar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .planner-weekdays,
  .planner-calendar-grid {
    grid-template-columns: 1fr;
  }
}


</style>