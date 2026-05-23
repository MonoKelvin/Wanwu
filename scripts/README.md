# 构建脚本

统一入口为 `run.mjs`；图鉴数据包由 `build-library-pack.ts` 在 `npm run build` 时生成。

## 常用 npm 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 |
| `npm run build` | 数据包 + 编译 + Electron 原生模块 |
| `npm run pack` | Windows 安装包（见 `pack/windows/`） |
| `npm run typecheck` | 前端类型检查 |
| `npm run rebuild` | 强制重编 `better-sqlite3` 等 |
| `npm run logo:ico` | 生成应用图标 |

`run.mjs` 子命令：`check`、`dev`、`sqlite`（host / electron / rebuild）、`renderer`、`pack`。
