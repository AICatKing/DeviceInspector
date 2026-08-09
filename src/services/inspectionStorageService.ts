import { Preferences } from '@capacitor/preferences'
import type { InspectionRecord, InspectionResult } from '../types/inspection'

const INSPECTION_STORAGE_KEY = 'device-inspector.inspection-records'
const INSPECTION_STORAGE_VERSION = 1

interface InspectionStoragePayloadV1 {
  version: typeof INSPECTION_STORAGE_VERSION
  records: readonly InspectionRecord[]
}

export class InspectionStorageError extends Error {
  readonly cause: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'InspectionStorageError'
    this.cause = cause
  }
}

export async function loadInspectionRecords(): Promise<InspectionRecord[]> {
  let storedValue: string | null

  try {
    const result = await Preferences.get({ key: INSPECTION_STORAGE_KEY })
    storedValue = result.value
  } catch (error: unknown) {
    throw new InspectionStorageError('读取本地巡检历史失败', error)
  }

  if (storedValue === null) {
    return []
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(storedValue)
  } catch (error: unknown) {
    throw new InspectionStorageError('本地巡检历史不是有效的 JSON', error)
  }

  if (!isRecordObject(parsedValue)) {
    throw new InspectionStorageError('本地巡检历史的数据结构无效')
  }

  if (parsedValue.version !== INSPECTION_STORAGE_VERSION) {
    throw new InspectionStorageError('本地巡检历史版本不受支持')
  }

  if (
    !Array.isArray(parsedValue.records) ||
    !parsedValue.records.every(isInspectionRecord)
  ) {
    throw new InspectionStorageError('本地巡检记录字段不完整或类型错误')
  }

  return parsedValue.records
    .map((record) => ({
      ...record,
      photoPaths: [...record.photoPaths],
    }))
    .sort(
      (leftRecord, rightRecord) =>
        Date.parse(rightRecord.inspectedAt) - Date.parse(leftRecord.inspectedAt),
    )
}

export async function saveInspectionRecords(
  records: readonly InspectionRecord[],
): Promise<void> {
  const payload: InspectionStoragePayloadV1 = {
    version: INSPECTION_STORAGE_VERSION,
    records,
  }

  try {
    await Preferences.set({
      key: INSPECTION_STORAGE_KEY,
      value: JSON.stringify(payload),
    })
  } catch (error: unknown) {
    throw new InspectionStorageError('保存本地巡检历史失败', error)
  }
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isInspectionResult(value: unknown): value is InspectionResult {
  return value === 'passed' || value === 'issue_found'
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isInspectionRecord(value: unknown): value is InspectionRecord {
  if (!isRecordObject(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.deviceId === 'string' &&
    value.deviceId.length > 0 &&
    typeof value.inspectorName === 'string' &&
    value.inspectorName.length > 0 &&
    isInspectionResult(value.result) &&
    typeof value.notes === 'string' &&
    Array.isArray(value.photoPaths) &&
    value.photoPaths.every((photoPath) => typeof photoPath === 'string') &&
    isValidDateString(value.inspectedAt)
  )
}
