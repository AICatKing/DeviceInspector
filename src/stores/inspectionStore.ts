import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createInspectionRecord,
  type InspectionRecordCreationResult,
} from '../services/inspectionService'
import type { InspectionDraft, InspectionRecord } from '../types/inspection'

export const useInspectionStore = defineStore('inspection', () => {
  const records = ref<InspectionRecord[]>([])

  const recordCount = computed(() => records.value.length)

  function submitInspection(draft: InspectionDraft): InspectionRecordCreationResult {
    const creationResult = createInspectionRecord(draft)

    if (creationResult.success) {
      records.value.unshift(creationResult.record)
    }

    return creationResult
  }

  return {
    records,
    recordCount,
    submitInspection,
  }
})
