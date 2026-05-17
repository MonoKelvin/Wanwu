# 万物

**万物**是一款用于收集与浏览「事物」的 PC 桌面应用——涵盖百科知识、图像细节、冷知识，以及个人专题与 RSS 资讯等。仓库与包管理中的 **Wanwu** 仅为开发期使用的英文项目代号。

- 技术栈：Electron · Vue 3 · PrimeVue · Tailwind CSS · SQLite  
- 仓库：[github.com/MonoKelvin/Wanwu](https://github.com/MonoKelvin/Wanwu)

## 环境要求

- **Node.js** ≥ 20.9（推荐 20.19+ 或 22 LTS，以运行 Vite 7 / electron-vite 5）
- **npm** ≥ 10

## 快速启动

**Windows（双击或命令行）：**

```bat
start-dev.bat
```

**PowerShell：**

```powershell
.\start-dev.ps1
```

**或使用 npm：**

```bash
npm install
npm run dev
```

> 首次 `npm install` 会编译 `better-sqlite3` 原生模块，可能需要数分钟。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 构建生产包 |
| `npm run preview` | 预览构建结果 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run seed:import` | 种子数据导入说明 |

## 项目结构

```
├── electron/           # 主进程：IPC、SQLite、RSS
├── src/
│   ├── app/            # 三栏布局、路由、设计 Token
│   ├── modules/        # 全库 / RSS / 自建 / 个人 / 设置
│   ├── features/item/  # 物品卡片与详情
│   └── shared/         # 类型与 Pinia Store
├── assets/seed/        # 初始 JSON 种子数据
├── doc/                # 需求与设计文档
├── scripts/            # 工具脚本
├── start-dev.bat       # Windows 启动脚本
└── start-dev.ps1       # PowerShell 启动脚本
```

## 功能概览（v1.0.0）

| 模块 | 说明 |
|------|------|
| 全库 | 14 类默认分类，可浏览、编辑与补充，不可删除系统分类 |
| RSS | 订阅源管理与条目拉取 |
| 自建 | 个人分类（与全库去重校验） |
| 个人 | 资料、收藏 |
| 设置 | 关于、数据目录、开源链接 |

本地数据目录：`%APPDATA%/wanwu/`（各平台 userData 下的 `wanwu` 文件夹）。

## 文档

| 文档 | 路径 |
|------|------|
| 软件需求说明 | [doc/Wanwu（万物）软件需求说明.txt](doc/Wanwu（万物）软件需求说明.txt) |
| 用户需求文档 | [doc/Wanwu（万物）用户需求文档 v1.0.docx](doc/Wanwu（万物）用户需求文档%20v1.0.docx) |
| 详细设计文档 | [doc/Wanwu（万物）详细设计文档 v1.0.docx](doc/Wanwu（万物）详细设计文档%20v1.0.docx) |

## 参与与许可

欢迎通过 [Issues](https://github.com/MonoKelvin/Wanwu/issues) 反馈问题或建议。

MIT © [MonoKelvin](https://github.com/MonoKelvin)
