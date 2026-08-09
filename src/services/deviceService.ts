import type { Device } from '../types/device'

const MOCK_DEVICES: readonly Device[] = [
  {
    id: 'dev-001',
    name: '空调主机 A1',
    location: 'B1 机房',
    status: 'normal',
    lastInspectionAt: '2026-08-08T10:00:00.000Z',
  },
  {
    id: 'dev-002',
    name: '配电柜 P2',
    location: '2F 配电间',
    status: 'warning',
    lastInspectionAt: '2026-08-07T14:30:00.000Z',
  },
  {
    id: 'dev-003',
    name: '水泵 W3',
    location: '地下一层泵房',
    status: 'offline',
    lastInspectionAt: null,
  },
  {
    id: 'dev-004',
    name: '电梯控制柜 E1',
    location: '1F 电梯间',
    status: 'normal',
    lastInspectionAt: '2026-08-09T08:15:00.000Z',
  },
]

function simulateNetworkDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function fetchDevices(): Promise<Device[]> {
  await simulateNetworkDelay()
  return MOCK_DEVICES.map((device) => ({ ...device }))
}

export async function fetchDeviceById(id: string): Promise<Device | null> {
  await simulateNetworkDelay(200)
  const device = MOCK_DEVICES.find((item) => item.id === id)
  return device ? { ...device } : null
}
