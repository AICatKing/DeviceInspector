<script setup lang="ts">
const appName = 'Device Inspector'
const appSubtitle = '设备巡检助手'
</script>

<template>
  <main class="home">
    <h1>{{ appName }}</h1>
    <p class="subtitle">{{ appSubtitle }}</p>
    <p class="status">项目骨架已就绪，Day 1 Task 1 完成。</p>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.subtitle {
  color: #64748b;
  margin: 0 0 1.5rem;
}

.status {
  font-size: 0.875rem;
  color: #16a34a;
}
</style>
