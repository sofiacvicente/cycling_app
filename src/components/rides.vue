<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <div class="page-title">Rides</div>
        <div class="page-subtitle">Your complete ride history</div>
      </div>
      <span class="badge">{{ rides.length }} ride{{ rides.length !== 1 ? 's' : '' }}</span>
    </div>

    <div class="stats-grid mb-3">
      <div class="stat-card"><div class="stat-val">{{ totalDist }}</div><div class="stat-lbl">Total km</div></div>
      <div class="stat-card"><div class="stat-val">{{ rides.length }}</div><div class="stat-lbl">Rides</div></div>
      <div class="stat-card"><div class="stat-val">{{ avgDist }}</div><div class="stat-lbl">Avg km</div></div>
      <div class="stat-card"><div class="stat-val">{{ totalElev }}</div><div class="stat-lbl">Total elev (m)</div></div>
    </div>

    <div class="card mb-3">
      <div class="card-title">Log a ride</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Date</label>
          <input type="date" v-model="form.date">
        </div>
        <div class="form-group">
          <label>Type</label>
          <select v-model="form.type">
            <option>Road</option><option>MTB</option><option>Gravel</option>
            <option>Indoor</option><option>E-Bike</option>
          </select>
        </div>
        <div class="form-group">
          <label>Distance (km)</label>
          <input type="number" v-model="form.dist" placeholder="42.2" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Duration (min)</label>
          <input type="number" v-model="form.dur" placeholder="90" min="0">
        </div>
        <div class="form-group">
          <label>Elevation (m)</label>
          <input type="number" v-model="form.elev" placeholder="350" min="0">
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" v-model="form.title" placeholder="Morning loop">
        </div>
        <div class="form-group full">
          <label>Notes</label>
          <textarea v-model="form.notes" placeholder="How did it go?"></textarea>
        </div>
      </div>
      <button class="btn btn-primary btn-full" @click="addRide">+ Log Ride</button>
    </div>

    <div class="flex items-center justify-between mb-2">
      <span style="font-size:13px;color:var(--muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase">All Rides</span>
      <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" @click="toggleSort">
        Sort: {{ sortNewest ? 'Newest' : 'Oldest' }}
      </button>
    </div>

    <div v-if="!sorted.length" class="empty">
      <div class="empty-icon">🚴</div><p>No rides yet.</p>
    </div>
    <div v-else>
      <div v-for="r in sorted" :key="r.id" class="ride-card">
        <div class="type-dot" :style="{ background: typeColor(r.type) }"></div>
        <div style="min-width:62px"><span class="ride-date">{{ fmtDate(r.date) }}</span></div>
        <div class="ride-body">
          <div class="ride-name">{{ r.title }}</div>
          <div class="ride-meta">
            <span class="pill accent">{{ r.dist }} km</span>
            <span v-if="r.dur"  class="pill">{{ fmtDur(r.dur) }}</span>
            <span v-if="r.elev" class="pill">↑{{ r.elev }}m</span>
            <span v-if="speed(r)" class="pill">{{ speed(r) }}</span>
            <span class="pill">{{ r.type }}</span>
          </div>
          <div v-if="r.notes" class="ride-note">{{ r.notes }}</div>
        </div>
        <button class="del-btn" @click="deleteRide(r.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getRides, saveRides, TYPE_COLORS, fmtDate, fmtDur, fmtSpeed } from '../storage.js'

const rides     = ref(getRides())
const sortNewest = ref(true)

const typeColor = t => TYPE_COLORS[t] || '#888'
const speed     = r => fmtSpeed(r.dist, r.dur)

const totalDist = computed(() => rides.value.reduce((s,r)=>s+r.dist,0).toFixed(1))
const avgDist   = computed(() => rides.value.length ? (rides.value.reduce((s,r)=>s+r.dist,0)/rides.value.length).toFixed(1) : '0')
const totalElev = computed(() => rides.value.reduce((s,r)=>s+(r.elev||0),0).toLocaleString())
const sorted    = computed(() => [...rides.value].sort((a,b) =>
  sortNewest.value ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))

const today = new Date().toISOString().slice(0,10)
const form = ref({ date: today, type: 'Road', dist: '', dur: '', elev: '', title: '', notes: '' })

function addRide() {
  if (!form.value.date || !form.value.dist) return
  rides.value.push({
    id:    Date.now(),
    date:  form.value.date,
    type:  form.value.type,
    dist:  parseFloat(form.value.dist),
    dur:   parseInt(form.value.dur)  || 0,
    elev:  parseInt(form.value.elev) || 0,
    title: form.value.title.trim() || 'Untitled Ride',
    notes: form.value.notes.trim()
  })
  saveRides(rides.value)
  form.value = { date: today, type: 'Road', dist: '', dur: '', elev: '', title: '', notes: '' }
}

function deleteRide(id) {
  rides.value = rides.value.filter(r => r.id !== id)
  saveRides(rides.value)
}

function toggleSort() { sortNewest.value = !sortNewest.value }
</script>
