export type DeviceStatus = 'normal' | 'warning' | 'offline'

export interface Device {
  id: string
  name: string
  location: string
  status: DeviceStatus
  lastInspectionAt: string | null
}

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  normal: '正常',
  warning: '告警',
  offline: '离线',
}
