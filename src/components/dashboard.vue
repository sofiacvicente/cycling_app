<template>
  <div class="dashboard-stack">
    <section class="dashboard-hero">
      <div class="dashboard-hero-content">
        <div class="dashboard-kicker">
          <span>✦</span>
          <span>{{ rides.length ? `${rides.length} rides logged` : 'Start your journey' }}</span>
        </div>

        <h2>{{ rides.length ? 'Your riding story is getting richer.' : 'Ready for the first ride?' }}</h2>

        <p>
          {{
            rides.length
              ? `You’ve logged ${totalDist} km, climbed ${totalElev} m, and built a ${streak.current}-day streak.`
              : 'Log your first ride and start building a visual trail with distance, weather, bikes and photos.'
          }}
        </p>

        <div class="hero-actions-row">
          <a href="/app/rides" class="hero-btn primary">Log a ride</a>
          <a href="/app/garage" class="hero-btn secondary">Open garage</a>
          <button class="hero-btn secondary" @click="toggleTheme">
            {{ theme === 'dark' ? '☀ Light mode' : '🌙 Dark mode' }}
          </button>
        </div>
      </div>
    </section>

    <JourneyGraph :rides="rides" />

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-top"><div class="stat-chip">KM</div></div>
        <div class="stat-val">{{ totalDist }}</div>
        <div class="stat-lbl">Total distance</div>
        <div class="stat-sub">All rides combined</div>
      </div>

      <div class="stat-card">
        <div class="stat-top"><div class="stat-chip">🔥</div></div>
        <div class="stat-val">{{ streak.current }}</div>
        <div class="stat-lbl">Current streak</div>
        <div class="stat-sub">Consecutive ride days</div>
      </div>

      <div class="stat-card">
        <div class="stat-top"><div class="stat-chip">BEST</div></div>
        <div class="stat-val">{{ streak.best }}</div>
        <div class="stat-lbl">Best streak</div>
        <div class="stat-sub">Strongest run so far</div>
      </div>

      <div class="stat-card">
        <div class="stat-top"><div class="stat-chip">AVG</div></div>
        <div class="stat-val">{{ avgDist }}</div>
        <div class="stat-lbl">Average km</div>
        <div class="stat-sub">Per ride average</div>
      </div>

      <div class="stat-card">
        <div class="stat-top"><div class="stat-chip">ELEV</div></div>
        <div class="stat-val">{{ totalElev }}</div>
        <div class="stat-lbl">Elevation gain</div>
        <div class="stat-sub">Meters climbed</div>
      </div>

      <div class="stat-card">
        <div class="stat-top"><div class="stat-chip">BIKES</div></div>
        <div class="stat-val">{{ bikes.length }}</div>
        <div class="stat-lbl">Bikes in garage</div>
        <div class="stat-sub">Ready to ride</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card chart-card">
        <div class="card-title">Activity · last 8 weeks</div>
        <div class="chart-wrap"><canvas ref="chartRef" height="110"></canvas></div>
      </div>

      <div class="dashboard-side-stack">
        <div class="card">
          <div class="card-title">This month</div>
          <div class="month-stack">
            <div class="month-mini"><strong>{{ monthRides }}</strong><span>Rides this month</span></div>
            <div class="month-mini"><strong>{{ monthDist }}</strong><span>Km this month</span></div>
            <div class="month-mini"><strong>{{ monthElev }}</strong><span>M elevation</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Quick actions</div>
          <div class="quick-actions">
            <a href="/app/rides" class="quick-action"><strong>Log ride</strong><span>Add photo + weather</span></a>
            <a href="/app/garage" class="quick-action"><strong>Garage</strong><span>Bikes & maintenance</span></a>
            <a href="/app/routes" class="quick-action"><strong>Heatmap</strong><span>See route hotspots</span></a>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Recent rides</div>

      <div v-if="!recent.length" class="empty">
        <div class="empty-icon">🚴</div>
        <div class="empty-title">No rides yet</div>
        <p>Your adventure starts here. Add your first ride to bring the dashboard to life.</p>
        <div class="empty-action"><a href="/app/rides" class="btn btn-primary">Log your first ride</a></div>
      </div>

      <div v-else class="ride-list-with-photos">
        <div v-for="r in recent" :key="r.id" class="ride-card ride-card-rich">
          <img v-if="r.photo" :src="r.photo" alt="Ride photo" class="ride-photo-thumb" />
          <div v-else class="ride-photo-thumb ride-photo-fallback">📷</div>

          <div class="ride-body">
            <div class="flex items-center justify-between gap-2">
              <div class="ride-name">{{ r.title }}</div>
              <div class="ride-date">{{ fmtDate(r.date) }}</div>
            </div>

            <div class="ride-meta">
              <span class="pill accent">{{ Number(r.dist).toFixed(1) }} km</span>
              <span v-if="r.dur" class="pill">{{ fmtDur(r.dur) }}</span>
              <span v-if="r.elev" class="pill">{{ r.elev }} m</span>
              <span v-if="r.bike" class="pill">🚲 {{ r.bike }}</span>
              <span v-if="weatherLabel(r)" class="pill">{{ weatherLabel(r) }}</span>
            </div>

            <div v-if="r.notes" class="ride-note">{{ r.notes }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRidesWithExtras, getBikes, fmtDate, fmtDur, computeRideStreak, getSettings, applyTheme } from '../storage.js'
import JourneyGraph from './journeygraph.vue'

const rides = ref([])
const bikes = ref([])
const chartRef = ref(null)
const theme = ref(getSettings().theme || 'dark')

const totalDist = computed(() => rides.value.reduce((s, r) => s + Number(r.dist || 0), 0).toFixed(1))
const totalElev = computed(() => rides.value.reduce((s, r) => s + Number(r.elev || 0), 0).toLocaleString())
const avgDist = computed(() => rides.value.length ? (rides.value.reduce((s, r) => s + Number(r.dist || 0), 0) / rides.value.length).toFixed(1) : '0.0')
const recent = computed(() => [...rides.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))
const streak = computed(() => computeRideStreak(rides.value))

const now = new Date()
const thisMonthRides = computed(() => rides.value.filter(r => {
  const d = new Date(r.date + 'T00:00:00')
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}))
const monthRides = computed(() => thisMonthRides.value.length)
const monthDist = computed(() => thisMonthRides.value.reduce((s, r) => s + Number(r.dist || 0), 0).toFixed(1))
const monthElev = computed(() => thisMonthRides.value.reduce((s, r) => s + Number(r.elev || 0), 0).toLocaleString())

function pad(n) {
  return String(n).padStart(2, '0')
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  applyTheme(theme.value)
}

function weatherLabel(ride) {
  if (ride.temperature == null && !ride.weatherCodeLabel) return ''
  const temp = ride.temperature != null ? `${Math.round(ride.temperature)}°C` : ''
  return [temp, ride.weatherCodeLabel].filter(Boolean).join(' · ')
}

onMounted(async () => {
  rides.value = await getRidesWithExtras()
  bikes.value = getBikes()

  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const weeks = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() - i * 7)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 7)

    const label = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}`
    const km = rides.value
      .filter(r => {
        const d = new Date(r.date + 'T00:00:00')
        return d >= start && d < end
      })
      .reduce((s, r) => s + Number(r.dist || 0), 0)

    weeks.push({ label, km: parseFloat(km.toFixed(1)) })
  }

  new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels: weeks.map(w => w.label),
      datasets: [{
        data: weeks.map(w => w.km),
        fill: true,
        tension: 0.35,
        borderColor: '#d6ff57',
        backgroundColor: 'rgba(214,255,87,0.10)',
        pointRadius: 3,
        pointBackgroundColor: '#d6ff57'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8f99ad' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8f99ad' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  })
})
</script>