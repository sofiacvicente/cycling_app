<template>
  <div>
    <div class="page-header">
      <div class="page-title">Stats</div>
      <div class="page-subtitle">Dig into your numbers</div>
    </div>

    <div v-if="loading" class="empty">
      <div class="empty-icon">⏳</div>
      <p>Loading stats...</p>
    </div>

    <template v-else>
      <div class="stats-grid mb-3">
        <div class="stat-card">
          <div class="stat-val">{{ totalDist }}</div>
          <div class="stat-lbl">Total km</div>
        </div>

        <div class="stat-card">
          <div class="stat-val">{{ rides.length }}</div>
          <div class="stat-lbl">Rides</div>
        </div>

        <div class="stat-card">
          <div class="stat-val">{{ longest }}</div>
          <div class="stat-lbl">Longest ride</div>
        </div>

        <div class="stat-card">
          <div class="stat-val">{{ avgSpeed }}</div>
          <div class="stat-lbl">Avg speed</div>
        </div>

        <div class="stat-card">
          <div class="stat-val">{{ totalElev }}</div>
          <div class="stat-lbl">Total elev (m)</div>
        </div>

        <div class="stat-card">
          <div class="stat-val">{{ hours }}</div>
          <div class="stat-lbl">Hours on bike</div>
        </div>
      </div>

      <div class="grid-2 mb-3">
        <div class="card stats-chart-card">
          <div class="card-title">Monthly km</div>
          <div class="stats-chart-wrap stats-chart-wrap-lg">
            <canvas ref="monthlyRef"></canvas>
          </div>
        </div>

        <div class="card stats-chart-card">
          <div class="card-title">Ride type breakdown</div>
          <div class="stats-chart-wrap stats-chart-wrap-lg">
            <canvas ref="typeRef"></canvas>
          </div>
        </div>
      </div>

      <div class="card stats-chart-card">
        <div class="card-title">Distance distribution</div>
        <div class="stats-chart-wrap stats-chart-wrap-sm">
          <canvas ref="distRef"></canvas>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { getRides, TYPE_COLORS } from '../storage.js'

const rides = ref([])
const loading = ref(true)

const monthlyRef = ref(null)
const typeRef = ref(null)
const distRef = ref(null)

let monthlyChart = null
let typeChart = null
let distChart = null

const totalDist = computed(() =>
  rides.value.reduce((s, r) => s + Number(r.dist || 0), 0).toFixed(1)
)

const totalElev = computed(() =>
  rides.value.reduce((s, r) => s + Number(r.elev || 0), 0).toLocaleString()
)

const hours = computed(() =>
  (rides.value.reduce((s, r) => s + Number(r.dur || 0), 0) / 60).toFixed(1)
)

const longest = computed(() =>
  rides.value.length
    ? Math.max(...rides.value.map(r => Number(r.dist || 0))).toFixed(1)
    : '0.0'
)

const avgSpeed = computed(() => {
  const rs = rides.value.filter(r => Number(r.dist) && Number(r.dur))
  return rs.length
    ? (
        rs.reduce((s, r) => s + (Number(r.dist) / Number(r.dur) * 60), 0) / rs.length
      ).toFixed(1) + ' km/h'
    : '—'
})

const GRID = 'rgba(255,255,255,0.05)'
const TICK = {
  color: '#8f99ad',
  font: { family: 'Inter', size: 11, weight: '600' }
}

function destroyCharts() {
  if (monthlyChart) {
    monthlyChart.destroy()
    monthlyChart = null
  }
  if (typeChart) {
    typeChart.destroy()
    typeChart = null
  }
  if (distChart) {
    distChart.destroy()
    distChart = null
  }
}

async function buildCharts() {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  destroyCharts()
  await nextTick()

  const now = new Date()

  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('default', { month: 'short' })

    const km = rides.value
      .filter(r => {
        if (!r.date) return false
        const rd = new Date(r.date + 'T00:00:00')
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear()
      })
      .reduce((s, r) => s + Number(r.dist || 0), 0)

    months.push({
      label,
      km: parseFloat(km.toFixed(1))
    })
  }

  monthlyChart = new Chart(monthlyRef.value, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          data: months.map(m => m.km),
          backgroundColor: 'rgba(214,255,87,0.25)',
          borderColor: '#d6ff57',
          borderWidth: 2,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: TICK,
          grid: { color: GRID },
          border: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          beginAtZero: true,
          ticks: TICK,
          grid: { color: GRID },
          border: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  })

  const typeCounts = {}
  rides.value.forEach(r => {
    const type = r.type || 'Other'
    typeCounts[type] = (typeCounts[type] || 0) + Number(r.dist || 0)
  })

  const types = Object.keys(typeCounts)
  const doughnutLabels = types.length ? types : ['No data']
  const doughnutData = types.length ? types.map(t => parseFloat(typeCounts[t].toFixed(1))) : [1]
  const doughnutColors = types.length ? types.map(t => TYPE_COLORS[t] || '#888') : ['#2a3142']

  typeChart = new Chart(typeRef.value, {
    type: 'doughnut',
    data: {
      labels: doughnutLabels,
      datasets: [
        {
          data: doughnutData,
          backgroundColor: doughnutColors,
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#8f99ad',
            font: { family: 'Inter', size: 12, weight: '600' },
            boxWidth: 12,
            padding: 16
          }
        }
      }
    }
  })

  const buckets = {
    '0–20': 0,
    '20–40': 0,
    '40–60': 0,
    '60–80': 0,
    '80–100': 0,
    '100+': 0
  }

  rides.value.forEach(r => {
    const dist = Number(r.dist || 0)

    if (dist < 20) buckets['0–20']++
    else if (dist < 40) buckets['20–40']++
    else if (dist < 60) buckets['40–60']++
    else if (dist < 80) buckets['60–80']++
    else if (dist < 100) buckets['80–100']++
    else buckets['100+']++
  })

  distChart = new Chart(distRef.value, {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [
        {
          data: Object.values(buckets),
          backgroundColor: 'rgba(71,207,255,0.25)',
          borderColor: '#47cfff',
          borderWidth: 2,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: TICK,
          grid: { color: GRID },
          border: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            ...TICK,
            stepSize: 1
          },
          grid: { color: GRID },
          border: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  })
}

onMounted(async () => {
  loading.value = true
  rides.value = await getRides()
  loading.value = false
  await buildCharts()
})

onBeforeUnmount(() => {
  destroyCharts()
})
</script>