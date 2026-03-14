<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  rides: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 300
  }
})

const width = 920
const padding = 34

const parsedRides = computed(() => {
  return [...props.rides]
    .filter(r => r.date)
    .map((ride, index) => {
      const d = new Date(ride.date + 'T00:00:00')

      return {
        ...ride,
        index,
        dateObj: d,
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        dist: Number(ride.dist || 0),
        elev: Number(ride.elev || 0)
      }
    })
    .sort((a, b) => a.dateObj - b.dateObj)
})

const availableMonths = computed(() => {
  const map = new Map()

  parsedRides.value.forEach(ride => {
    const key = `${ride.year}-${ride.month}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        year: ride.year,
        month: ride.month
      })
    }
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
})

const currentMonthIndex = ref(Math.max(availableMonths.value.length - 1, 0))

const currentMonthData = computed(() => {
  if (!availableMonths.value.length) return null
  return availableMonths.value[currentMonthIndex.value]
})

const ridesInMonth = computed(() => {
  if (!currentMonthData.value) return []
  return parsedRides.value.filter(
    r =>
      r.year === currentMonthData.value.year &&
      r.month === currentMonthData.value.month
  )
})

const daysInCurrentMonth = computed(() => {
  if (!currentMonthData.value) return 30
  return new Date(
    currentMonthData.value.year,
    currentMonthData.value.month + 1,
    0
  ).getDate()
})

const maxElev = computed(() => {
  const max = Math.max(...ridesInMonth.value.map(r => r.elev), 300)
  return max <= 0 ? 300 : max
})

const minElev = computed(() => {
  const min = Math.min(...ridesInMonth.value.map(r => r.elev), 0)
  return min
})

const elevRange = computed(() => {
  const range = maxElev.value - minElev.value
  return range <= 0 ? 1 : range
})

function getX(day) {
  return padding + ((day - 1) / Math.max(daysInCurrentMonth.value - 1, 1)) * (width - padding * 2)
}

function getY(elev) {
  const normalized = (elev - minElev.value) / elevRange.value
  return props.height - padding - normalized * (props.height - padding * 2)
}

const points = computed(() => {
  return ridesInMonth.value.map(ride => ({
    ...ride,
    x: getX(ride.day),
    y: getY(ride.elev)
  }))
})

const pathD = computed(() => {
  if (!points.value.length) return ''
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
})

const areaD = computed(() => {
  if (!points.value.length) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  const baseY = props.height - padding

  return [
    `M ${first.x} ${baseY}`,
    ...points.value.map(p => `L ${p.x} ${p.y}`),
    `L ${last.x} ${baseY}`,
    'Z'
  ].join(' ')
})

const lastPoint = computed(() => {
  if (!points.value.length) return null
  return points.value[points.value.length - 1]
})

const monthTitle = computed(() => {
  if (!currentMonthData.value) return 'No month'
  return new Date(currentMonthData.value.year, currentMonthData.value.month).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  })
})

const totalDistanceMonth = computed(() =>
  ridesInMonth.value.reduce((sum, r) => sum + r.dist, 0).toFixed(1)
)

const totalRidesMonth = computed(() => ridesInMonth.value.length)

const avgElevationMonth = computed(() => {
  if (!ridesInMonth.value.length) return 0
  const avg = ridesInMonth.value.reduce((sum, r) => sum + r.elev, 0) / ridesInMonth.value.length
  return Math.round(avg)
})

const dayLabels = computed(() => {
  const totalTicks = Math.min(6, daysInCurrentMonth.value)
  return Array.from({ length: totalTicks }, (_, i) => {
    const day = Math.round(1 + (i / Math.max(totalTicks - 1, 1)) * (daysInCurrentMonth.value - 1))
    return {
      day,
      x: getX(day)
    }
  })
})

function prevMonth() {
  if (currentMonthIndex.value > 0) currentMonthIndex.value--
}

function nextMonth() {
  if (currentMonthIndex.value < availableMonths.value.length - 1) currentMonthIndex.value++
}
</script>

<template>
  <div class="journey-card card">
    <div class="journey-head">
      <div>
        <div class="card-title">Ride journey</div>
        <h3 class="journey-title">Daily distance vs elevation</h3>
      </div>

      <div class="journey-legend">
        <span><i class="legend-dot distance"></i> Ride path</span>
        <span><i class="legend-dot rider"></i> Current rider</span>
      </div>
    </div>

    <div v-if="!availableMonths.length" class="empty">
      <div class="empty-icon">🚴</div>
      <div class="empty-title">No rides yet</div>
      <p>Log rides and the cyclist will start moving through each month.</p>
    </div>

    <div v-else class="journey-wrap">
      <div class="journey-toolbar">
        <button class="month-nav-btn" @click="prevMonth" :disabled="currentMonthIndex === 0">
          ←
        </button>

        <div class="journey-month-title">{{ monthTitle }}</div>

        <button
          class="month-nav-btn"
          @click="nextMonth"
          :disabled="currentMonthIndex === availableMonths.length - 1"
        >
          →
        </button>
      </div>

      <svg
        class="journey-svg"
        :viewBox="`0 0 ${width} ${height}`"
        preserveAspectRatio="none"
      >
        <!-- horizontal grid -->
        <line
          v-for="n in 4"
          :key="`h-${n}`"
          :x1="padding"
          :x2="width - padding"
          :y1="padding + ((height - padding * 2) / 4) * n"
          :y2="padding + ((height - padding * 2) / 4) * n"
          class="grid-line"
        />

        <!-- axis -->
        <line
          :x1="padding"
          :x2="width - padding"
          :y1="height - padding"
          :y2="height - padding"
          class="axis-line"
        />

        <!-- area -->
        <path v-if="points.length" :d="areaD" class="journey-area" />

        <!-- line -->
        <path v-if="points.length" :d="pathD" class="journey-line" />

        <!-- points -->
        <g v-for="point in points" :key="point.index">
          <circle :cx="point.x" :cy="point.y" r="5" class="journey-point" />
        </g>

        <!-- cyclist -->
        <g
          v-if="lastPoint"
          class="cyclist-marker"
          :transform="`translate(${lastPoint.x + 12}, ${lastPoint.y - 22}) scale(-1,1)`"
        >
          <text x="0" y="0" font-size="24">🚴</text>
        </g>

        <!-- day labels -->
        <g v-for="label in dayLabels" :key="label.day">
          <text
            :x="label.x"
            :y="height - 10"
            text-anchor="middle"
            class="axis-label"
          >
            {{ label.day }}
          </text>
        </g>
      </svg>

      <div class="journey-stats">
        <div class="journey-stat">
          <span>Distance this month</span>
          <strong>{{ totalDistanceMonth }} km</strong>
        </div>

        <div class="journey-stat">
          <span>Avg elevation</span>
          <strong>{{ avgElevationMonth }} m</strong>
        </div>

        <div class="journey-stat">
          <span>Rides this month</span>
          <strong>{{ totalRidesMonth }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>