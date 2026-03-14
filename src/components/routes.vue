<template>
  <div>
    <div class="page-header">
      <div class="page-title">Routes</div>
      <div class="page-subtitle">Save favourite routes and view a simple heatmap</div>
    </div>

    <div class="card mb-3">
      <div class="card-title">Add a route</div>
      <div class="form-grid">
        <div class="form-group"><label>Route name</label><input type="text" v-model="form.name" placeholder="Sunday Espresso Loop"></div>
        <div class="form-group"><label>Difficulty</label><select v-model="form.diff"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="epic">Epic</option></select></div>
        <div class="form-group"><label>Distance (km)</label><input type="number" v-model="form.dist" placeholder="45" min="0" step="0.1"></div>
        <div class="form-group"><label>Elevation (m)</label><input type="number" v-model="form.elev" placeholder="600" min="0"></div>
        <div class="form-group full"><label>Description</label><textarea v-model="form.desc" placeholder="Great café at km 30…"></textarea></div>
        <div class="form-group full"><label>Link (Strava / Komoot etc.)</label><input type="url" v-model="form.link" placeholder="https://www.strava.com/routes/..." /></div>
        <div class="form-group full">
          <label>Route points for heatmap</label>
          <textarea v-model="form.pointsText" placeholder="38.7223,-9.1393|38.7135,-9.1452|38.7050,-9.1511"></textarea>
          <small class="helper-text">Paste lat,lng pairs separated by | . Each point creates a heat spot.</small>
        </div>
      </div>
      <button class="btn btn-primary btn-full" @click="addRoute">+ Save Route</button>
    </div>

    <div class="card mb-3">
      <div class="card-title">Route heatmap</div>
      <div ref="mapRef" class="route-map"></div>
      <div class="helper-text" style="margin-top:10px">No GPX parser yet — this version uses stored route points to build a map heat effect.</div>
    </div>

    <div v-if="!routes.length" class="empty"><div class="empty-icon">🗺️</div><p>No routes saved yet.</p></div>
    <div v-else>
      <div v-for="r in routes" :key="r.id" class="route-card">
        <div class="route-icon">{{ ICONS[r.diff] }}</div>
        <div class="route-body">
          <div class="route-name">{{ r.name }}</div>
          <div v-if="r.desc" class="route-desc">{{ r.desc }}</div>
          <div class="route-tags">
            <span v-if="r.dist" class="pill accent">{{ r.dist }} km</span>
            <span v-if="r.elev" class="pill">↑{{ r.elev }}m</span>
            <span class="difficulty" :class="`diff-${r.diff}`">{{ r.diff }}</span>
            <span v-if="r.points?.length" class="pill">{{ r.points.length }} points</span>
            <a v-if="r.link" :href="r.link" target="_blank" class="pill open-link">Open ↗</a>
          </div>
        </div>
        <button class="del-btn" @click="deleteRoute(r.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { getRoutes, saveRoutes } from '../storage.js'

const routes = ref(getRoutes())
const mapRef = ref(null)
const ICONS = { easy: '🟢', medium: '🟡', hard: '🟠', epic: '🔴' }
const form = ref({ name: '', diff: 'easy', dist: '', elev: '', desc: '', link: '', pointsText: '' })

let L = null
let map = null
let layerGroup = null

function parsePoints(text) {
  return String(text || '')
    .split('|')
    .map(v => v.trim())
    .filter(Boolean)
    .map(pair => {
      const [lat, lng] = pair.split(',').map(Number)
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
    })
    .filter(Boolean)
}

function addRoute() {
  if (!form.value.name) return
  routes.value.push({
    id: Date.now(),
    name: form.value.name.trim(),
    diff: form.value.diff,
    dist: parseFloat(form.value.dist) || 0,
    elev: parseInt(form.value.elev) || 0,
    desc: form.value.desc.trim(),
    link: form.value.link.trim(),
    points: parsePoints(form.value.pointsText)
  })
  saveRoutes(routes.value)
  form.value = { name: '', diff: 'easy', dist: '', elev: '', desc: '', link: '', pointsText: '' }
  renderHeatmap()
}

function deleteRoute(id) {
  routes.value = routes.value.filter(r => r.id !== id)
  saveRoutes(routes.value)
  renderHeatmap()
}

async function ensureMap() {
  if (map) return
  const leaflet = await import('leaflet')
  L = leaflet.default || leaflet
  await import('leaflet/dist/leaflet.css')

  map = L.map(mapRef.value).setView([38.7223, -9.1393], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)
  layerGroup = L.layerGroup().addTo(map)
}

async function renderHeatmap() {
  await nextTick()
  await ensureMap()
  layerGroup.clearLayers()

  const allPoints = routes.value.flatMap(route => route.points || [])
  if (!allPoints.length) {
    map.setView([38.7223, -9.1393], 11)
    return
  }

  const bounds = []
  allPoints.forEach(point => {
    bounds.push([point.lat, point.lng])
    L.circle([point.lat, point.lng], {
      radius: 220,
      color: '#d6ff57',
      fillColor: '#d6ff57',
      fillOpacity: 0.12,
      weight: 1,
      opacity: 0.35
    }).addTo(layerGroup)
  })

  routes.value.forEach(route => {
    if (route.points?.length >= 2) {
      const polyline = L.polyline(route.points.map(p => [p.lat, p.lng]), {
        color: '#47cfff',
        weight: 3,
        opacity: 0.6
      }).addTo(layerGroup)
      polyline.bindPopup(`<strong>${route.name}</strong><br>${route.dist || 0} km`)
    }
  })

  map.fitBounds(bounds, { padding: [24, 24] })
}

onMounted(renderHeatmap)
</script>

<style scoped>
.route-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.2rem; margin-bottom: 10px; display: flex; align-items: flex-start; gap: 1rem; transition: border-color 0.15s; }
.route-card:hover { border-color: rgba(255,255,255,0.14); }
.route-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 2px; }
.route-body { flex: 1; min-width: 0; }
.route-name { font-size: 15px; font-weight: 700; margin-bottom: 5px; }
.route-desc { font-size: 13px; color: var(--muted); margin-bottom: 8px; line-height: 1.5; }
.route-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.difficulty { padding: 2px 9px; border-radius: 7px; font-size: 12px; }
.diff-easy   { background: rgba(71,255,176,0.15); color: #47ffb0; }
.diff-medium { background: rgba(200,255,71,0.15);  color: #c8ff47; }
.diff-hard   { background: rgba(255,158,71,0.15);  color: #ff9e47; }
.diff-epic   { background: rgba(255,91,91,0.15);   color: #ff5b5b; }
.open-link   { color: var(--accent); background: var(--accent-dim); text-decoration: none; }
</style>