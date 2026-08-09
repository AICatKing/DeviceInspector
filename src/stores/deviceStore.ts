import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchDeviceById, fetchDevices } from '../services/deviceService'
import type { Device } from '../types/device'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([])
  const currentDevice = ref<Device | null>(null)
  const loading = ref(false)
  const detailLoading = ref(false)
  const error = ref<string | null>(null)
  const detailError = ref<string | null>(null)

  const deviceCount = computed(() => devices.value.length)

  async function loadDevices(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      devices.value = await fetchDevices()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '加载设备列表失败'
    } finally {
      loading.value = false
    }
  }

  async function loadDeviceById(id: string): Promise<void> {
    detailError.value = null

    const cachedDevice = devices.value.find((device) => device.id === id)
    if (cachedDevice) {
      currentDevice.value = cachedDevice
      return
    }

    detailLoading.value = true
    currentDevice.value = null

    try {
      if (devices.value.length === 0) {
        devices.value = await fetchDevices()
        const deviceFromList = devices.value.find((device) => device.id === id)
        if (deviceFromList) {
          currentDevice.value = deviceFromList
          return
        }
      }

      currentDevice.value = await fetchDeviceById(id)
      if (!currentDevice.value) {
        detailError.value = '设备不存在'
      }
    } catch (err: unknown) {
      detailError.value = err instanceof Error ? err.message : '加载设备详情失败'
    } finally {
      detailLoading.value = false
    }
  }

  function clearCurrentDevice(): void {
    currentDevice.value = null
    detailError.value = null
  }

  return {
    devices,
    currentDevice,
    loading,
    detailLoading,
    error,
    detailError,
    deviceCount,
    loadDevices,
    loadDeviceById,
    clearCurrentDevice,
  }
})
