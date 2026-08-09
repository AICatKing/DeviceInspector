import { ref } from 'vue'
import {
  LocalNotificationServiceError,
  scheduleInspectionSuccessNotification,
} from '../services/localNotificationService'
import type { InspectionRecord } from '../types/inspection'

export function useInspectionNotification() {
  const notificationPending = ref(false)
  const notificationMessage = ref<string | null>(null)
  const notificationError = ref<string | null>(null)

  async function notifyInspectionSubmitted(input: {
    record: InspectionRecord
    deviceName: string
  }): Promise<void> {
    notificationPending.value = true
    notificationMessage.value = null
    notificationError.value = null

    try {
      const result = await scheduleInspectionSuccessNotification(input)

      if (result.status === 'permission-denied') {
        notificationMessage.value =
          '巡检记录已保存；未获得系统通知权限，可在系统设置中开启通知。'
        return
      }

      notificationMessage.value = '已发送巡检完成通知。'
    } catch (error: unknown) {
      notificationError.value =
        error instanceof LocalNotificationServiceError
          ? error.message
          : '巡检记录已保存，但本地通知发送失败。'
    } finally {
      notificationPending.value = false
    }
  }

  function resetNotificationFeedback(): void {
    notificationPending.value = false
    notificationMessage.value = null
    notificationError.value = null
  }

  return {
    notificationPending,
    notificationMessage,
    notificationError,
    notifyInspectionSubmitted,
    resetNotificationFeedback,
  }
}
