# Device Inspector / 设备巡检助手

一个面向现场设备巡检的 Android Hybrid App。项目使用 Vue 3、TypeScript 与 Capacitor 实现离线优先的巡检闭环：查看设备、创建巡检、调用 Android 系统相机拍摄现场照片、将照片保存到应用私有目录，并在应用重启后恢复巡检历史。

本项目不是只在浏览器运行的页面 Demo：已完成 Android 真机调试、Camera / Filesystem / Preferences / Device / Network / Local Notifications 接入，以及签名 Release APK、AAB 的构建与真机 Release 冒烟测试。

> App ID：<code>com.hugh.deviceinspector</code><br />
> 当前版本：<code>1.0</code>（<code>versionCode 1</code>）<br />
> 最低 Android 版本：API 24（Android 7.0）

## 项目亮点

- 使用 <code>InspectionDraft</code> 与 <code>InspectionRecord</code> 区分表单草稿和可持久化记录，避免页面直接拼装历史实体。
- 将相机临时资源与持久照片分离：临时照片只用于预览，提交后复制到 <code>Directory.Data/inspection-photos/</code>。
- Preferences 写入成功后才更新 Pinia，避免出现“页面显示成功、重启后记录丢失”的假成功状态。
- 文件已复制但记录保存失败时，执行补偿删除本次新增的照片文件。
- 提交巡检时固定临时照片快照，并禁用拍照、移除操作，避免异步提交期间的输入集合变化。
- 通过 Device、Network 展示真机环境与实时网络变化；页面卸载时清理原生网络监听。
- 巡检成功后检查通知权限、创建 Android 通知渠道并发送本地通知；通知失败不会影响已保存的巡检记录。
- 使用自建 Release keystore 签名生成 APK/AAB，并完成非 Debuggable Release APK 真机安装和冒烟测试。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| Web 框架 | Vue 3、Composition API、<code>&lt;script setup lang="ts"&gt;</code> |
| 类型系统 | TypeScript |
| 构建工具 | Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| Hybrid 容器 | Capacitor 8 |
| 原生能力 | Camera、Filesystem、Preferences、Device、Network、Local Notifications |
| Android | Android Studio、Gradle、ADB、Release Keystore |

> 当前项目没有真实后端，因此没有为了“凑技术栈”强行引入 Axios。设备基础数据由异步 Service 模拟提供；未来接入真实同步 API 时，再有意义地引入请求实例、超时、拦截器与离线队列。

## 核心能力

| 能力 | 说明 | 真机验证 |
| --- | --- | --- |
| 设备列表与详情 | 查看模拟设备、位置、状态与最近巡检时间 | 已验证 |
| 巡检创建 | 类型安全表单、结果校验、异常备注校验 | 已验证 |
| 巡检历史 | 显示空状态、关联设备、结果、时间、照片数量 | 已验证 |
| Camera | 调起 Android 系统相机并回到 WebView 预览 | 已验证 |
| Filesystem | 临时照片复制到应用私有 <code>Directory.Data</code> | 已验证 |
| Preferences | 巡检记录本地持久化与冷启动恢复 | 已验证 |
| Device | 读取真实设备型号、系统版本、SDK、厂商与运行环境 | 已验证 |
| Network | 首屏网络快照与 Wi-Fi / 离线实时监听 | 已验证 |
| Local Notifications | 巡检成功后创建渠道、投递系统通知 | 已验证 |
| Release 交付 | 签名 APK/AAB、签名校验、Release 真机冒烟测试 | 已验证 |

## 架构

项目遵循 <code>View → Composable → Service → Capacitor Plugin → Android</code> 的分层，避免在 Vue 页面中直接耦合原生插件调用、Android URI 和监听器清理。

~~~mermaid
flowchart TD
  subgraph Views[Vue Views]
    Home[HomeView]
    Detail[DeviceDetailView]
    Form[InspectionFormView]
    History[InspectionHistoryView]
  end

  subgraph Composables
    CameraComposable[useInspectionCamera]
    NotificationComposable[useInspectionNotification]
    EnvironmentComposable[useNativeEnvironment]
  end

  subgraph DomainAndState[Domain and State]
    InspectionTypes[InspectionDraft / InspectionRecord]
    InspectionStore[inspectionStore / Pinia]
    DeviceStore[deviceStore / Pinia]
  end

  subgraph Services
    CameraService[cameraService]
    PhotoStorage[inspectionPhotoStorageService]
    InspectionStorage[inspectionStorageService]
    NativeDeviceService[nativeDeviceService]
    NetworkService[networkService]
    NotificationService[localNotificationService]
  end

  subgraph Plugins[Capacitor Plugins]
    Camera[Camera]
    Filesystem[Filesystem]
    Preferences[Preferences]
    Device[Device]
    Network[Network]
    Notifications[Local Notifications]
  end

  Form --> CameraComposable --> CameraService --> Camera
  Form --> NotificationComposable --> NotificationService --> Notifications
  Form --> PhotoStorage --> Filesystem
  Form --> InspectionStore --> InspectionStorage --> Preferences
  Home --> EnvironmentComposable
  EnvironmentComposable --> NativeDeviceService --> Device
  EnvironmentComposable --> NetworkService --> Network
  Detail --> DeviceStore
  Form --> InspectionTypes
  InspectionStore --> InspectionTypes
  History --> InspectionStore
~~~

### 照片与巡检记录的数据流

~~~mermaid
sequenceDiagram
  participant User as 巡检人员
  participant Form as InspectionFormView
  participant Camera as Android 系统相机
  participant FS as Filesystem / Directory.Data
  participant Store as Pinia
  participant Prefs as Preferences

  User->>Form: 拍摄现场照片
  Form->>Camera: Camera.takePhoto()
  Camera-->>Form: TemporaryCameraPhoto (webPath / sourceUri)
  Note over Form: 仅临时预览，不进入 Preferences
  User->>Form: 保存巡检记录
  Form->>Form: 复制 photosToPersist 快照并锁定照片操作
  Form->>FS: copy() 到 inspection-photos/
  FS-->>Form: durable file:// URI
  Form->>Prefs: 保存 InspectionRecord[]
  Prefs-->>Form: 写入成功
  Form->>Store: 更新 records
  Note over Form,FS: 若记录保存失败，补偿删除本次复制的文件
~~~

### Device、Network 与通知流

~~~mermaid
flowchart LR
  Home[HomeView] --> Environment[useNativeEnvironment]
  Environment --> DeviceInfo[Device.getInfo]
  Environment --> NetworkStatus[Network.getStatus]
  Environment --> NetworkListener[Network.addListener]
  NetworkListener --> ReactiveUI[网络状态实时更新]

  SavedRecord[巡检记录保存成功] --> Notification[useInspectionNotification]
  Notification --> Permission[checkPermissions / requestPermissions]
  Permission --> Channel[createChannel: 巡检提醒]
  Channel --> Schedule[LocalNotifications.schedule]
  Schedule --> AndroidNotification[Android 系统通知栏]
~~~

## 关键设计决策

### 1. 为什么照片不直接保存到 Preferences？

Camera 返回的是临时资源，路径可能位于缓存目录，系统可能清理。项目仅用 <code>webPath</code> 预览临时照片；提交时使用 <code>Filesystem.copy()</code> 将文件复制到 App 私有的 <code>Directory.Data/inspection-photos/</code>，最终在 <code>InspectionRecord.photoPaths</code> 中保存稳定的 <code>file://</code> URI。

### 2. 为什么 Pinia 和 Preferences 都需要？

~~~text
Pinia        = 当前运行进程内的响应式状态
Preferences  = App 重启后仍可恢复的轻量持久化数据
~~~

保存顺序为：

~~~text
Preferences 写入成功
→ Pinia 更新
→ 页面响应式展示
~~~

这样存储失败时，UI 不会先显示一条无法恢复的记录。

### 3. 为什么通知失败不影响巡检记录成功？

巡检记录持久化是核心业务；本地通知是提交成功后的增强反馈。通知权限被拒绝或调度失败时，页面会单独说明，但不会回滚已写入 Preferences 的记录。

### 4. 为什么环境状态不放入 Pinia？

当前设备信息和网络状态只服务首页，且不需要持久化。它们放在 <code>useNativeEnvironment</code> 中，由组件生命周期管理；如果未来多个页面需要长期共享网络监听，再考虑提升为全局 Store。

## Android 真机验证

已在以下设备上完成主要验证：

~~~text
设备：HUAWEI HLK-AL00
系统：Android 10 / API 29
ABI：arm64-v8a
App ID：com.hugh.deviceinspector
~~~

已验证的关键事实：

- Camera 能真实调起 Android 系统相机，取消拍摄不会作为异常处理。
- 提交带照片的巡检后，照片存在于 App 私有目录，记录中保存的是 <code>file://</code> URI，而不是缓存路径。
- 强制停止并冷启动后，Preferences 巡检历史和私有照片仍存在。
- 首页能读取真实设备信息；关闭 / 恢复网络后，网络状态无需刷新页面即可更新。
- 巡检成功后，系统通知栏出现“巡检记录已保存”；ADB 可查询到本应用的通知渠道 <code>inspection-updates</code> 与已投递记录。
- 签名 Release APK 已在真机安装；<code>run-as</code> 返回 <code>package not debuggable</code>，确认当前安装包不是 Debug 构建。
- Release 冒烟测试已覆盖设备信息、网络状态、相机、Filesystem、Preferences、巡检历史和本地通知。

## 本地开发

### 环境要求

- Node.js（建议使用当前 LTS）
- pnpm
- Android Studio 与 Android SDK
- JDK 21
- 一台已开启 USB 调试的 Android 设备，或 Android 模拟器

> 本项目在终端 Gradle 构建中使用 JDK 21。Android Studio bundled JBR 25 曾与当前 Gradle / Groovy 组合出现 <code>Unsupported class file major version 69</code>，因此建议显式使用 JDK 21。

### 安装与 Web 运行

~~~bash
pnpm install
pnpm dev
~~~

### 类型检查与 Web 生产构建

~~~bash
pnpm build
~~~

### 同步 Capacitor Android 工程

~~~bash
pnpm android:sync
~~~

### 打开 Android Studio

~~~bash
pnpm android:open
~~~

### 构建和安装 Debug APK

~~~bash
cd android

# 请替换为本机 JDK 21 路径
JAVA_HOME="/path/to/jdk-21" ./gradlew assembleDebug

adb devices -l
adb -s <device-id> install --no-streaming -r app/build/outputs/apk/debug/app-debug.apk
~~~

Debug APK 输出位置：

~~~text
android/app/build/outputs/apk/debug/app-debug.apk
~~~

## Release 签名、APK 与 AAB

### 签名文件安全规则

Release 私钥和密码不提交 Git：

~~~text
android/keystore/                    # 私钥目录，已忽略
android/keystore.properties          # 密码配置，已忽略
android/keystore.properties.example  # 安全模板，可提交
~~~

不要提交或分享：

- <code>.jks</code> / <code>.keystore</code> 私钥文件；
- <code>keystore.properties</code>；
- keystore 密码、key 密码；
- 本地绝对路径。

### 首次创建 Release Keystore

~~~bash
mkdir -p android/keystore

keytool -genkeypair -v \
  -keystore android/keystore/device-inspector-release.jks \
  -alias device-inspector \
  -keyalg RSA \
  -keysize 2048 \
  -validity 9125
~~~

然后复制并填写本地配置：

~~~bash
cp android/keystore.properties.example android/keystore.properties
~~~

<code>android/keystore.properties</code> 示例：

~~~properties
storeFile=keystore/device-inspector-release.jks
storePassword=REPLACE_WITH_STORE_PASSWORD
keyAlias=device-inspector
keyPassword=REPLACE_WITH_KEY_PASSWORD
~~~

### 构建 Release APK 与 AAB

~~~bash
cd android

# 请替换为本机 JDK 21 路径
JAVA_HOME="/path/to/jdk-21" ./gradlew assembleRelease bundleRelease
~~~

输出位置：

~~~text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
~~~

- APK：可直接安装到 Android 真机，适合面试演示和内部测试。
- AAB：适合上传 Google Play；不能直接通过 <code>adb install</code> 安装。

### 验证 Release APK 签名

~~~bash
$ANDROID_HOME/build-tools/<version>/apksigner verify \
  --verbose \
  --print-certs \
  android/app/build/outputs/apk/release/app-release.apk
~~~

### Debug 与 Release 的安装边界

Debug APK 使用 Android Debug Keystore；Release APK 使用自建 Release Keystore。即使包名相同，签名不同的 Release APK 也不能直接覆盖 Debug APK：

~~~text
INSTALL_FAILED_UPDATE_INCOMPATIBLE
~~~

若要在同一台真机验证正式包名 <code>com.hugh.deviceinspector</code> 的 Release APK，需要先卸载 Debug App。**这会清空该 App 当前的 Preferences 数据和私有照片。**

## 三分钟面试演示建议

1. 展示首页：说明这是已安装在 Android 真机上的 Release App，展示真实设备信息和网络状态。
2. 进入设备详情与巡检表单：说明 <code>InspectionDraft</code> 和 <code>InspectionRecord</code> 的类型边界。
3. 调起 Android 系统相机拍照：说明此时是临时照片预览。
4. 提交巡检：说明临时照片复制到 <code>Directory.Data</code>，记录写入 Preferences，随后发送本地通知。
5. 展示历史记录与照片数量：关闭或重启 App 后再次展示，证明 Release 包中的端侧持久化有效。
6. 主动补充：提交期间照片快照与 UI 锁定、保存失败补偿删除、通知失败不影响记录成功。

## 已知边界与后续迭代

- 若照片复制成功后、Preferences 写入前进程被系统杀死，可能遗留孤儿照片文件；当前补偿删除只能覆盖可捕获失败。后续可做启动扫描清理、staging 目录或提交标记。
- 巡检历史当前展示照片数量，尚未实现持久照片缩略图墙。
- Device / Network / Local Notifications 已真机验证；Android 13+ 的通知权限申请代码和 Manifest 已实现，但当前测试机是 Android 10，未直接验证 Android 13+ 授权弹窗。
- 项目目前使用模拟设备数据和端侧持久化，尚未接入真实后端、Axios 请求层、认证或离线同步队列。
- Release 构建已签名验证；后续建议让 Gradle 在缺少或填写不完整的 <code>keystore.properties</code> 时明确失败，防止在新环境误生成未签名 Release 包。
- 当前 Release 未开启 R8 / ProGuard 压缩混淆，以优先保证 Capacitor 原生插件的可调试性与可解释性；发布到商店前应专项回归。

## 面试追问速记

| 问题 | 回答要点 |
| --- | --- |
| 为什么不直接存 Camera 路径？ | Camera 返回的临时缓存可能失效；复制到 <code>Directory.Data</code> 后再持久化稳定 URI。 |
| 为什么 Preferences 成功后才更新 Pinia？ | 避免持久化失败但 UI 先显示成功的假状态。 |
| <code>Network.getStatus()</code> 与 <code>addListener()</code> 为什么都要？ | 前者给首屏快照，后者处理后续网络变化。 |
| 为什么通知失败不回滚记录？ | 记录是主业务，通知是增强反馈，二者要解耦。 |
| 为什么 Release 不能覆盖 Debug？ | 同包名但签名证书不同，Android 会拒绝不可信更新。 |
| APK 和 AAB 有什么区别？ | APK 可直接安装；AAB 供应用商店按设备拆分生成 APK。 |

## 项目材料

- 阶段性与最终面试总结：[docs/device-inspector-interview-summary.html](docs/device-inspector-interview-summary.html)
- 建议补充：三分钟真机演示视频链接、首页截图、架构图导出图。

---

这个项目的目标不是堆叠 Capacitor 插件，而是让每个原生能力都有明确的分层、异常边界、真机验证、Release 交付证据，并能够在面试中被清晰解释。
