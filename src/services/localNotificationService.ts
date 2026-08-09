import { Capacitor, type PermissionState } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { INSPECTION_RESULT_LABELS, type InspectionRecord } from '../types/inspection'

const INSPECTION_NOTIFICATION_CHANNEL_ID = 'inspection-updates'

export type InspectionNotificationDispatchResult =
  | {
      status: 'scheduled'
      notificationId: number
    }
  | {
      status: 'permission-denied'
    }

export class LocalNotificationServiceError extends Error {
  readonly cause: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'LocalNotificationServiceError'
    this.cause = cause
  }
}

export async function scheduleInspectionSuccessNotification(input: {
  record: InspectionRecord
  deviceName: string
}): Promise<InspectionNotificationDispatchResult> {
  try {
    const permission = await ensureNotificationPermission()

    if (permission !== 'granted') {
      return { status: 'permission-denied' }
    }

    const notificationId = createNotificationId(input.record.id)
    const isAndroid = Capacitor.getPlatform() === 'android'

    if (isAndroid) {
      await LocalNotifications.createChannel({
        id: INSPECTION_NOTIFICATION_CHANNEL_ID,
        name: '巡检提醒',
        description: '巡检记录保存完成后的本地提醒',
        importance: 3,
        visibility: 0,
        vibration: true,
      })
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: '巡检记录已保存',
          body: `设备「${input.deviceName}」巡检完成，结果：${INSPECTION_RESULT_LABELS[input.record.result]}`,
          channelId: isAndroid ? INSPECTION_NOTIFICATION_CHANNEL_ID : undefined,
          group: 'inspection-records',
        },
      ],
    })

    return {
      status: 'scheduled',
      notificationId,
    }
  } catch (error: unknown) {
    throw new LocalNotificationServiceError(
      '巡检记录已保存，但本地通知发送失败',
      error,
    )
  }
}

async function ensureNotificationPermission(): Promise<PermissionState> {
  const currentPermission = await LocalNotifications.checkPermissions()

  if (currentPermission.display === 'granted') {
    return currentPermission.display
  }

  if (
    currentPermission.display === 'prompt' ||
    currentPermission.display === 'prompt-with-rationale'
  ) {
    return (await LocalNotifications.requestPermissions()).display
  }

  return currentPermission.display
}

function createNotificationId(recordId: string): number {
  let hash = 0

  for (const character of recordId) {
    hash = Math.imul(31, hash) + character.charCodeAt(0)
    hash |= 0
  }

  return hash & 0x7fffffff
}
