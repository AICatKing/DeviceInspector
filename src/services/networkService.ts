import { Network, type ConnectionStatus, type ConnectionType } from '@capacitor/network'

export interface NetworkSnapshot {
  connected: boolean
  connectionType: ConnectionType
}

export const NETWORK_CONNECTION_LABELS: Record<ConnectionType, string> = {
  wifi: 'Wi‑Fi',
  cellular: '移动数据',
  none: '无网络连接',
  unknown: '未知网络类型',
}

export class NetworkServiceError extends Error {
  readonly cause: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'NetworkServiceError'
    this.cause = cause
  }
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  try {
    return toNetworkSnapshot(await Network.getStatus())
  } catch (error: unknown) {
    throw new NetworkServiceError('读取当前网络状态失败，请稍后重试', error)
  }
}

export async function observeNetworkStatus(
  onStatusChange: (status: NetworkSnapshot) => void,
): Promise<() => Promise<void>> {
  try {
    const listener = await Network.addListener('networkStatusChange', (status) => {
      onStatusChange(toNetworkSnapshot(status))
    })

    return async () => {
      await listener.remove()
    }
  } catch (error: unknown) {
    throw new NetworkServiceError('监听网络状态变化失败，请稍后重试', error)
  }
}

function toNetworkSnapshot(status: ConnectionStatus): NetworkSnapshot {
  return {
    connected: status.connected,
    connectionType: status.connectionType,
  }
}
