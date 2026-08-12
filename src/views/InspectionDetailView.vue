<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getPersistedInspectionPhotoDisplayUrl } from '../services/inspectionPhotoStorageService'
import { useDeviceStore } from '../stores/deviceStore'
import { useInspectionStore } from '../stores/inspectionStore'
import { INSPECTION_RESULT_LABELS, type InspectionResult } from '../types/inspection'
import { formatDateTime } from '../utils/date'

const props = defineProps<{
  id: string
}>()

const inspectionStore = useInspectionStore()
const { initialized, loading: recordsLoading, storageError } = storeToRefs(inspectionStore)
const deviceStore = useDeviceStore()
const { currentDevice, detailLoading, detailError } = storeToRefs(deviceStore)

const record = computed(() => inspectionStore.getRecordById(props.id))
const selectedPhoto = ref<InspectionPhotoItem | null>(null)
const failedPhotoIds = ref<string[]>([])
const previewCloseButton = ref<HTMLButtonElement | null>(null)
const previewTrigger = ref<HTMLButtonElement | null>(null)

interface InspectionPhotoItem {
  id: string
  index: number
  displayUrl: string
  alt: string
}

const photoItems = computed<InspectionPhotoItem[]>(() => {
  const photoPaths = record.value?.photoPaths ?? []

  return photoPaths.flatMap((photoPath, index) => {
    const displayUrl = getPersistedInspectionPhotoDisplayUrl(photoPath)

    if (displayUrl === null) {
      return []
    }

    return [{
      id: `inspection-photo-${index}`,
      index,
      displayUrl,
      alt: `巡检现场照片 ${index + 1}`,
    }]
  })
})

watch(
  record,
  (nextRecord) => {
    if (nextRecord !== null) {
      void deviceStore.loadDeviceById(nextRecord.deviceId)
    }
  },
  { immediate: true },
)

function resultClass(result: InspectionResult): string {
  return `result-badge result-badge--${result}`
}

function retryLoadHistory(): void {
  void inspectionStore.initialize()
}

function retryLoadDevice(): void {
  if (record.value !== null) {
    void deviceStore.loadDeviceById(record.value.deviceId)
  }
}

function isPhotoUnavailable(photo: InspectionPhotoItem): boolean {
  return failedPhotoIds.value.includes(photo.id)
}

function openPhotoPreview(photo: InspectionPhotoItem, event: MouseEvent): void {
  if (event.currentTarget instanceof HTMLButtonElement) {
    previewTrigger.value = event.currentTarget
  }

  selectedPhoto.value = photo

  void nextTick(() => previewCloseButton.value?.focus())
}

function closePhotoPreview(): void {
  selectedPhoto.value = null

  void nextTick(() => previewTrigger.value?.focus())
}

function markPhotoUnavailable(photo: InspectionPhotoItem): void {
  if (!isPhotoUnavailable(photo)) {
    failedPhotoIds.value = [...failedPhotoIds.value, photo.id]
  }

  if (selectedPhoto.value?.id === photo.id) {
    closePhotoPreview()
  }
}

function handlePreviewKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && selectedPhoto.value !== null) {
    closePhotoPreview()
  }
}

watch(
  () => props.id,
  () => {
    selectedPhoto.value = null
    failedPhotoIds.value = []
  },
)

window.addEventListener('keydown', handlePreviewKeydown)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePreviewKeydown)
})
</script>

<template>
  <div class="inspection-detail-page">
    <header class="page-header">
      <RouterLink class="back-link" :to="{ name: 'inspection-history' }">
        ← 返回巡检历史
      </RouterLink>
      <h1>巡检详情</h1>
      <p>查看已保存的本地巡检记录</p>
    </header>

    <p v-if="!initialized || recordsLoading" class="feedback">正在读取巡检记录...</p>

    <section
      v-else-if="storageError?.operation === 'load'"
      class="state-card state-card--error"
      role="alert"
    >
      <h2>无法读取本地巡检历史</h2>
      <p>{{ storageError.message }}</p>
      <button type="button" @click="retryLoadHistory">重新读取</button>
    </section>

    <section v-else-if="record === null" class="state-card">
      <h2>未找到这条巡检记录</h2>
      <p>记录可能已不存在，或当前链接中的记录 ID 无效。</p>
      <RouterLink class="primary-link" :to="{ name: 'inspection-history' }">
        返回巡检历史
      </RouterLink>
    </section>

    <template v-else>
      <section class="detail-card">
        <div class="detail-card__header">
          <div>
            <p class="eyebrow">巡检结果</p>
            <h2>{{ INSPECTION_RESULT_LABELS[record.result] }}</h2>
          </div>
          <span :class="resultClass(record.result)">
            {{ INSPECTION_RESULT_LABELS[record.result] }}
          </span>
        </div>

        <dl class="detail-list">
          <div class="detail-item">
            <dt>巡检时间</dt>
            <dd><time :datetime="record.inspectedAt">{{ formatDateTime(record.inspectedAt) }}</time></dd>
          </div>
          <div class="detail-item">
            <dt>巡检人</dt>
            <dd>{{ record.inspectorName }}</dd>
          </div>
          <div class="detail-item">
            <dt>现场照片</dt>
            <dd>{{ record.photoPaths.length }} 张</dd>
          </div>
          <div class="detail-item detail-item--stacked">
            <dt>巡检备注</dt>
            <dd>{{ record.notes || '未填写备注' }}</dd>
          </div>
        </dl>

        <div class="photo-boundary" aria-labelledby="photo-boundary-heading">
          <h3 id="photo-boundary-heading">现场照片</h3>
          <p v-if="record.photoPaths.length === 0">本次巡检未附加现场照片。</p>
          <template v-else>
            <p>点击缩略图可查看大图。</p>
            <div class="photo-grid" aria-label="巡检现场照片列表">
              <template v-for="photo in photoItems" :key="photo.id">
                <div v-if="isPhotoUnavailable(photo)" class="photo-unavailable" role="status">
                  <span aria-hidden="true">图片不可用</span>
                  <small>照片文件无法读取</small>
                </div>
                <button
                  v-else
                  type="button"
                  class="photo-thumbnail-button"
                  :aria-label="`查看${photo.alt}大图`"
                  @click="openPhotoPreview(photo, $event)"
                >
                  <img
                    class="photo-thumbnail"
                    :src="photo.displayUrl"
                    :alt="photo.alt"
                    @error="markPhotoUnavailable(photo)"
                  />
                </button>
              </template>
            </div>
            <p v-if="photoItems.length === 0" class="photo-unavailable-message">
              已记录照片数量，但照片地址无效，当前无法预览。
            </p>
          </template>
        </div>

        <p class="record-id">记录 ID：{{ record.id }}</p>
      </section>

      <section class="device-card" aria-labelledby="inspection-device-heading">
        <div>
          <p class="eyebrow">关联设备</p>
          <h2 id="inspection-device-heading">
            {{ detailLoading ? '正在匹配设备...' : currentDevice?.name ?? '设备信息暂不可用' }}
          </h2>
          <p class="device-location">
            {{ currentDevice?.location ?? `设备 ID：${record.deviceId}` }}
          </p>
        </div>

        <RouterLink
          v-if="currentDevice"
          class="secondary-link"
          :to="{ name: 'device-detail', params: { id: currentDevice.id } }"
        >
          查看设备
        </RouterLink>
      </section>

      <div v-if="detailError" class="device-error" role="alert">
        <span>设备信息加载失败，巡检记录仍可正常查看。</span>
        <button type="button" @click="retryLoadDevice">重试</button>
      </div>
    </template>

    <div
      v-if="selectedPhoto !== null"
      class="photo-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-preview-title"
      @click.self="closePhotoPreview"
    >
      <section class="photo-preview-dialog">
        <header class="photo-preview-dialog__header">
          <h2 id="photo-preview-title">现场照片 {{ selectedPhoto.index + 1 }}</h2>
          <button ref="previewCloseButton" type="button" @click="closePhotoPreview">关闭</button>
        </header>
        <img
          class="photo-preview-image"
          :src="selectedPhoto.displayUrl"
          :alt="selectedPhoto.alt"
          @error="markPhotoUnavailable(selectedPhoto)"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.inspection-detail-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h1,
.page-header p {
  margin: 0;
}

.page-header h1 {
  font-size: 1.5rem;
}

.page-header p {
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.875rem;
}

.back-link,
.secondary-link {
  color: #2563eb;
  text-decoration: none;
}

.back-link {
  display: inline-block;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.feedback {
  padding: 2rem 0;
  color: #64748b;
  text-align: center;
}

.state-card,
.detail-card,
.device-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}

.state-card {
  padding: 1.5rem;
  text-align: center;
}

.state-card h2,
.state-card p {
  margin: 0;
}

.state-card h2 {
  font-size: 1.05rem;
}

.state-card p {
  margin-top: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
}

.state-card--error {
  border-color: #fecaca;
  color: #991b1b;
  background: #fef2f2;
}

.state-card--error p {
  color: inherit;
}

.state-card button,
.device-error button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #fca5a5;
  border-radius: 0.45rem;
  color: #991b1b;
  background: #fff;
  cursor: pointer;
}

.state-card button {
  margin-top: 1rem;
}

.primary-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  color: #fff;
  background: #2563eb;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.detail-card {
  padding: 1.25rem;
}

.detail-card__header,
.device-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.detail-card__header h2,
.device-card h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1.125rem;
}

.eyebrow {
  margin: 0 0 0.3rem;
  color: #64748b;
  font-size: 0.75rem;
}

.result-badge {
  flex-shrink: 0;
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

.detail-list {
  margin: 1.25rem 0 0;
  border-top: 1px solid #f1f5f9;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-item--stacked {
  display: block;
}

.detail-item dt,
.detail-item dd {
  margin: 0;
  font-size: 0.875rem;
}

.detail-item dt {
  flex-shrink: 0;
  color: #64748b;
}

.detail-item dd {
  color: #1e293b;
  text-align: right;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.detail-item--stacked dd {
  margin-top: 0.45rem;
  color: #475569;
  text-align: left;
}

.photo-boundary {
  margin-top: 1rem;
  padding: 0.9rem;
  border-radius: 0.625rem;
  background: #f8fafc;
}

.photo-boundary h3,
.photo-boundary p {
  margin: 0;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.photo-thumbnail-button,
.photo-unavailable {
  min-height: 112px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
}

.photo-thumbnail-button {
  padding: 0;
  cursor: pointer;
}

.photo-thumbnail-button:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
}

.photo-thumbnail {
  display: block;
  width: 100%;
  height: 112px;
  object-fit: cover;
}

.photo-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border-style: dashed;
  color: #64748b;
  background: #f1f5f9;
  text-align: center;
  font-size: 0.75rem;
}

.photo-unavailable small {
  color: #94a3b8;
  font-size: 0.68rem;
}

.photo-unavailable-message {
  color: #b45309 !important;
}

.photo-preview-overlay {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 82%);
}

.photo-preview-dialog {
  display: flex;
  width: min(100%, 760px);
  max-height: calc(100vh - 2rem);
  flex-direction: column;
  overflow: hidden;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 20px 45px rgb(15 23 42 / 35%);
}

.photo-preview-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.photo-preview-dialog__header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1rem;
}

.photo-preview-dialog__header button {
  padding: 0.45rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.4rem;
  color: #334155;
  background: #fff;
  cursor: pointer;
}

.photo-preview-dialog__header button:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 2px;
}

.photo-preview-image {
  display: block;
  width: 100%;
  min-height: 0;
  max-height: calc(100vh - 6rem);
  object-fit: contain;
  background: #0f172a;
}

.photo-boundary h3 {
  color: #334155;
  font-size: 0.9rem;
}

.photo-boundary p {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.55;
}

.record-id {
  margin: 1rem 0 0;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  overflow-wrap: anywhere;
}

.device-card {
  margin-top: 1rem;
  padding: 1.1rem 1.25rem;
}

.device-location {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.secondary-link {
  flex-shrink: 0;
  padding-top: 0.2rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.device-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #fecaca;
  border-radius: 0.625rem;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 0.8rem;
}

@media (max-width: 520px) {
  .detail-card__header,
  .device-card,
  .device-error {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .detail-item dd {
    text-align: left;
  }
}
</style>
