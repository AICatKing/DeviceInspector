<script setup lang="ts">
const appName = 'Device Inspector'
const appSubtitle = '设备巡检助手'
</script>

<template>
  <main class="home">
    <h1>{{ appName }}</h1>
    <p class="subtitle">{{ appSubtitle }}</p>
    <p class="status">核心 Web 巡检流程已就绪</p>
    <div class="entry-actions">
      <RouterLink class="entry-link" to="/devices">进入设备列表 →</RouterLink>
      <RouterLink class="entry-link entry-link--secondary" to="/inspections">
        查看巡检历史
      </RouterLink>
    </div>
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
  margin-bottom: 1.5rem;
}

.entry-link {
  display: inline-block;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.entry-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.entry-link--secondary {
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
}
</style>
