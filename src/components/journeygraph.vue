<script setup>
import { computed, ref, watch } from 'vue'

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

const currentMonthIndex = ref(0)

watch(
  availableMonths,
  months => {
    if (months.length) {
      currentMonthIndex.value = months.length - 1
    } else {
      currentMonthIndex.value = 0
    }
  },
  { immediate: true }
)

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