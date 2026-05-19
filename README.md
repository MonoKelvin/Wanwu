# 万物（Wanwu）

桌面端「事物图鉴」应用：用分类与条目组织百科式内容，配图浏览、个人收藏与 RSS 阅读。适合本地查阅、整理兴趣专题，数据保存在本机。

| | |
|---|---|
| 平台 | Windows（Electron 桌面应用） |
| 界面 | 中文，三栏布局 |
| 技术 | Electron · Vue 3 · PrimeVue · SQLite |

仓库：[github.com/MonoKelvin/Wanwu](https://github.com/MonoKelvin/Wanwu)

---

## 功能概览

| 模块 | 你可以做什么 |
|------|----------------|
| **全库** | 浏览 14 个内置大类（猫、狗、植物、电影等）及子类下的图鉴条目；查看简介、规格参数与多图详情 |
| **RSS** | 添加订阅源，阅读拉取到的资讯条目 |
| **个人** | 编辑昵称等资料，管理收藏 |
| **设置** | 查看版本、本地数据目录、项目链接 |

点击条目进入详情页，可切换图库缩略图；来自图库的配图会显示作者与来源说明。

---

## 安装与运行

### 环境

- Node.js **≥ 20.19**（推荐 22 LTS）
- npm **≥ 10**

### 从源码启动

```bash
git clone https://github.com/MonoKelvin/Wanwu.git
cd Wanwu
npm install
npm run dev
```

Windows 也可使用 `start-dev.bat` 或 `.\start-dev.ps1`（会检查 Node 版本）。

首次 `npm install` 需编译 SQLite 原生模块，请耐心等待。

### 构建安装包

```bash
npm run build
```

产物由 electron-builder 生成，具体输出目录见构建日志。本地快速验证可用 `npm run preview`。

---

## 日常使用

1. 启动后默认进入 **全库**，左侧选大类与子类，中间为条目列表，右侧可展开子项面板。
2. 点击卡片打开 **详情**：大图、文字介绍、标签与规格；多图条目可点底部缩略图切换。
3. 在详情页可将条目 **加入收藏**，在 **个人** 模块查看。
4. **RSS** 模块维护订阅源列表，选择源后阅读条目。

**数据存在哪**

| 内容 | 位置 |
|------|------|
| 账号、收藏、RSS 数据 | 系统用户目录下的 `wanwu` 文件夹（Windows 多为 `%APPDATA%\wanwu\`） |
| 全库内置条目与配图 | 安装目录内 `assets`（开发时即仓库内）；首次运行会写入本地数据库 |

卸载程序不会自动删除上述用户目录，备份或迁移时请复制整个 `wanwu` 文件夹。路径可在 **设置** 中查看。

---

## 开发说明

### 常用脚本

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发模式（热更新） |
| `npm run build` | 生产构建 |
| `npm run typecheck` | 前端类型检查 |
| `npm run rebuild` | 重新编译 `better-sqlite3`（换 Node 版本后如遇数据库报错可执行） |

### 目录说明

```
electron/                 主进程：窗口、IPC、SQLite、RSS 拉取
src/
  app/                    壳层、路由、全局样式与主题
  modules/                各业务页面（library / rss / personal / settings）
  features/item/          条目卡片、详情、配图归属展示
  shared/                 公共类型与状态
assets/
  seed/library/           全库 catalog.json、media.json（条目与配图策略）
  library/                全库配图文件（按 分类/slug/ 存放）
scripts/                  种子脚本、Node 版本检查等
doc/                      需求与设计文档
```

主进程在启动时读取 `assets/seed/library/catalog.json`，将全库条目同步到各分类的 `library_*.sqlite`。

### 维护全库配图

需要更新或扩充全库图片时：

1. 复制 `.env.example` 为 `.env`，配置 `PIXABAY_API_KEY`（[申请地址](https://pixabay.com/api/docs/)）。
2. 按需修改 `assets/seed/library/media.json`（条目 slug、搜索词、来源类型等）。
3. 运行 `npm run seed:library`；若要覆盖已有 JPG，追加参数 `-- --force`。
4. 重启应用使数据库重新导入；或执行 `npm run seed:library:reimport`。

其他脚本：`seed:library:audit` 检查缺图；`seed:import` 输出种子数据说明。条目正文在 `catalog.json` 中维护。

手动配图：在 `assets/library/{categoryId}/{slug}/` 放置 `cover.jpg` 与 `gallery-01.jpg`～`gallery-03.jpg`，并在 `media.json` 中将该 slug 的 `provider` 设为 `manual`。

### 环境变量

| 变量 | 用途 |
|------|------|
| `PIXABAY_API_KEY` | 全库配图下载（默认） |
| `UNSPLASH_ACCESS_KEY` | 可选，仅在 `media.json` 指定 `unsplash` 时需要 |

---

## 设计文档

| 文档 | 路径 |
|------|------|
| 软件需求说明 | [doc/Wanwu（万物）软件需求说明.txt](doc/Wanwu（万物）软件需求说明.txt) |
| 用户需求文档 | [doc/Wanwu（万物）用户需求文档 v1.0.docx](doc/Wanwu（万物）用户需求文档%20v1.0.docx) |
| 详细设计文档 | [doc/Wanwu（万物）详细设计文档 v1.0.docx](doc/Wanwu（万物）详细设计文档%20v1.0.docx) |

---

## 反馈与许可

问题与建议：[GitHub Issues](https://github.com/MonoKelvin/Wanwu/issues)

MIT © [MonoKelvin](https://github.com/MonoKelvin)
