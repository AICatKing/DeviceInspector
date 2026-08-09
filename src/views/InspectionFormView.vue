<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '../stores/deviceStore'
import {
  INSPECTION_RESULT_LABELS,
  type InspectionDraft,
  type InspectionResult,
} from '../types/inspection'

const props = defineProps<{
  id: string
}>()

interface InspectionFormErrors {
  inspectorName: string | null
  result: string | null
  notes: string | null
}

const resultOptions: ReadonlyArray<{
  value: InspectionResult
  label: string
}> = [
  { value: 'passed', label: INSPECTION_RESULT_LABELS.passed },
  { value: 'issue_found', label: INSPECTION_RESULT_LABELS.issue_found },
]

const deviceStore = useDeviceStore()
const { currentDevice, detailLoading, detailError } = storeToRefs(deviceStore)

const draft = reactive<InspectionDraft>(createDraft(props.id))
const formErrors = reactive<InspectionFormErrors>(createEmptyErrors())
const validationFeedback = ref<string | null>(null)

watch(
  () => props.id,
  (nextId) => {
    Object.assign(draft, createDraft(nextId))
    Object.assign(formErrors, createEmptyErrors())
    validationFeedback.value = null
    void deviceStore.loadDeviceById(nextId)
  },
  { immediate: true },
)

watch(
  () => [draft.inspectorName, draft.result, draft.notes],
  () => {
    validationFeedback.value = null
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

function createEmptyErrors(): InspectionFormErrors {
  return {
    inspectorName: null,
    result: null,
    notes: null,
  }
}

function validateDraft(): boolean {
  Object.assign(formErrors, createEmptyErrors())

  if (!draft.inspectorName.trim()) {
    formErrors.inspectorName = '请输入巡检人姓名'
  }

  if (draft.result === null) {
    formErrors.result = '请选择巡检结果'
  }

  if (draft.result === 'issue_found' && !draft.notes.trim()) {
    formErrors.notes = '发现问题时，请填写问题说明'
  }

  return Object.values(formErrors).every((message) => message === null)
}

function handleSubmit(): void {
  if (!validateDraft()) {
    validationFeedback.value = null
    return
  }

  validationFeedback.value = '表单校验通过。当前任务不会保存数据，下一步再创建正式巡检记录。'
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
    </header>

    <p v-if="detailLoading" class="feedback">正在加载设备信息...</p>
    <p v-else-if="detailError" class="feedback feedback--error">{{ detailError }}</p>

    <form
      v-else-if="currentDevice && currentDevice.id === props.id"
      class="inspection-form"
      novalidate
      @submit.prevent="handleSubmit"
    >
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
        <button class="primary-action" type="submit">检查表单</button>
        <p class="submit-hint">本任务只验证输入，不会创建或保存巡检记录。</p>
      </div>

      <p v-if="validationFeedback" class="validation-success" role="status">
        {{ validationFeedback }}
      </p>
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

.submit-hint {
  margin: 0.55rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
  text-align: center;
}

.validation-success {
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid #86efac;
  border-radius: 0.625rem;
  color: #166534;
  background: #f0fdf4;
  font-size: 0.875rem;
}

@media (max-width: 560px) {
  .device-summary,
  .photo-placeholder {
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
