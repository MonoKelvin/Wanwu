# Electron 主进程服务层

按领域划分子目录，入口为各模块内的 `*Service` 类或具名函数；跨模块依赖通过相对路径显式引用，避免循环依赖。

## 目录

| 目录 | 职责 |
|------|------|
| `core/` | SQLite 连接（用户 / RSS / 图鉴）、捆绑资源根路径 |
| `data/` | 万物数据目录配置、迁移、备份诊断、应用设置规范化 |
| `media/` | 媒体 URL 解析、系统 shell、分享、用户头像、图鉴静态资源 |
| `library/` | 图鉴种子入库、预编译数据包、条目 CRUD、Markdown 正文 |
| `rss/` | 订阅 schema、拉取/探测、默认源、定时刷新 |
| `app/` | 窗口状态持久化、加密预留 |
| `cloud-abode/` | 云斋经济、商城、TODO、工具、独立 SQLite |

## 依赖方向

```
app, data ──► core
library ────► core, media
rss ────────► core, rss/*
media ──────► core/assetsRoot, data/paths
```

构建脚本（`scripts/build-library-pack.ts`）仅依赖 `core/database` 与 `library/*`。
