import type { InspectionDraft, InspectionRecord, InspectionResult } from '../types/inspection'

export interface InspectionValidationErrors {
  deviceId: string | null
  inspectorName: string | null
  result: string | null
  notes: string | null
}

export type InspectionRecordCreationResult =
  | {
      success: true
      record: InspectionRecord
    }
  | {
      success: false
      errors: InspectionValidationErrors
    }

interface ValidatedInspectionDraft {
  deviceId: string
  inspectorName: string
  result: InspectionResult
  notes: string
  photoPaths: string[]
}

type InspectionDraftValidationResult =
  | {
      valid: true
      value: ValidatedInspectionDraft
    }
  | {
      valid: false
      errors: InspectionValidationErrors
    }

export function createEmptyInspectionValidationErrors(): InspectionValidationErrors {
  return {
    deviceId: null,
    inspectorName: null,
    result: null,
    notes: null,
  }
}

export function createInspectionRecord(
  draft: InspectionDraft,
): InspectionRecordCreationResult {
  const validationResult = validateInspectionDraft(draft)

  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors,
    }
  }

  return {
    success: true,
    record: {
      id: `inspection-${crypto.randomUUID()}`,
      ...validationResult.value,
      inspectedAt: new Date().toISOString(),
    },
  }
}

function validateInspectionDraft(draft: InspectionDraft): InspectionDraftValidationResult {
  const errors = createEmptyInspectionValidationErrors()
  const deviceId = draft.deviceId.trim()
  const inspectorName = draft.inspectorName.trim()
  const notes = draft.notes.trim()

  if (!deviceId) {
    errors.deviceId = '缺少巡检设备，无法创建巡检记录'
  }

  if (!inspectorName) {
    errors.inspectorName = '请输入巡检人姓名'
  }

  if (draft.result === null) {
    errors.result = '请选择巡检结果'
  }

  if (draft.result === 'issue_found' && !notes) {
    errors.notes = '发现问题时，请填写问题说明'
  }

  if (
    errors.deviceId !== null ||
    errors.inspectorName !== null ||
    errors.result !== null ||
    errors.notes !== null ||
    draft.result === null
  ) {
    return {
      valid: false,
      errors,
    }
  }

  return {
    valid: true,
    value: {
      deviceId,
      inspectorName,
      result: draft.result,
      notes,
      photoPaths: [...draft.photoPaths],
    },
  }
}
