import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import type { TemporaryCameraPhoto } from './cameraService'

const INSPECTION_PHOTO_DIRECTORY = 'inspection-photos'

export type InspectionPhotoStorageErrorCode =
  | 'source-unavailable'
  | 'directory-unavailable'
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
 * 将持久化照片的原生 URI 转为 WebView 可加载的地址。
 *
 * InspectionRecord 保存的是 Filesystem 返回的原生 URI；View 不应直接处理
 * `file://` 等平台细节，而应使用这个展示边界生成图片地址。
 */
export function getPersistedInspectionPhotoDisplayUrl(photoPath: string): string | null {
  const normalizedPath = photoPath.trim()

  if (!normalizedPath) {
    return null
  }

  try {
    return Capacitor.convertFileSrc(normalizedPath)
  } catch {
    return null
  }
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
    await ensureInspectionPhotoDirectory()
  } catch (error: unknown) {
    logNativeStorageFailure('mkdir', error)

    throw new InspectionPhotoStorageError(
      'directory-unavailable',
      '无法创建巡检照片存储目录，请检查应用存储空间后重试',
      error,
    )
  }

  try {
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
    logNativeStorageFailure('copy', error)

    const cleanupResult = await deletePersistedInspectionPhotos(persistedPaths)
    const cleanupMessage =
      cleanupResult.failedPaths.length > 0
        ? '，且部分已复制的照片未能自动清理'
        : ''

    throw new InspectionPhotoStorageError(
      'copy-failed',
      `保存现场照片失败（复制阶段，错误码：copy-failed）${cleanupMessage}`,
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

/**
 * Capacitor Filesystem Android 实现在目录已存在时会让 mkdir 失败，
 * 因此这里先探测，再按需创建，使重复提交保持幂等。
 */
async function ensureInspectionPhotoDirectory(): Promise<void> {
  const existingType = await getInspectionPhotoDirectoryType()

  if (existingType === 'directory') {
    return
  }

  if (existingType === 'file') {
    throw new InspectionPhotoStorageError(
      'directory-unavailable',
      '巡检照片存储位置被同名文件占用，无法保存照片',
    )
  }

  try {
    await Filesystem.mkdir({
      path: INSPECTION_PHOTO_DIRECTORY,
      directory: Directory.Data,
      recursive: true,
    })
  } catch (mkdirError: unknown) {
    // 两次并发提交可能都通过首次检查。再次探测可将“另一请求已创建目录”视为成功。
    if ((await getInspectionPhotoDirectoryType()) === 'directory') {
      return
    }

    throw mkdirError
  }
}

async function getInspectionPhotoDirectoryType(): Promise<'directory' | 'file' | null> {
  try {
    const result = await Filesystem.stat({
      path: INSPECTION_PHOTO_DIRECTORY,
      directory: Directory.Data,
    })

    return result.type
  } catch {
    return null
  }
}

/**
 * 仅记录原生插件的可诊断元数据；不写入相机 URI，避免在日志中暴露本地文件路径。
 */
function logNativeStorageFailure(stage: 'mkdir' | 'copy', error: unknown): void {
  const nativeError = getNativeErrorDetails(error)

  console.error('[InspectionPhotoStorage] Native storage operation failed', {
    stage,
    code: nativeError.code,
    message: nativeError.message,
  })
}

function getNativeErrorDetails(error: unknown): {
  code: string | null
  message: string | null
} {
  if (error instanceof Error) {
    return {
      code: getRecordString(error, 'code'),
      message: error.message.trim() || null,
    }
  }

  return {
    code: getRecordString(error, 'code'),
    message: getRecordString(error, 'message'),
  }
}

function getRecordString(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const field = candidate[key]

  return typeof field === 'string' && field.trim() ? field : null
}
