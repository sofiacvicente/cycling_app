import { createRouter, createWebHistory } from 'vue-router'

import HomePage from './pages/HomePage.vue'
import PlatformLayout from './pages/PlatformLayout.vue'

import Dashboard from './components/dashboard.vue'
import Rides from './components/rides.vue'
import Stats from './components/stats.vue'
import Goals from './components/goals.vue'
import Routes from './components/routes.vue'
import Garage from './components/garage.vue'
import Planner from './components/planner.vue'

const routes = [
  {
    path: '/',
    component: HomePage
  },
  {
    path: '/app',
    component: PlatformLayout,
    children: [
      { path: '', redirect: '/app/dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'rides', component: Rides },
      { path: 'stats', component: Stats },
      { path: 'goals', component: Goals },
      { path: 'routes', component: Routes },
      { path: 'garage', component: Garage },
      { path: 'planner', component: Planner }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router