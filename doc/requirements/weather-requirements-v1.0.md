# 侧栏天气需求 v1.0

## 目标

在左导航最底部展示当前城市天气（温度 + 简要状态），**仅展示、无点击交互**。

## 数据源

- 默认使用 [Open-Meteo](https://open-meteo.com/)（免费、无需 API Key）
- 地理编码与预报均走 Open-Meteo 官方 API

## 设置入口

- 位于 **设置 → 应用** 分区内（非独立天气分区）
- 可配置：开关、固定城市、后台刷新间隔

## 定位优先级（未配置固定城市时）

1. 渲染进程尝试 `navigator.geolocation`（静默、无 UI 交互），坐标回传主进程
2. IP 地理定位（ipwho.is）
3. 系统 locale 对应国家 **首都** 兜底

## 架构约束

- 业务代码全部位于 `src/modules/weather/`
- 框架仅提供通用扩展点：
  - `sidebarFooterRegistry` — 侧栏底部插槽
  - `appSettingsGroupRegistry` — 应用设置分组
- 主进程 IPC：`weather:getSnapshot` / `weather:refresh` / `weather:adoptCoordinates`

## 非目标（v1）

- 点击展开详情、Popover、手动刷新按钮
- 独立主模块导航入口
