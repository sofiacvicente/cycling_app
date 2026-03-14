<template>
  <div>
    <div class="page-header">
      <div class="page-title">Stats</div>
      <div class="page-subtitle">Dig into your numbers</div>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-card"><div class="stat-val">{{ totalDist }}</div><div class="stat-lbl">Total km</div></div>
      <div class="stat-card"><div class="stat-val">{{ rides.length }}</div><div class="stat-lbl">Rides</div></div>
      <div class="stat-card"><div class="stat-val">{{ longest }}</div><div class="stat-lbl">Longest ride</div></div>
      <div class="stat-card"><div class="stat-val">{{ avgSpeed }}</div><div class="stat-lbl">Avg speed</div></div>
      <div class="stat-card"><div class="stat-val">{{ totalElev }}</div><div class="stat-lbl">Total elev (m)</div></div>
      <div class="stat-card"><div class="stat-val">{{ hours }}</div><div class="stat-lbl">Hours on bike</div></div>
    </div>

    <div class="grid-2 mb-3">
      <div class="card">
        <div class="card-title">Monthly km</div>
        <canvas ref="monthlyRef" height="160"></canvas>
      </div>
      <div class="card">
        <div class="card-title">Ride type breakdown</div>
        <canvas ref="typeRef" height="160"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Distance distribution</div>
      <canvas ref="distRef" height="100"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getRides, TYPE_COLORS } from '../storage.js'

const rides = ref(getRides())
const monthlyRef = ref(null)
const typeRef    = ref(null)
const distRef    = ref(null)

const totalDist = computed(() => rides.value.reduce((s,r)=>s+r.dist,0).toFixed(1))
const totalElev = computed(() => rides.value.reduce((s,r)=>s+(r.elev||0),0).toLocaleString())
const hours     = computed(() => (rides.value.reduce((s,r)=>s+(r.dur||0),0)/60).toFixed(1))
const longest   = computed(() => rides.value.length ? Math.max(...rides.value.map(r=>r.dist)).toFixed(1) : '0')
const avgSpeed  = computed(() => {
  const rs = rides.value.filter(r=>r.dist&&r.dur)
  return rs.length ? (rs.reduce((s,r)=>s+(r.dist/r.dur*60),0)/rs.length).toFixed(1)+' km/h' : '—'
})

const GRID = 'rgba(255,255,255,0.05)'
const TICK = { color: '#6b7280', font: { family: 'DM Mono', size: 11 } }

onMounted(async () => {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)
  const now = new Date()

  // Monthly km
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    const label = d.toLocaleString('default', { month: 'short' })
    const km = rides.value.filter(r => {
      const rd = new Date(r.date+'T00:00:00')
      return rd.getMonth()===d.getMonth() && rd.getFullYear()===d.getFullYear()
    }).reduce((s,r)=>s+r.dist,0)
    months.push({ label, km: parseFloat(km.toFixed(1)) })
  }
  new Chart(monthlyRef.value, {
    type: 'bar',
    data: { labels: months.map(m=>m.label), datasets: [{ data: months.map(m=>m.km), backgroundColor: 'rgba(200,255,71,0.25)', borderColor: '#c8ff47', borderWidth: 2, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: TICK, grid: { color: GRID } }, y: { ticks: TICK, grid: { color: GRID } } } }
  })

  // Type doughnut
  const typeCounts = {}
  rides.value.forEach(r => { typeCounts[r.type] = (typeCounts[r.type]||0) + r.dist })
  const types = Object.keys(typeCounts)
  new Chart(typeRef.value, {
    type: 'doughnut',
    data: { labels: types, datasets: [{ data: types.map(t=>parseFloat(typeCounts[t].toFixed(1))), backgroundColor: types.map(t=>TYPE_COLORS[t]||'#888'), borderWidth: 0 }] },
    options: { plugins: { legend: { labels: { color: '#6b7280', font: { family: 'Syne', size: 12 }, boxWidth: 12 } } } }
  })

  // Distance distribution
  const buckets = { '0–20':0, '20–40':0, '40–60':0, '60–80':0, '80–100':0, '100+':0 }
  rides.value.forEach(r => {
    if      (r.dist < 20)  buckets['0–20']++
    else if (r.dist < 40)  buckets['20–40']++
    else if (r.dist < 60)  buckets['40–60']++
    else if (r.dist < 80)  buckets['60–80']++
    else if (r.dist < 100) buckets['80–100']++
    else                   buckets['100+']++
  })
  new Chart(distRef.value, {
    type: 'bar',
    data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets), backgroundColor: 'rgba(71,207,255,0.25)', borderColor: '#47cfff', borderWidth: 2, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: TICK, grid: { color: GRID } }, y: { ticks: { ...TICK, stepSize: 1 }, grid: { color: GRID } } } }
  })
})
</script>
