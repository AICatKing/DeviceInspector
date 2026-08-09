import { Device } from '@capacitor/device'

export interface NativeDeviceSnapshot {
  displayName: string
  manufacturer: string
  model: string
  platform: 'ios' | 'android' | 'web'
  operatingSystem: string
  osVersion: string
  androidSdkVersion: number | null
  isVirtual: boolean
  webViewVersion: string
}

export class NativeDeviceServiceError extends Error {
  readonly cause: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'NativeDeviceServiceError'
    this.cause = cause
  }
}

export async function getNativeDeviceSnapshot(): Promise<NativeDeviceSnapshot> {
  try {
    const info = await Device.getInfo()

    return {
      displayName: info.name?.trim() || info.model,
      manufacturer: info.manufacturer,
      model: info.model,
      platform: info.platform,
      operatingSystem: info.operatingSystem,
      osVersion: info.osVersion,
      androidSdkVersion: info.androidSDKVersion ?? null,
      isVirtual: info.isVirtual,
      webViewVersion: info.webViewVersion,
    }
  } catch (error: unknown) {
    throw new NativeDeviceServiceError(
      '读取当前设备信息失败，请稍后重试',
      error,
    )
  }
}
