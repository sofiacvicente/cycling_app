<script setup>
const photoModules = import.meta.glob('../assets/photos/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
})

const photos = Object.values(photoModules)
</script>

<template>
  <div class="photo-home">
    <div class="photo-grid">
      <img v-for="(photo, index) in photos" :key="index" :src="photo" alt="cycling photo" />
    </div>

    <div class="photo-overlay"></div>

    <div class="home-card">
      <h1> Jonhy Miles</h1>
      

      <RouterLink to="/app/dashboard" class="enter-btn">
        Start
      </RouterLink>
    </div>
  </div>
</template>