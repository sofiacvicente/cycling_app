<template>
  <div>
    <div class="page-header">
      <div class="page-title">Garage</div>
      <div class="page-subtitle">Bike management and maintenance tracker</div>
    </div>

    <div class="grid-2 mb-3 garage-grid">
      <div class="card">
        <div class="card-title">Add a bike</div>
        <div class="form-grid">
          <div class="form-group"><label>Name</label><input v-model="bikeForm.name" placeholder="Canyon Endurace" /></div>
          <div class="form-group"><label>Type</label><input v-model="bikeForm.type" placeholder="Road bike" /></div>
          <div class="form-group"><label>Brand</label><input v-model="bikeForm.brand" placeholder="Canyon" /></div>
          <div class="form-group"><label>Notes</label><input v-model="bikeForm.notes" placeholder="Summer race setup" /></div>
        </div>
        <button class="btn btn-primary btn-full" @click="addBike">+ Save bike</button>
      </div>

      <div class="card">
        <div class="card-title">Add service item</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Bike</label>
            <select v-model="serviceForm.bikeId">
              <option value="">Choose bike</option>
              <option v-for="bike in bikes" :key="bike.id" :value="bike.id">{{ bike.name }}</option>
            </select>
          </div>
          <div class="form-group"><label>Part</label><input v-model="serviceForm.part" placeholder="Chain" /></div>
          <div class="form-group"><label>Service every (km)</label><input type="number" v-model="serviceForm.intervalKm" min="1" placeholder="3000" /></div>
          <div class="form-group"><label>Last serviced at (km)</label><input type="number" v-model="serviceForm.lastServiceKm" min="0" placeholder="1200" /></div>
        </div>
        <button class="btn btn-primary btn-full" @click="addService">+ Save service item</button>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-title">Bikes</div>
      <div v-if="!bikes.length" class="empty"><div class="empty-icon">🚲</div><p>No bikes yet.</p></div>
      <div v-else class="garage-list">
        <div v-for="bike in bikes" :key="bike.id" class="garage-card">
          <div>
            <div class="garage-name">{{ bike.name }}</div>
            <div class="garage-meta">{{ bike.brand || 'Brand free' }} · {{ bike.type || 'Bike' }}</div>
            <div v-if="bike.notes" class="ride-note">{{ bike.notes }}</div>
            <div class="ride-meta" style="margin-top:10px">
              <span class="pill accent">{{ bikeDistance(bike.id).toFixed(1) }} km logged</span>
              <span class="pill">{{ bikeRideCount(bike.id) }} rides</span>
            </div>
          </div>
          <button class="del-btn" @click="deleteBike(bike.id)">✕</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Maintenance</div>
      <div v-if="!serviceItems.length" class="empty"><div class="empty-icon">🛠️</div><p>No service items yet.</p></div>
      <div v-else class="garage-list">
        <div v-for="item in serviceItems" :key="item.id" class="garage-card">
          <div style="flex:1">
            <div class="garage-name">{{ item.part }} · {{ bikeName(item.bikeId) }}</div>
            <div class="garage-meta">Every {{ item.intervalKm }} km · last serviced at {{ item.lastServiceKm }} km</div>
            <div class="progress-bar">
              <div class="progress-fill" :class="{ done: remainingKm(item) > 0 }" :style="{ width: `${Math.min(100, progressPct(item))}%` }"></div>
            </div>
            <div class="flex justify-between">
              <span class="goal-pct">Bike km now: {{ bikeDistance(item.bikeId).toFixed(1) }}</span>
              <span class="goal-pct" :style="remainingKm(item) <= 250 ? 'color:#ff9e47' : ''">
                {{ remainingKm(item) <= 0 ? 'Service due now' : `${remainingKm(item).toFixed(0)} km left` }}
              </span>
            </div>
          </div>
          <button class="del-btn" @click="deleteService(item.id)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getBikes, saveBikes, getBikeService, saveBikeService, getRidesWithExtras } from '../storage.js'

const bikes = ref([])
const serviceItems = ref([])
const rides = ref([])

const bikeForm = ref({ name: '', type: '', brand: '', notes: '' })
const serviceForm = ref({ bikeId: '', part: '', intervalKm: '', lastServiceKm: '' })

async function loadAll() {
  bikes.value = getBikes()
  serviceItems.value = getBikeService()
  rides.value = await getRidesWithExtras()
}

function addBike() {
  if (!bikeForm.value.name) return
  bikes.value.push({ id: Date.now(), ...bikeForm.value })
  saveBikes(bikes.value)
  bikeForm.value = { name: '', type: '', brand: '', notes: '' }
}

function deleteBike(id) {
  bikes.value = bikes.value.filter(b => b.id !== id)
  serviceItems.value = serviceItems.value.filter(s => s.bikeId !== id)
  saveBikes(bikes.value)
  saveBikeService(serviceItems.value)
}

function addService() {
  if (!serviceForm.value.bikeId || !serviceForm.value.part || !serviceForm.value.intervalKm) return
  serviceItems.value.push({
    id: Date.now(),
    bikeId: Number(serviceForm.value.bikeId),
    part: serviceForm.value.part,
    intervalKm: Number(serviceForm.value.intervalKm),
    lastServiceKm: Number(serviceForm.value.lastServiceKm || 0)
  })
  saveBikeService(serviceItems.value)
  serviceForm.value = { bikeId: '', part: '', intervalKm: '', lastServiceKm: '' }
}

function deleteService(id) {
  serviceItems.value = serviceItems.value.filter(item => item.id !== id)
  saveBikeService(serviceItems.value)
}

function bikeName(id) {
  return bikes.value.find(b => b.id === id)?.name || 'Unknown bike'
}

function bikeDistance(id) {
  const bike = bikes.value.find(b => b.id === id)
  if (!bike) return 0
  return rides.value.filter(r => r.bike === bike.name).reduce((sum, r) => sum + Number(r.dist || 0), 0)
}

function bikeRideCount(id) {
  const bike = bikes.value.find(b => b.id === id)
  if (!bike) return 0
  return rides.value.filter(r => r.bike === bike.name).length
}

function riddenSinceService(item) {
  return Math.max(0, bikeDistance(item.bikeId) - item.lastServiceKm)
}

function progressPct(item) {
  return (riddenSinceService(item) / item.intervalKm) * 100
}

function remainingKm(item) {
  return item.intervalKm - riddenSinceService(item)
}

onMounted(loadAll)
</script>

<style scoped>
.garage-grid { align-items: start; }
.garage-list { display: grid; gap: 12px; }
.garage-card { display:flex; justify-content:space-between; gap:16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 18px; padding: 16px; }
.garage-name { font-size: 16px; font-weight: 800; }
.garage-meta { color: var(--muted); font-size: 13px; margin-top: 4px; }
</style>