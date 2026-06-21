# 侧栏天气详细设计 v1.0

## 目录结构

```
src/modules/weather/
  app/           # registerAppModule、扩展点注册
  components/    # WeatherSidebarWidget（纯展示）
  domain/        # 类型、WMO 码映射、wanwuApi augmentation
  main/          # Open-Meteo、定位链、调度、IPC
  preload/       # window.wanwu.weather
  settings/      # WeatherAppSettingsGroup
  styles/        # weather-sidebar.css
```

## 框架扩展点

| 注册表 | 文件 | 接入位置 |
|--------|------|----------|
| `sidebarFooterRegistry` | `src/app/modules/sidebarFooterRegistry.ts` | `ModuleSidebar.vue` 底部 |
| `appSettingsGroupRegistry` | `src/app/modules/appSettingsGroupRegistry.ts` | `SettingsAppSection.vue` |

`IAppModule` 新增可选钩子：`registerSidebarFooter`、`registerAppSettingsGroup`。

## AppSettings 字段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `weatherEnabled` | boolean | true | 侧栏挂件开关 |
| `weatherCity` | string | '' | 固定城市，空则自动定位 |
| `weatherRefreshMinutes` | 0\|15\|30\|60 | 30 | 后台刷新间隔，0=仅启动时 |

## 定位与请求流程

```mermaid
主进程 refresh()
  ├─ weatherCity 非空 → Open-Meteo Geocoding
  ├─ sessionCoordinates（来自 adoptCoordinates）
  ├─ IP → ipwho.is
  └─ locale 首都 → Geocoding
       ↓
Open-Meteo Forecast → WeatherSnapshot → IPC weather:updated
```

渲染层挂件 `onMounted`：若未配置城市，调用 `navigator.geolocation` → `weather.adoptCoordinates`。

## IPC / Preload

- `weather:getSnapshot` → `WeatherSnapshot | null`
- `weather:refresh` → 强制刷新
- `weather:adoptCoordinates({ latitude, longitude })` → 写入会话坐标并刷新
- 事件 `weather:updated` → 推送最新快照

## UI 行为

- 侧栏底部：图标 + 温度；导航「图标+文字」模式额外显示城市名
- `pointer-events: none`，无 hover/click
- 关闭 `weatherEnabled` 后贡献项 `isEnabled` 为 false，不挂载组件
