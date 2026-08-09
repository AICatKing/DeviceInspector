import { Capacitor } from '@capacitor/core'
import {
  Camera,
  CameraErrorCode,
  EncodingType,
  MediaType,
} from '@capacitor/camera'

export interface TemporaryCameraPhoto {
  id: string
  previewUrl: string
  sourceUri: string | null
  format: string
  resolution: string | null
  capturedAt: string
}

export type TemporaryPhotoCaptureResult =
  | {
      status: 'captured'
      photo: TemporaryCameraPhoto
    }
  | {
      status: 'cancelled'
    }

export type CameraServiceErrorCode =
  | 'permission-denied'
  | 'camera-unavailable'
  | 'invalid-result'
  | 'capture-failed'

export class CameraServiceError extends Error {
  readonly code: CameraServiceErrorCode
  readonly cause: unknown

  constructor(code: CameraServiceErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'CameraServiceError'
    this.code = code
    this.cause = cause
  }
}

export async function captureTemporaryPhoto(): Promise<TemporaryPhotoCaptureResult> {
  try {
    const result = await Camera.takePhoto({
      quality: 80,
      correctOrientation: true,
      encodingType: EncodingType.JPEG,
      saveToGallery: false,
      editable: 'no',
      webUseInput: true,
      includeMetadata: true,
    })

    if (result.type !== MediaType.Photo) {
      throw new CameraServiceError(
        'invalid-result',
        '相机返回了非照片类型的媒体文件',
      )
    }

    const previewUrl = getPreviewUrl(result.webPath, result.uri)

    if (previewUrl === null) {
      throw new CameraServiceError(
        'invalid-result',
        '相机已返回照片，但缺少可用于预览的地址',
      )
    }

    return {
      status: 'captured',
      photo: {
        id: `temporary-photo-${crypto.randomUUID()}`,
        previewUrl,
        sourceUri: result.uri ?? null,
        format: result.metadata?.format ?? 'unknown',
        resolution: result.metadata?.resolution ?? null,
        capturedAt: result.metadata?.creationDate ?? new Date().toISOString(),
      },
    }
  } catch (error: unknown) {
    if (error instanceof CameraServiceError) {
      throw error
    }

    const pluginErrorCode = getPluginErrorCode(error)

    if (pluginErrorCode === CameraErrorCode.TakePhotoCancelled) {
      return { status: 'cancelled' }
    }

    if (pluginErrorCode === CameraErrorCode.CameraPermissionDenied) {
      throw new CameraServiceError(
        'permission-denied',
        '无法使用相机，请在系统设置中允许相机访问后重试',
        error,
      )
    }

    if (pluginErrorCode === CameraErrorCode.NoCameraAvailable) {
      throw new CameraServiceError(
        'camera-unavailable',
        '当前设备没有可用的相机应用',
        error,
      )
    }

    throw new CameraServiceError(
      'capture-failed',
      getPluginErrorMessage(error) ?? '拍摄照片失败，请稍后重试',
      error,
    )
  }
}

function getPreviewUrl(webPath: string | undefined, uri: string | undefined): string | null {
  if (webPath) {
    return webPath
  }

  if (uri) {
    return Capacitor.convertFileSrc(uri)
  }

  return null
}

function getPluginErrorCode(error: unknown): string | null {
  if (!isRecordObject(error)) {
    return null
  }

  return typeof error.code === 'string' ? error.code : null
}

function getPluginErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (!isRecordObject(error)) {
    return null
  }

  return typeof error.message === 'string' && error.message.trim()
    ? error.message
    : null
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
