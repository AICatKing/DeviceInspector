<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '../stores/deviceStore'
import { useInspectionStore } from '../stores/inspectionStore'
import {
  INSPECTION_RESULT_LABELS,
  type InspectionResult,
} from '../types/inspection'
import { formatDateTime } from '../utils/date'

const deviceStore = useDeviceStore()
const { devices, loading: devicesLoading, error: devicesError } = storeToRefs(deviceStore)
const inspectionStore = useInspectionStore()
const {
  records,
  recordCount,
  initialized,
  loading: recordsLoading,
  storageError,
} = storeToRefs(inspectionStore)

const deviceById = computed(
  () => new Map(devices.value.map((device) => [device.id, device])),
)

const historyItems = computed(() =>
  records.value.map((record) => ({
    record,
    device: deviceById.value.get(record.deviceId) ?? null,
  })),
)

watch(
  [initialized, () => records.value.length],
  ([isInitialized, recordsLength]) => {
    if (isInitialized && recordsLength > 0 && devices.value.length === 0) {
      void deviceStore.loadDevices()
    }
  },
  { immediate: true },
)

function resultClass(result: InspectionResult): string {
  return `result-badge result-badge--${result}`
}

function retryLoadDevices(): void {
  void deviceStore.loadDevices()
}

function retryLoadHistory(): void {
  void inspectionStore.initialize()
}
</script>

<template>
  <div class="inspection-history-page">
    <header class="page-header">
      <RouterLink class="back-link" to="/">← 返回首页</RouterLink>
      <h1>巡检历史</h1>
      <p>本地共 {{ recordCount }} 条巡检记录</p>
    </header>

    <p v-if="!initialized || recordsLoading" class="records-feedback">
      正在读取本地巡检历史...
    </p>

    <section
      v-else-if="storageError?.operation === 'load'"
      class="storage-state-error"
      role="alert"
    >
      <h2>无法读取本地巡检历史</h2>
      <p>{{ storageError.message }}</p>
      <button type="button" @click="retryLoadHistory">重新读取</button>
    </section>

    <section v-else-if="recordCount === 0" class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">✓</div>
      <h2>暂无巡检记录</h2>
      <p>从设备详情开始一次巡检，提交后的记录会显示在这里。</p>
      <RouterLink class="primary-link" :to="{ name: 'device-list' }">
        前往设备列表
      </RouterLink>
    </section>

    <template v-else>
      <div
        v-if="storageError?.operation === 'save'"
        class="storage-save-warning"
        role="alert"
      >
        {{ storageError.message }}。当前列表只包含此前成功保存的数据。
      </div>

      <p v-if="devicesLoading" class="association-feedback">正在匹配设备信息...</p>
      <div v-else-if="devicesError" class="association-error" role="alert">
        <span>设备信息加载失败，历史记录仍会使用设备 ID 展示。</span>
        <button type="button" @click="retryLoadDevices">重试</button>
      </div>

      <ul class="history-list">
        <li v-for="item in historyItems" :key="item.record.id" class="history-card">
          <div class="history-card__header">
            <span :class="resultClass(item.record.result)">
              {{ INSPECTION_RESULT_LABELS[item.record.result] }}
            </span>
            <time :datetime="item.record.inspectedAt">
              {{ formatDateTime(item.record.inspectedAt) }}
            </time>
          </div>

          <div class="device-info">
            <RouterLink
              v-if="item.device"
              class="device-name"
              :to="{ name: 'device-detail', params: { id: item.device.id } }"
            >
              {{ item.device.name }}
            </RouterLink>
            <span v-else class="device-name">未知设备</span>
            <p>{{ item.device?.location ?? '设备信息暂不可用' }}</p>
            <span class="device-id">{{ item.record.deviceId }}</span>
          </div>

          <dl class="record-details">
            <div>
              <dt>巡检人</dt>
              <dd>{{ item.record.inspectorName }}</dd>
            </div>
            <div>
              <dt>现场照片</dt>
              <dd>{{ item.record.photoPaths.length }} 张</dd>
            </div>
          </dl>

          <p v-if="item.record.notes" class="record-notes">
            {{ item.record.notes }}
          </p>

          <p class="record-id">记录 ID：{{ item.record.id }}</p>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.inspection-history-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.page-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 0.75rem;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
}

.records-feedback {
  padding: 2rem 0;
  color: #64748b;
  text-align: center;
}

.storage-state-error {
  padding: 1.5rem;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  color: #991b1b;
  background: #fef2f2;
  text-align: center;
}

.storage-state-error h2 {
  margin: 0;
  font-size: 1.05rem;
}

.storage-state-error p {
  margin: 0.5rem 0 1rem;
  font-size: 0.85rem;
}

.storage-state-error button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #fca5a5;
  border-radius: 0.45rem;
  color: #991b1b;
  background: #fff;
  cursor: pointer;
}

.storage-save-warning {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #fed7aa;
  border-radius: 0.625rem;
  color: #9a3412;
  background: #fff7ed;
  font-size: 0.8rem;
}

.empty-state {
  padding: 2.5rem 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  text-align: center;
}

.empty-state__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  color: #2563eb;
  background: #dbeafe;
  font-size: 1.25rem;
  font-weight: 700;
}

.empty-state h2 {
  margin: 0;
  font-size: 1.125rem;
}

.empty-state p {
  max-width: 360px;
  margin: 0.5rem auto 1.25rem;
  color: #64748b;
  font-size: 0.875rem;
}

.primary-link {
  display: inline-block;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  color: #fff;
  background: #2563eb;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.association-feedback {
  margin: 0 0 0.75rem;
  color: #64748b;
  font-size: 0.8rem;
}

.association-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #fecaca;
  border-radius: 0.625rem;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 0.8rem;
}

.association-error button {
  flex-shrink: 0;
  padding: 0.35rem 0.6rem;
  border: 1px solid #fca5a5;
  border-radius: 0.4rem;
  color: #b91c1c;
  background: #fff;
  cursor: pointer;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-card {
  padding: 1.1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}

.history-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.history-card__header time {
  color: #64748b;
  font-size: 0.75rem;
}

.result-badge {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.result-badge--passed {
  color: #15803d;
  background: #dcfce7;
}

.result-badge--issue_found {
  color: #b45309;
  background: #fef3c7;
}

.device-info {
  position: relative;
  margin-top: 0.9rem;
  padding-right: 5.5rem;
}

.device-name {
  color: #1e293b;
  font-size: 1rem;
  font-weight: 650;
  text-decoration: none;
}

a.device-name:hover {
  color: #2563eb;
}

.device-info p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.device-id {
  position: absolute;
  top: 0.1rem;
  right: 0;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
}

.record-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1rem 0 0;
  padding-top: 0.8rem;
  border-top: 1px solid #f1f5f9;
}

.record-details div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.record-details dt,
.record-details dd {
  margin: 0;
  font-size: 0.78rem;
}

.record-details dt {
  color: #94a3b8;
}

.record-details dd {
  color: #334155;
  text-align: right;
}

.record-notes {
  margin: 0.85rem 0 0;
  padding: 0.7rem;
  border-radius: 0.5rem;
  color: #475569;
  background: #f8fafc;
  font-size: 0.8rem;
  white-space: pre-wrap;
}

.record-id {
  margin: 0.75rem 0 0;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  overflow-wrap: anywhere;
}

@media (max-width: 520px) {
  .history-card__header,
  .association-error {
    align-items: flex-start;
    flex-direction: column;
  }

  .device-info {
    padding-right: 0;
  }

  .device-id {
    position: static;
    display: block;
    margin-top: 0.35rem;
  }

  .record-details {
    grid-template-columns: 1fr;
  }
}
</style>
