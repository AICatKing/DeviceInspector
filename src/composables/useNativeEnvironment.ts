import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getNativeDeviceSnapshot,
  type NativeDeviceSnapshot,
} from '../services/nativeDeviceService'
import {
  getNetworkSnapshot,
  NETWORK_CONNECTION_LABELS,
  observeNetworkStatus,
  type NetworkSnapshot,
} from '../services/networkService'

export function useNativeEnvironment() {
  const device = ref<NativeDeviceSnapshot | null>(null)
  const network = ref<NetworkSnapshot | null>(null)
  const loading = ref(false)
  const deviceError = ref<string | null>(null)
  const networkError = ref<string | null>(null)

  let disposed = false
  let stopNetworkListener: (() => Promise<void>) | null = null

  const networkLabel = computed(() => {
    if (network.value === null) {
      return '网络状态加载中'
    }

    return NETWORK_CONNECTION_LABELS[network.value.connectionType]
  })

  const networkDescription = computed(() => {
    if (network.value === null) {
      return '正在读取当前网络状态'
    }

    return network.value.connected
      ? `当前已连接：${networkLabel.value}`
      : '当前未连接网络，巡检记录仍可保存在本机'
  })

  async function refreshEnvironment(): Promise<void> {
    loading.value = true
    deviceError.value = null
    networkError.value = null

    const [deviceResult, networkResult] = await Promise.allSettled([
      getNativeDeviceSnapshot(),
      getNetworkSnapshot(),
    ])

    if (disposed) {
      return
    }

    if (deviceResult.status === 'fulfilled') {
      device.value = deviceResult.value
    } else {
      deviceError.value = getErrorMessage(
        deviceResult.reason,
        '读取当前设备信息失败，请稍后重试',
      )
    }

    if (networkResult.status === 'fulfilled') {
      network.value = networkResult.value
    } else {
      networkError.value = getErrorMessage(
        networkResult.reason,
        '读取当前网络状态失败，请稍后重试',
      )
    }

    loading.value = false
  }

  async function startNetworkMonitoring(): Promise<void> {
    try {
      const stopListener = await observeNetworkStatus((status) => {
        network.value = status
        networkError.value = null
      })

      if (disposed) {
        await stopListener()
        return
      }

      stopNetworkListener = stopListener
    } catch (error: unknown) {
      if (!disposed) {
        networkError.value = getErrorMessage(
          error,
          '监听网络状态变化失败，请稍后重试',
        )
      }
    }
  }

  async function initialize(): Promise<void> {
    await refreshEnvironment()

    if (!disposed) {
      await startNetworkMonitoring()
    }
  }

  onMounted(() => {
    void initialize()
  })

  onBeforeUnmount(() => {
    disposed = true

    if (stopNetworkListener !== null) {
      void stopNetworkListener()
      stopNetworkListener = null
    }
  })

  return {
    device,
    network,
    loading,
    deviceError,
    networkError,
    networkLabel,
    networkDescription,
    refreshEnvironment,
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}
