<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '../stores/deviceStore'
import { DEVICE_STATUS_LABELS, type DeviceStatus } from '../types/device'
import { formatDateTime } from '../utils/date'

const deviceStore = useDeviceStore()
const { devices, loading, error } = storeToRefs(deviceStore)

onMounted(() => {
  void deviceStore.loadDevices()
})

function statusClass(status: DeviceStatus): string {
  return `status-badge status-badge--${status}`
}
</script>

<template>
  <div class="device-list-page">
    <header class="page-header">
      <RouterLink class="back-link" to="/">← 返回首页</RouterLink>
      <h1>设备列表</h1>
      <p class="summary">共 {{ devices.length }} 台设备</p>
    </header>

    <p v-if="loading" class="feedback">加载中...</p>
    <p v-else-if="error" class="feedback feedback--error">{{ error }}</p>

    <ul v-else class="device-list">
      <li v-for="device in devices" :key="device.id">
        <RouterLink class="device-card" :to="{ name: 'device-detail', params: { id: device.id } }">
          <div class="device-card__main">
            <h2>{{ device.name }}</h2>
            <p class="location">{{ device.location }}</p>
          </div>
          <div class="device-card__meta">
            <span :class="statusClass(device.status)">
              {{ DEVICE_STATUS_LABELS[device.status] }}
            </span>
            <span class="last-inspection">
              上次巡检：{{ formatDateTime(device.lastInspectionAt) }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.device-list-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 0.75rem;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
}

.summary {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.feedback {
  text-align: center;
  color: #64748b;
  padding: 2rem 0;
}

.feedback--error {
  color: #dc2626;
}

.device-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-card {
  display: block;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.device-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
}

.device-card__main h2 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.location {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.device-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.status-badge {
  align-self: flex-start;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge--normal {
  color: #15803d;
  background: #dcfce7;
}

.status-badge--warning {
  color: #b45309;
  background: #fef3c7;
}

.status-badge--offline {
  color: #b91c1c;
  background: #fee2e2;
}

.last-inspection {
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
