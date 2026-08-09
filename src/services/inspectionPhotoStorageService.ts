import { Directory, Filesystem } from '@capacitor/filesystem'
import type { TemporaryCameraPhoto } from './cameraService'

const INSPECTION_PHOTO_DIRECTORY = 'inspection-photos'

export type InspectionPhotoStorageErrorCode =
  | 'source-unavailable'
  | 'copy-failed'

export class InspectionPhotoStorageError extends Error {
  readonly code: InspectionPhotoStorageErrorCode
  readonly cause: unknown

  constructor(
    code: InspectionPhotoStorageErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message)
    this.name = 'InspectionPhotoStorageError'
    this.code = code
    this.cause = cause
  }
}

export interface InspectionPhotoCleanupResult {
  failedPaths: string[]
}

/**
 * 将 Camera 缓存照片复制到应用私有数据目录。
 *
 * 返回的 URI 可以安全地写入 InspectionRecord.photoPaths；它们不依赖系统缓存。
 */
export async function persistTemporaryInspectionPhotos(
  temporaryPhotos: readonly TemporaryCameraPhoto[],
): Promise<string[]> {
  const sourceUris = temporaryPhotos.map(getSourceFileUri)

  if (sourceUris.length === 0) {
    return []
  }

  const persistedPaths: string[] = []

  try {
    await Filesystem.mkdir({
      path: INSPECTION_PHOTO_DIRECTORY,
      directory: Directory.Data,
      recursive: true,
    })

    for (const [index, sourceUri] of sourceUris.entries()) {
      const destinationPath = createDestinationPath(temporaryPhotos[index])
      const result = await Filesystem.copy({
        from: sourceUri,
        to: destinationPath,
        toDirectory: Directory.Data,
      })

      persistedPaths.push(result.uri)
    }

    return persistedPaths
  } catch (error: unknown) {
    const cleanupResult = await deletePersistedInspectionPhotos(persistedPaths)
    const cleanupMessage =
      cleanupResult.failedPaths.length > 0
        ? '，且部分已复制的照片未能自动清理'
        : ''

    throw new InspectionPhotoStorageError(
      'copy-failed',
      `保存现场照片失败${cleanupMessage}`,
      error,
    )
  }
}

/**
 * 删除已持久化、但尚未成功写入巡检历史的照片，用于提交失败补偿。
 */
export async function deletePersistedInspectionPhotos(
  photoPaths: readonly string[],
): Promise<InspectionPhotoCleanupResult> {
  const failedPaths: string[] = []

  for (const photoPath of photoPaths) {
    try {
      await Filesystem.deleteFile({ path: photoPath })
    } catch {
      failedPaths.push(photoPath)
    }
  }

  return { failedPaths }
}

function getSourceFileUri(photo: TemporaryCameraPhoto): string {
  if (photo.sourceUri === null || !photo.sourceUri.trim()) {
    throw new InspectionPhotoStorageError(
      'source-unavailable',
      '当前照片缺少原生文件地址，无法保存到本地巡检记录',
    )
  }

  const sourceUri = photo.sourceUri.trim()

  if (sourceUri.startsWith('file://') || sourceUri.startsWith('content://')) {
    return sourceUri
  }

  if (sourceUri.startsWith('/')) {
    return `file://${sourceUri}`
  }

  throw new InspectionPhotoStorageError(
    'source-unavailable',
    '当前照片的原生文件地址格式不受支持，无法保存到本地巡检记录',
  )
}

function createDestinationPath(photo: TemporaryCameraPhoto | undefined): string {
  if (photo === undefined) {
    throw new InspectionPhotoStorageError(
      'copy-failed',
      '照片保存顺序异常，无法创建目标文件名',
    )
  }

  return `${INSPECTION_PHOTO_DIRECTORY}/${photo.id}.jpg`
}
