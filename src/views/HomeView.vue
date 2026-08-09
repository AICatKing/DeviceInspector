<script setup lang="ts">
import { useNativeEnvironment } from '../composables/useNativeEnvironment'

const appName = 'Device Inspector'
const appSubtitle = '设备巡检助手'

const {
  device,
  network,
  loading,
  deviceError,
  networkError,
  networkLabel,
  networkDescription,
  refreshEnvironment,
} = useNativeEnvironment()
</script>

<template>
  <main class="home">
    <h1>{{ appName }}</h1>
    <p class="subtitle">{{ appSubtitle }}</p>
    <p class="status">端侧巡检流程已就绪</p>
    <section class="environment-panel" aria-labelledby="environment-heading">
      <div class="environment-panel__header">
        <div>
          <h2 id="environment-heading">运行环境</h2>
          <p>来自 Capacitor Device 与 Network 的实时状态</p>
        </div>
        <button
          class="refresh-button"
          type="button"
          :disabled="loading"
          @click="refreshEnvironment"
        >
          {{ loading ? '刷新中...' : '刷新状态' }}
        </button>
      </div>

      <p v-if="deviceError" class="environment-error" role="alert">
        {{ deviceError }}
      </p>
      <dl v-else-if="device" class="environment-list">
        <div>
          <dt>设备</dt>
          <dd>{{ device.displayName }}</dd>
        </div>
        <div>
          <dt>厂商 / 型号</dt>
          <dd>{{ device.manufacturer }} · {{ device.model }}</dd>
        </div>
        <div>
          <dt>系统</dt>
          <dd>{{ device.operatingSystem }} {{ device.osVersion }}</dd>
        </div>
        <div v-if="device.androidSdkVersion !== null">
          <dt>Android SDK</dt>
          <dd>API {{ device.androidSdkVersion }}</dd>
        </div>
        <div>
          <dt>运行设备</dt>
          <dd>{{ device.isVirtual ? '模拟器' : '真实设备' }}</dd>
        </div>
      </dl>
      <p v-else class="environment-loading">正在读取设备信息...</p>

      <div class="network-status" :class="{ 'network-status--offline': !network?.connected }">
        <span class="network-status__dot" aria-hidden="true"></span>
        <div>
          <strong>{{ networkLabel }}</strong>
          <p>{{ networkDescription }}</p>
        </div>
      </div>
      <p v-if="networkError" class="environment-error" role="alert">
        {{ networkError }}
      </p>
    </section>
    <div class="entry-actions">
      <RouterLink class="entry-link" to="/devices">进入设备列表 →</RouterLink>
      <RouterLink class="entry-link entry-link--secondary" to="/inspections">
        查看巡检历史
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.subtitle {
  color: #64748b;
  margin: 0 0 1.5rem;
}

.status {
  font-size: 0.875rem;
  color: #16a34a;
  margin-bottom: 1.5rem;
}

.environment-panel {
  width: min(100%, 38rem);
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #dbeafe;
  border-radius: 0.75rem;
  background: #fff;
  text-align: left;
  box-shadow: 0 4px 12px rgb(15 23 42 / 5%);
}

.environment-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.environment-panel h2 {
  margin: 0;
  font-size: 1rem;
}

.environment-panel__header p,
.network-status p {
  margin: 0.125rem 0 0;
  color: #64748b;
  font-size: 0.8125rem;
}

.refresh-button {
  flex: 0 0 auto;
  padding: 0.375rem 0.625rem;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  color: #1d4ed8;
  background: #eff6ff;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.environment-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
}

.environment-list div {
  min-width: 0;
}

dt {
  color: #64748b;
  font-size: 0.75rem;
}

dd {
  overflow-wrap: anywhere;
  margin: 0.125rem 0 0;
  color: #334155;
  font-size: 0.875rem;
  font-weight: 500;
}

.network-status {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: #ecfdf5;
}

.network-status--offline {
  background: #fff7ed;
}

.network-status__dot {
  width: 0.625rem;
  height: 0.625rem;
  flex: 0 0 auto;
  margin-top: 0.3rem;
  border-radius: 50%;
  background: #16a34a;
}

.network-status--offline .network-status__dot {
  background: #ea580c;
}

.environment-error {
  margin: 0.875rem 0;
  color: #b91c1c;
  font-size: 0.875rem;
}

.environment-loading {
  margin: 1rem 0;
  color: #64748b;
  font-size: 0.875rem;
}

.entry-link {
  display: inline-block;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.entry-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.entry-link--secondary {
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
}

@media (max-width: 28rem) {
  .environment-panel__header {
    flex-direction: column;
  }

  .environment-list {
    grid-template-columns: 1fr;
  }
}
</style>
