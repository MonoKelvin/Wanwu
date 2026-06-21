# Electron 主进程服务层

按领域划分子目录；业务逻辑由各 `src/modules/**/main` 模块注册，框架仅保留通用基础设施。

## 目录

| 目录 | 职责 |
|------|------|
| `core/` | SQLite 用户库连接、捆绑资源根路径 |
| `data/` | 万物数据目录配置、迁移、备份诊断、设置规范化 re-export |
| `media/` | 媒体 URL 解析（委托 `mediaResolverBridge`）、系统 shell、应用资源 |
| `storage/` | 用户数据网关 |
| `app/` | 窗口状态持久化、退出与关闭策略 |

## 桥接层（`electron/app/`）

| 桥接 | 用途 |
|------|------|
| `frameworkLifecycleBridge` | 模块注册生命周期钩子（托盘、便笺弹出、库 bootstrap 等） |
| `mediaResolverBridge` | 模块注册 `wanwu-media` 路径解析器 |
| `maintenanceBridge` | 模块注册诊断行与缓存目录 |
| `databaseSchemaBridge` | 模块扩展用户库 schema |
| `installerImportBridge` | 安装包数据导入（由图鉴模块注入） |
| `moduleRuntimeBridge` | 按 moduleId 获取主进程运行时服务 |

## 依赖方向

```
app, data ──► core
media ──────► core, data/paths, mediaResolverBridge
ipc ────────► services/*, app/* 桥接
```

业务表与独立库由各模块 `registerDatabaseSchema` 或模块内自建连接管理。
