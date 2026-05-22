# 构建脚本

统一入口 `run.mjs`；图鉴数据包由 `build-library-pack.ts` 生成。全库内容维护在 `assets/seed/library/`，不再使用批量种子流水线。

## npm 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | `run.mjs dev` + Electron Vite 开发 |
| `npm run build` | 系统 Node sqlite → 数据包 → 编译 → Electron sqlite |
| `npm run pack` | 安装包构建入口（**预留**） |
| `npm run typecheck` | 前端类型检查 |
| `npm run postinstall` | 为 Electron 重编 `better-sqlite3` |
| `npm run rebuild` | 强制重编原生模块 |

## `run.mjs` 子命令

| 命令 | 用途 |
|------|------|
| `check` | 校验 Node 版本 |
| `dev` | 开发前准备（check + sqlite electron + renderer） |
| `sqlite electron` | 确保 better-sqlite3 匹配 Electron |
| `sqlite host` | 为系统 Node 重编（build 数据包前） |
| `sqlite rebuild [--force]` | 仅为 Electron 重编 |
| `renderer` | 开发态 renderer 回退包 |
| `pack` | 安装包占位入口 |

## 数据维护

编辑 `assets/seed/library/items/**/*.json` 与 `content.md` 后更新 `catalog.json`。发布前执行 `npm run build`。
