<template>
  <div>
    <div class="page-header">
      <div class="page-title">Goals</div>
      <div class="page-subtitle">Set targets, track progress</div>
    </div>

    <div class="card mb-3">
      <div class="card-title">New goal</div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Goal title</label>
          <input type="text" v-model="form.title" placeholder="Ride 500 km this year">
        </div>
        <div class="form-group">
          <label>Metric</label>
          <select v-model="form.metric">
            <option value="km">Distance (km)</option>
            <option value="rides">Number of rides</option>
            <option value="elev">Elevation (m)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target</label>
          <input type="number" v-model="form.target" placeholder="500" min="1">
        </div>
        <div class="form-group">
          <label>Start date</label>
          <input type="date" v-model="form.start">
        </div>
        <div class="form-group">
          <label>End date</label>
          <input type="date" v-model="form.end">
        </div>
      </div>
      <button class="btn btn-primary btn-full" @click="addGoal">+ Add Goal</button>
    </div>

    <div v-if="!goals.length" class="empty">
      <div class="empty-icon">🎯</div><p>No goals set yet.</p>
    </div>
    <div v-else>
      <div v-for="g in goals" :key="g.id" class="goal-card">
        <div class="goal-header">
          <div>
            <div class="goal-title">{{ g.title }} <span v-if="pct(g) >= 100">✅</span></div>
            <div class="goal-meta">{{ range(g) }} · {{ metricLabel(g.metric) }}</div>
          </div>
          <button class="del-btn" @click="deleteGoal(g.id)">✕</button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :class="{ done: pct(g) >= 100 }" :style="{ width: pct(g) + '%' }"></div>
        </div>
        <div class="flex justify-between">
          <span class="goal-pct">{{ progress(g).toFixed(1) }} / {{ g.target }} {{ metricLabel(g.metric) }}</span>
          <span class="goal-pct">{{ pct(g) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getRides, getGoals, saveGoals, fmtDate } from '../storage.js'

const goals = ref(getGoals())
const today = new Date().toISOString().slice(0,10)
const form  = ref({ title: '', metric: 'km', target: '', start: today, end: '' })

function addGoal() {
  if (!form.value.title || !form.value.target) return
  goals.value.push({ id: Date.now(), ...form.value, target: parseFloat(form.value.target) })
  saveGoals(goals.value)
  form.value = { title: '', metric: 'km', target: '', start: today, end: '' }
}

function deleteGoal(id) {
  goals.value = goals.value.filter(g => g.id !== id)
  saveGoals(goals.value)
}

function progress(g) {
  const rides = getRides().filter(r => {
    if (g.start && r.date < g.start) return false
    if (g.end   && r.date > g.end)   return false
    return true
  })
  if (g.metric === 'km')    return rides.reduce((s,r)=>s+r.dist,0)
  if (g.metric === 'rides') return rides.length
  if (g.metric === 'elev')  return rides.reduce((s,r)=>s+(r.elev||0),0)
  return 0
}

function pct(g) { return Math.min(100, Math.round((progress(g) / g.target) * 100)) }
function metricLabel(m) { return { km: 'km', rides: 'rides', elev: 'm elev' }[m] || '' }
function range(g) {
  const parts = [g.start, g.end].filter(Boolean).map(fmtDate)
  return parts.length ? parts.join(' → ') : 'All time'
}
</script>

<style scoped>
.goal-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.2rem; margin-bottom: 10px; }
.goal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
.goal-title { font-size: 15px; font-weight: 700; }
.goal-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.progress-bar { height: 8px; background: var(--surface2); border-radius: 100px; overflow: hidden; margin: 10px 0 6px; }
.progress-fill { height: 100%; border-radius: 100px; background: var(--accent); transition: width 0.4s ease; }
.progress-fill.done { background: #47ffb0; }
.goal-pct { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); }
</style>
