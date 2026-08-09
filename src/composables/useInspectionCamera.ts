import { computed, ref } from 'vue'
import {
  CameraServiceError,
  captureTemporaryPhoto,
  type TemporaryCameraPhoto,
} from '../services/cameraService'

const MAX_TEMPORARY_PHOTOS = 3

export function useInspectionCamera() {
  const temporaryPhotos = ref<TemporaryCameraPhoto[]>([])
  const capturing = ref(false)
  const cameraError = ref<string | null>(null)
  const cameraMessage = ref<string | null>(null)

  const canCapture = computed(
    () => !capturing.value && temporaryPhotos.value.length < MAX_TEMPORARY_PHOTOS,
  )

  async function capturePhoto(): Promise<void> {
    if (capturing.value) {
      return
    }

    if (temporaryPhotos.value.length >= MAX_TEMPORARY_PHOTOS) {
      cameraError.value = `本次最多临时预览 ${MAX_TEMPORARY_PHOTOS} 张照片`
      return
    }

    capturing.value = true
    cameraError.value = null
    cameraMessage.value = null

    try {
      const result = await captureTemporaryPhoto()

      if (result.status === 'cancelled') {
        cameraMessage.value = '已取消拍照'
        return
      }

      temporaryPhotos.value = [...temporaryPhotos.value, result.photo]
      cameraMessage.value = `已添加第 ${temporaryPhotos.value.length} 张临时照片`
    } catch (error: unknown) {
      cameraError.value =
        error instanceof CameraServiceError
          ? error.message
          : '拍摄照片失败，请稍后重试'
    } finally {
      capturing.value = false
    }
  }

  function removePhoto(photoId: string): void {
    temporaryPhotos.value = temporaryPhotos.value.filter(
      (photo) => photo.id !== photoId,
    )
    cameraError.value = null
    cameraMessage.value = '已移除临时照片'
  }

  function resetPhotos(): void {
    temporaryPhotos.value = []
    cameraError.value = null
    cameraMessage.value = null
  }

  return {
    temporaryPhotos,
    capturing,
    cameraError,
    cameraMessage,
    canCapture,
    maxPhotos: MAX_TEMPORARY_PHOTOS,
    capturePhoto,
    removePhoto,
    resetPhotos,
  }
}
