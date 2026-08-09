import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createInspectionRecord,
  type InspectionValidationErrors,
} from '../services/inspectionService'
import {
  loadInspectionRecords,
  saveInspectionRecords,
} from '../services/inspectionStorageService'
import type { InspectionDraft, InspectionRecord } from '../types/inspection'

export interface InspectionStoreError {
  operation: 'load' | 'save'
  message: string
}

export type InspectionSubmissionResult =
  | {
      status: 'success'
      record: InspectionRecord
    }
  | {
      status: 'validation-error'
      errors: InspectionValidationErrors
    }
  | {
      status: 'storage-error' | 'busy'
      message: string
    }

export const useInspectionStore = defineStore('inspection', () => {
  const records = ref<InspectionRecord[]>([])
  const initialized = ref(false)
  const loading = ref(false)
  const submitting = ref(false)
  const storageError = ref<InspectionStoreError | null>(null)

  const recordCount = computed(() => records.value.length)

  async function initialize(): Promise<void> {
    if (loading.value) {
      return
    }

    if (initialized.value && storageError.value?.operation !== 'load') {
      return
    }

    loading.value = true
    storageError.value = null

    try {
      records.value = await loadInspectionRecords()
    } catch (error: unknown) {
      records.value = []
      storageError.value = {
        operation: 'load',
        message: getErrorMessage(error, '恢复本地巡检历史失败'),
      }
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function submitInspection(
    draft: InspectionDraft,
  ): Promise<InspectionSubmissionResult> {
    if (!initialized.value || loading.value) {
      return {
        status: 'busy',
        message: '本地巡检历史仍在初始化，请稍后重试',
      }
    }

    if (storageError.value?.operation === 'load') {
      return {
        status: 'storage-error',
        message: '本地巡检历史尚未成功恢复，请先重试读取',
      }
    }

    if (submitting.value) {
      return {
        status: 'busy',
        message: '巡检记录正在保存，请勿重复提交',
      }
    }

    const creationResult = createInspectionRecord(draft)

    if (!creationResult.success) {
      return {
        status: 'validation-error',
        errors: creationResult.errors,
      }
    }

    const nextRecords = [creationResult.record, ...records.value]
    submitting.value = true
    storageError.value = null

    try {
      await saveInspectionRecords(nextRecords)
      records.value = nextRecords

      return {
        status: 'success',
        record: creationResult.record,
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, '保存巡检记录失败')
      storageError.value = {
        operation: 'save',
        message,
      }

      return {
        status: 'storage-error',
        message,
      }
    } finally {
      submitting.value = false
    }
  }

  return {
    records,
    initialized,
    loading,
    submitting,
    storageError,
    recordCount,
    initialize,
    submitInspection,
  }
})

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}
