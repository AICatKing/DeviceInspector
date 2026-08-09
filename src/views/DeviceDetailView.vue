<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '../stores/deviceStore'
import { DEVICE_STATUS_LABELS, type DeviceStatus } from '../types/device'

const props = defineProps<{
  id: string
}>()

const deviceStore = useDeviceStore()
const { currentDevice, detailLoading, detailError } = storeToRefs(deviceStore)

onMounted(() => {
  void deviceStore.loadDeviceById(props.id)
})

watch(
  () => props.id,
  (nextId) => {
    void deviceStore.loadDeviceById(nextId)
  },
)

function formatDate(isoString: string | null): string {
  if (!isoString) {
    return '暂无记录'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

function statusClass(status: DeviceStatus): string {
  return `status-badge status-badge--${status}`
}
</script>

<template>
  <div class="device-detail-page">
    <header class="page-header">
      <RouterLink class="back-link" to="/devices">← 返回设备列表</RouterLink>
      <h1>设备详情</h1>
    </header>

    <p v-if="detailLoading" class="feedback">加载中...</p>
    <p v-else-if="detailError" class="feedback feedback--error">{{ detailError }}</p>

    <section v-else-if="currentDevice" class="detail-card">
      <div class="detail-card__header">
        <h2>{{ currentDevice.name }}</h2>
        <span :class="statusClass(currentDevice.status)">
          {{ DEVICE_STATUS_LABELS[currentDevice.status] }}
        </span>
      </div>

      <dl class="detail-list">
        <div class="detail-item">
          <dt>设备 ID</dt>
          <dd>{{ currentDevice.id }}</dd>
        </div>
        <div class="detail-item">
          <dt>安装位置</dt>
          <dd>{{ currentDevice.location }}</dd>
        </div>
        <div class="detail-item">
          <dt>上次巡检</dt>
          <dd>{{ formatDate(currentDevice.lastInspectionAt) }}</dd>
        </div>
      </dl>

      <button class="primary-action" type="button" disabled>
        开始巡检（Day 2 实现）
      </button>
    </section>
  </div>
</template>

<style scoped>
.device-detail-page {
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
  margin: 0;
  font-size: 1.5rem;
}

.feedback {
  text-align: center;
  color: #64748b;
  padding: 2rem 0;
}

.feedback--error {
  color: #dc2626;
}

.detail-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
}

.detail-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.detail-card__header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.status-badge {
  flex-shrink: 0;
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

.detail-list {
  margin: 0 0 1.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

dt {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

dd {
  margin: 0;
  text-align: right;
  font-size: 0.875rem;
  color: #1e293b;
}

.primary-action {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
}

.primary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
