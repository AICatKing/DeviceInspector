<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  createEmptyInspectionValidationErrors,
  type InspectionValidationErrors,
} from '../services/inspectionService'
import { useDeviceStore } from '../stores/deviceStore'
import { useInspectionStore } from '../stores/inspectionStore'
import {
  INSPECTION_RESULT_LABELS,
  type InspectionDraft,
  type InspectionRecord,
  type InspectionResult,
} from '../types/inspection'

const props = defineProps<{
  id: string
}>()

const resultOptions: ReadonlyArray<{
  value: InspectionResult
  label: string
}> = [
  { value: 'passed', label: INSPECTION_RESULT_LABELS.passed },
  { value: 'issue_found', label: INSPECTION_RESULT_LABELS.issue_found },
]

const deviceStore = useDeviceStore()
const { currentDevice, detailLoading, detailError } = storeToRefs(deviceStore)
const inspectionStore = useInspectionStore()
const {
  recordCount,
  initialized,
  loading: recordsLoading,
  submitting,
  storageError,
} = storeToRefs(inspectionStore)

const draft = reactive<InspectionDraft>(createDraft(props.id))
const formErrors = reactive<InspectionValidationErrors>(
  createEmptyInspectionValidationErrors(),
)
const savedRecord = ref<InspectionRecord | null>(null)
const submitError = ref<string | null>(null)

watch(
  () => props.id,
  (nextId) => {
    Object.assign(draft, createDraft(nextId))
    Object.assign(formErrors, createEmptyInspectionValidationErrors())
    savedRecord.value = null
    submitError.value = null
    void deviceStore.loadDeviceById(nextId)
  },
  { immediate: true },
)

watch(
  () => [draft.inspectorName, draft.result, draft.notes],
  () => {
    savedRecord.value = null
    submitError.value = null
  },
)

function createDraft(deviceId: string): InspectionDraft {
  return {
    deviceId,
    inspectorName: '',
    result: null,
    notes: '',
    photoPaths: [],
  }
}

async function handleSubmit(): Promise<void> {
  submitError.value = null
  const submissionResult = await inspectionStore.submitInspection(draft)

  if (submissionResult.status === 'validation-error') {
    Object.assign(formErrors, submissionResult.errors)
    savedRecord.value = null
    return
  }

  if (submissionResult.status !== 'success') {
    submitError.value = submissionResult.message
    savedRecord.value = null
    return
  }

  Object.assign(formErrors, createEmptyInspectionValidationErrors())
  savedRecord.value = submissionResult.record
}

function retryLoadRecords(): void {
  submitError.value = null
  void inspectionStore.initialize()
}
</script>

<template>
  <div class="inspection-form-page">
    <header class="page-header">
      <RouterLink
        class="back-link"
        :to="{ name: 'device-detail', params: { id: props.id } }"
      >
        ← 返回设备详情
      </RouterLink>
      <h1>创建巡检</h1>
      <p>填写本次设备巡检信息</p>
      <p class="session-summary">
        <template v-if="!initialized || recordsLoading">正在恢复本地巡检历史...</template>
        <template v-else>本地已保存 {{ recordCount }} 条巡检记录</template>
      </p>
    </header>

    <p v-if="detailLoading" class="feedback">正在加载设备信息...</p>
    <p v-else-if="detailError" class="feedback feedback--error">{{ detailError }}</p>

    <form
      v-else-if="currentDevice && currentDevice.id === props.id"
      class="inspection-form"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <p v-if="formErrors.deviceId" class="form-level-error" role="alert">
        {{ formErrors.deviceId }}
      </p>

      <div
        v-if="storageError?.operation === 'load'"
        class="storage-error"
        role="alert"
      >
        <span>{{ storageError.message }}</span>
        <button type="button" @click="retryLoadRecords">重新读取</button>
      </div>

      <p v-if="submitError" class="submit-error" role="alert">
        {{ submitError }}
      </p>

      <section class="device-summary" aria-labelledby="inspection-device-heading">
        <div>
          <span class="section-kicker">巡检设备</span>
          <h2 id="inspection-device-heading">{{ currentDevice.name }}</h2>
        </div>
        <dl>
          <div>
            <dt>设备 ID</dt>
            <dd>{{ currentDevice.id }}</dd>
          </div>
          <div>
            <dt>安装位置</dt>
            <dd>{{ currentDevice.location }}</dd>
          </div>
        </dl>
      </section>

      <div class="form-field">
        <label for="inspector-name">
          巡检人
          <span class="required-mark" aria-hidden="true">*</span>
        </label>
        <input
          id="inspector-name"
          v-model="draft.inspectorName"
          name="inspectorName"
          type="text"
          autocomplete="name"
          placeholder="请输入巡检人姓名"
          :aria-invalid="formErrors.inspectorName !== null"
          :aria-describedby="formErrors.inspectorName ? 'inspector-name-error' : undefined"
        />
        <p v-if="formErrors.inspectorName" id="inspector-name-error" class="field-error">
          {{ formErrors.inspectorName }}
        </p>
      </div>

      <fieldset
        class="form-field result-fieldset"
        :aria-invalid="formErrors.result !== null"
        :aria-describedby="formErrors.result ? 'inspection-result-error' : undefined"
      >
        <legend>
          巡检结果
          <span class="required-mark" aria-hidden="true">*</span>
        </legend>
        <div class="result-options">
          <label v-for="option in resultOptions" :key="option.value" class="result-option">
            <input
              v-model="draft.result"
              type="radio"
              name="inspectionResult"
              :value="option.value"
            />
            <span>
              <strong>{{ option.label }}</strong>
              <small>
                {{
                  option.value === 'passed'
                    ? '设备状态正常，可以完成本次巡检'
                    : '设备存在异常，需要填写问题说明'
                }}
              </small>
            </span>
          </label>
        </div>
        <p v-if="formErrors.result" id="inspection-result-error" class="field-error">
          {{ formErrors.result }}
        </p>
      </fieldset>

      <div class="form-field">
        <label for="inspection-notes">
          问题与备注
          <span v-if="draft.result === 'issue_found'" class="required-hint">发现问题时必填</span>
        </label>
        <textarea
          id="inspection-notes"
          v-model="draft.notes"
          name="notes"
          rows="5"
          placeholder="记录设备状况、异常现象或处理建议"
          :aria-invalid="formErrors.notes !== null"
          :aria-describedby="formErrors.notes ? 'inspection-notes-error' : 'notes-help'"
        ></textarea>
        <p id="notes-help" class="field-help">正常通过时可以选填；发现问题时必须填写。</p>
        <p v-if="formErrors.notes" id="inspection-notes-error" class="field-error">
          {{ formErrors.notes }}
        </p>
      </div>

      <section class="photo-placeholder" aria-labelledby="photo-heading">
        <div>
          <h2 id="photo-heading">现场照片</h2>
          <p>Camera 与 Filesystem 将在后续任务接入，本页面暂不申请原生权限。</p>
        </div>
        <button type="button" disabled>拍摄照片（暂未接入）</button>
      </section>

      <div class="form-actions">
        <button
          class="primary-action"
          :class="{ 'primary-action--saved': savedRecord !== null }"
          type="submit"
          :disabled="
            savedRecord !== null ||
            submitting ||
            !initialized ||
            recordsLoading ||
            storageError?.operation === 'load'
          "
        >
          {{
            !initialized || recordsLoading
              ? '正在恢复本地数据...'
              : submitting
                ? '正在保存...'
                : savedRecord
                  ? '已保存到本地'
                  : '保存巡检记录'
          }}
        </button>
        <p class="submit-hint">
          记录将先写入 Capacitor Preferences，成功后再同步到 Pinia。
        </p>
      </div>

      <section v-if="savedRecord" class="save-success" role="status">
        <div>
          <strong>巡检记录已创建</strong>
          <p>记录已写入 Preferences 并同步到 Pinia。修改表单后可创建另一条记录。</p>
        </div>
        <dl>
          <div>
            <dt>记录 ID</dt>
            <dd>{{ savedRecord.id }}</dd>
          </div>
          <div>
            <dt>巡检结果</dt>
            <dd>{{ INSPECTION_RESULT_LABELS[savedRecord.result] }}</dd>
          </div>
          <div>
            <dt>巡检时间</dt>
            <dd>
              <time :datetime="savedRecord.inspectedAt">{{ savedRecord.inspectedAt }}</time>
            </dd>
          </div>
        </dl>
        <RouterLink class="history-link" :to="{ name: 'inspection-history' }">
          查看巡检历史 →
        </RouterLink>
      </section>
    </form>
  </div>
</template>

<style scoped>
.inspection-form-page {
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

.page-header .session-summary {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  color: #1d4ed8;
  background: #dbeafe;
  font-size: 0.75rem;
  font-weight: 600;
}

.back-link {
  display: inline-block;
  margin-bottom: 0.75rem;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
}

.feedback {
  padding: 2rem 0;
  color: #64748b;
  text-align: center;
}

.feedback--error {
  color: #dc2626;
}

.form-level-error {
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid #fca5a5;
  border-radius: 0.625rem;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 0.875rem;
}

.storage-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #fca5a5;
  border-radius: 0.625rem;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 0.8rem;
}

.storage-error button {
  flex-shrink: 0;
  padding: 0.35rem 0.6rem;
  border: 1px solid #fca5a5;
  border-radius: 0.4rem;
  color: #b91c1c;
  background: #fff;
  cursor: pointer;
}

.submit-error {
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid #fca5a5;
  border-radius: 0.625rem;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 0.875rem;
}

.inspection-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.device-summary,
.form-field,
.photo-placeholder,
.form-actions {
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
}

.device-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.section-kicker {
  color: #64748b;
  font-size: 0.75rem;
}

.device-summary h2 {
  margin: 0.2rem 0 0;
  font-size: 1.125rem;
}

.device-summary dl {
  min-width: 180px;
  margin: 0;
}

.device-summary dl div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.device-summary dl div + div {
  margin-top: 0.35rem;
}

.device-summary dt,
.device-summary dd {
  margin: 0;
  font-size: 0.75rem;
}

.device-summary dt {
  color: #94a3b8;
}

.device-summary dd {
  color: #475569;
  text-align: right;
}

.form-field {
  margin: 0;
}

.form-field > label,
.form-field legend {
  display: block;
  margin-bottom: 0.5rem;
  color: #1e293b;
  font-size: 0.875rem;
  font-weight: 600;
}

.required-mark {
  color: #dc2626;
}

.required-hint {
  margin-left: 0.35rem;
  color: #b45309;
  font-size: 0.75rem;
  font-weight: 500;
}

input[type='text'],
textarea {
  width: 100%;
  padding: 0.7rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  color: #1e293b;
  background: #fff;
  font: inherit;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

textarea {
  resize: vertical;
}

input[type='text']:focus,
textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  outline: none;
}

input[aria-invalid='true'],
textarea[aria-invalid='true'] {
  border-color: #dc2626;
}

.result-fieldset {
  min-width: 0;
}

.result-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.result-option {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.625rem;
  cursor: pointer;
}

.result-option:has(input:checked) {
  border-color: #2563eb;
  background: #eff6ff;
}

.result-option input {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin: 0.18rem 0 0;
  accent-color: #2563eb;
}

.result-option strong,
.result-option small {
  display: block;
}

.result-option strong {
  color: #1e293b;
  font-size: 0.875rem;
}

.result-option small {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.45;
}

.field-help,
.field-error {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
}

.field-help {
  color: #64748b;
}

.field-error {
  color: #dc2626;
}

.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-style: dashed;
}

.photo-placeholder h2 {
  margin: 0;
  font-size: 0.95rem;
}

.photo-placeholder p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
}

.photo-placeholder button {
  flex-shrink: 0;
  padding: 0.55rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  color: #64748b;
  background: #f8fafc;
  font-size: 0.75rem;
}

.photo-placeholder button:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

.primary-action {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  color: #fff;
  background: #2563eb;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.primary-action:hover {
  background: #1d4ed8;
}

.primary-action:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.primary-action--saved:disabled {
  background: #16a34a;
  cursor: default;
}

.submit-hint {
  margin: 0.55rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
  text-align: center;
}

.save-success {
  margin: 0;
  padding: 1rem;
  border: 1px solid #86efac;
  border-radius: 0.625rem;
  color: #166534;
  background: #f0fdf4;
  font-size: 0.875rem;
}

.save-success strong {
  font-size: 0.95rem;
}

.save-success p {
  margin: 0.25rem 0 0;
  color: #15803d;
  font-size: 0.75rem;
}

.save-success dl {
  margin: 0.85rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid #bbf7d0;
}

.save-success dl div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 0.75rem;
}

.save-success dl div + div {
  margin-top: 0.4rem;
}

.save-success dt,
.save-success dd {
  margin: 0;
  font-size: 0.75rem;
}

.save-success dt {
  color: #16a34a;
}

.save-success dd {
  overflow-wrap: anywhere;
  color: #166534;
}

.history-link {
  display: inline-block;
  margin-top: 0.85rem;
  color: #166534;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 560px) {
  .device-summary,
  .photo-placeholder,
  .storage-error {
    align-items: stretch;
    flex-direction: column;
  }

  .device-summary dl {
    min-width: 0;
  }

  .result-options {
    grid-template-columns: 1fr;
  }

  .photo-placeholder button {
    width: 100%;
  }
}
</style>
