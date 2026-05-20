<script setup lang="ts">
import Button from 'primevue/button'
</script>

<template>
  <div class="page">
    <h1>Musica</h1>
    <p>Vue 3 + Vite + Pinia + Vue Router + PrimeVue + VueUse + Axios</p>
    <RouterLink to="/examples">
      <Button label="Mở Examples" />
    </RouterLink>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  display: grid;
  gap: 12px;
}
</style>
