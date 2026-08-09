export type InspectionResult = 'passed' | 'issue_found'

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  passed: '正常通过',
  issue_found: '发现问题',
}

/**
 * 用户正在填写、尚未提交的巡检数据。
 *
 * result 使用 null 明确表示“尚未选择”，其余文本和数组字段使用空值作为表单初始状态。
 * id 和 inspectedAt 由提交边界生成，因此不属于草稿。
 */
export interface InspectionDraft {
  deviceId: string
  inspectorName: string
  result: InspectionResult | null
  notes: string
  photoPaths: string[]
}

/**
 * 已完成并可以持久化到巡检历史中的记录。
 *
 * inspectedAt 保存 ISO 8601 字符串；photoPaths 只保存 Filesystem 文件引用，
 * 不保存 Base64 图片内容。
 */
export interface InspectionRecord {
  id: string
  deviceId: string
  inspectorName: string
  result: InspectionResult
  notes: string
  photoPaths: string[]
  inspectedAt: string
}
