<template>
  <div class="layout">
    <nav class="sidebar">
      <div class="sidebar-logo">Jonhy <span>Miles</span></div>

      <RouterLink to="/" class="nav-link">🏠 Home</RouterLink>
      <RouterLink to="/app/dashboard" class="nav-link">⚡ Dashboard</RouterLink>
      <RouterLink to="/app/rides" class="nav-link">🚴 Rides</RouterLink>
      <RouterLink to="/app/stats" class="nav-link">📊 Stats</RouterLink>
      <RouterLink to="/app/goals" class="nav-link">🎯 Goals</RouterLink>
      <RouterLink to="/app/routes" class="nav-link">🗺️ Routes</RouterLink>
    </nav>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>