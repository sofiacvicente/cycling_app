<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <div class="page-title">Rides</div>
        <div class="page-subtitle">
          {{ editingRideId ? 'Editing ride' : 'Your complete ride history' }}
        </div>
      </div>
      <span class="badge">{{ rides.length }} ride{{ rides.length !== 1 ? 's' : '' }}</span>
    </div>

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
        <div class="stat-val">{{ avgDist }}</div>
        <div class="stat-lbl">Avg km</div>
      </div>

      <div class="stat-card">
        <div class="stat-val">{{ totalElev }}</div>
        <div class="stat-lbl">Total elev (m)</div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-title">
        {{ editingRideId ? 'Edit ride' : 'Log a ride' }}
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Date</label>
          <input type="date" v-model="form.date" />
        </div>

        <div class="form-group">
          <label>Type</label>
          <select v-model="form.type">
            <option>Road</option>
            <option>MTB</option>
            <option>Gravel</option>
            <option>Indoor</option>
            <option>E-Bike</option>
          </select>
        </div>

        <div class="form-group">
          <label>Distance (km)</label>
          <input type="number" v-model="form.dist" placeholder="42.2" min="0" step="0.1" />
        </div>

        <div class="form-group">
          <label>Duration (min)</label>
          <input type="number" v-model="form.dur" placeholder="90" min="0" />
        </div>

        <div class="form-group">
          <label>Elevation (m)</label>
          <input type="number" v-model="form.elev" placeholder="350" min="0" />
        </div>

        <div class="form-group">
          <label>Title</label>
          <input type="text" v-model="form.title" placeholder="Morning loop" />
        </div>

        <div class="form-group full">
          <label>Ride photo</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            @change="handlePhotoChange"
          />

          <div v-if="form.photo" class="ride-photo-preview-wrap">
            <img :src="form.photo" alt="Ride preview" class="ride-photo-preview" />
            <button
              type="button"
              class="btn btn-ghost"
              style="margin-top:10px"
              @click="removePhoto"
            >
              Remove photo
            </button>
          </div>
        </div>

        <div class="form-group full">
          <label>Notes</label>
          <textarea v-model="form.notes" placeholder="How did it go?"></textarea>
        </div>
      </div>

      <button class="btn btn-primary btn-full" @click="handleSaveRide" :disabled="saving">
        {{
          saving
            ? (editingRideId ? 'Updating...' : 'Saving...')
            : (editingRideId ? 'Save changes' : '+ Log Ride')
        }}
      </button>

      <button
        v-if="editingRideId"
        class="btn btn-ghost btn-full"
        style="margin-top:10px"
        @click="cancelEdit"
      >
        Cancel edit
      </button>
    </div>

    <div class="flex items-center justify-between mb-2">
      <span
        style="font-size:13px;color:var(--muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase"
      >
        All Rides
      </span>

      <button
        class="btn btn-ghost"
        style="font-size:12px;padding:5px 12px"
        @click="toggleSort"
      >
        Sort: {{ sortNewest ? 'Newest' : 'Oldest' }}
      </button>
    </div>

    <div v-if="loading" class="empty">
      <div class="empty-icon">⏳</div>
      <p>Loading rides...</p>
    </div>

    <div v-else-if="!sorted.length" class="empty">
      <div class="empty-icon">🚴</div>
      <p>No rides yet.</p>
    </div>

    <div v-else>
      <div v-for="r in sorted" :key="r.id" class="ride-card ride-card-rich">
        <img v-if="r.photo" :src="r.photo" alt="Ride photo" class="ride-photo-thumb" />
        <div v-else class="ride-photo-thumb ride-photo-fallback">📷</div>

        <div class="ride-main">
          <div class="ride-top-row">
            <div class="ride-top-left">
              <div class="type-dot" :style="{ background: typeColor(r.type) }"></div>
              <span class="ride-date">{{ fmtDate(r.date) }}</span>
            </div>

            <div class="ride-actions">
              <button class="btn btn-ghost ride-edit-btn" @click="startEdit(r)">
                Edit
              </button>

              <button class="del-btn" @click="handleDeleteRide(r.id)" :disabled="deletingId === r.id">
                {{ deletingId === r.id ? '...' : '✕' }}
              </button>
            </div>
          </div>

          <div class="ride-body">
            <div class="ride-name">{{ r.title }}</div>

            <div class="ride-meta">
              <span class="pill accent">{{ Number(r.dist).toFixed(1) }} km</span>
              <span v-if="r.dur" class="pill">{{ fmtDur(r.dur) }}</span>
              <span v-if="r.elev" class="pill">↑{{ r.elev }}m</span>
              <span v-if="speed(r)" class="pill">{{ speed(r) }}</span>
              <span class="pill">{{ r.type }}</span>
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
import {
  getRidesWithExtras,
  addRide as addRideToDb,
  updateRide as updateRideInDb,
  deleteRide as deleteRideFromDb,
  saveRideExtra,
  getRideDraft,
  clearRideDraft,
  TYPE_COLORS,
  fmtDate,
  fmtDur,
  fmtSpeed
} from '../storage.js'

const rides = ref([])
const loading = ref(true)
const saving = ref(false)
const deletingId = ref(null)
const sortNewest = ref(true)
const editingRideId = ref(null)

const today = new Date().toISOString().slice(0, 10)

const form = ref({
  date: today,
  type: 'Road',
  dist: '',
  dur: '',
  elev: '',
  title: '',
  notes: '',
  photo: ''
})

const typeColor = t => TYPE_COLORS[t] || '#888'
const speed = r => fmtSpeed(Number(r.dist || 0), Number(r.dur || 0))

const totalDist = computed(() =>
  rides.value.reduce((sum, r) => sum + Number(r.dist || 0), 0).toFixed(1)
)

const avgDist = computed(() =>
  rides.value.length
    ? (
        rides.value.reduce((sum, r) => sum + Number(r.dist || 0), 0) /
        rides.value.length
      ).toFixed(1)
    : '0.0'
)

const totalElev = computed(() =>
  rides.value.reduce((sum, r) => sum + Number(r.elev || 0), 0).toLocaleString()
)

const sorted = computed(() =>
  [...rides.value].sort((a, b) =>
    sortNewest.value
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
  )
)

function resetForm() {
  form.value = {
    date: today,
    type: 'Road',
    dist: '',
    dur: '',
    elev: '',
    title: '',
    notes: '',
    photo: ''
  }
}

async function loadRides() {
  loading.value = true
  rides.value = await getRidesWithExtras()
  loading.value = false
}

function loadDraftIntoForm() {
  const draft = getRideDraft()
  if (!draft) return

  form.value = {
    date: draft.date || today,
    type: draft.type || 'Road',
    dist: draft.dist ?? '',
    dur: draft.dur ?? '',
    elev: draft.elev ?? '',
    title: draft.title || '',
    notes: draft.notes || '',
    photo: draft.photo || ''
  }

  clearRideDraft()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(ride) {
  editingRideId.value = ride.id

  form.value = {
    date: ride.date || today,
    type: ride.type || 'Road',
    dist: ride.dist ?? '',
    dur: ride.dur ?? '',
    elev: ride.elev ?? '',
    title: ride.title || '',
    notes: ride.notes || '',
    photo: ride.photo || ''
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  editingRideId.value = null
  resetForm()
}

function handlePhotoChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    form.value.photo = reader.result
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  form.value.photo = ''
}

async function handleSaveRide() {
  if (!form.value.date || !form.value.dist) return

  try {
    saving.value = true

    const payload = {
      date: form.value.date,
      type: form.value.type,
      dist: parseFloat(form.value.dist),
      dur: parseInt(form.value.dur) || 0,
      elev: parseInt(form.value.elev) || 0,
      title: form.value.title.trim() || 'Untitled Ride',
      notes: form.value.notes.trim()
    }

    let savedRide

    if (editingRideId.value) {
      savedRide = await updateRideInDb(editingRideId.value, payload)
    } else {
      savedRide = await addRideToDb(payload)
    }

    saveRideExtra(savedRide.id, {
      photo: form.value.photo
    })

    await loadRides()
    resetForm()
    editingRideId.value = null
  } catch (error) {
    console.error('Failed to save ride:', error)
    alert('Could not save the ride.')
  } finally {
    saving.value = false
  }
}

async function handleDeleteRide(id) {
  try {
    deletingId.value = id
    await deleteRideFromDb(id)

    if (editingRideId.value === id) {
      editingRideId.value = null
      resetForm()
    }

    await loadRides()
  } catch (error) {
    console.error('Failed to delete ride:', error)
    alert('Could not delete the ride.')
  } finally {
    deletingId.value = null
  }
}

function toggleSort() {
  sortNewest.value = !sortNewest.value
}

onMounted(async () => {
  await loadRides()
  loadDraftIntoForm()
})
</script>