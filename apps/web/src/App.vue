<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog'
import AppNotificationCenter from './components/shared/AppNotificationCenter.vue'
</script>

<template>
  <RouterView />
  <ConfirmDialog />
  <AppNotificationCenter />
</template>
