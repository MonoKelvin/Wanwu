# 性能与安装包体积优化路线图

基于 v1.1 代码审查结论，分阶段实施。完成一项可在对应条目前打 `[x]`。

## Phase 1 — 启动与列表（P0，进行中）

| 状态 | 项 | 说明 |
|------|-----|------|
| [x] | 图鉴 zip 探测不 `mkdir` | `getWanwuDataDirectory()` |
| [x] | 未选图鉴包不扫 `assets/packed` | `discoverLibraryPackZip()` |
| [x] | **列表 IPC 轻量模式** | `listItems` 不读 `content.md`、不 `readdir` 扫封面、不加载 gallery |
| [x] | **启动通知不阻塞** | `getStartupNotices` 立即返回；bootstrap 完成后 `app:startup-notice` 推送 |
| [x] | 详情页按需加载正文 | 列表 `description`/`gallery` 为空，详情 `getItem` 全量 |

### 验收

- 切换含 100+ 条目的分类，IPC 耗时显著下降（目标 &lt; 200ms 量级，视磁盘而定）。
- 冷启动窗口出现不等待图鉴 zip 解压完成。

## Phase 2 — 安装包体积（P0）

| 状态 | 项 | 预估节省 | 说明 |
|------|-----|----------|------|
| [x] | 收紧 `asarUnpack` 仅 `*.node` | 5–15 MB | 避免解包 better-sqlite3 源码与 build 中间文件 |
| [x] | 裁剪 `locales` 仅 `zh-CN` + `en-US` | 30–40 MB | `afterPack` 脚本 |
| [x] | 排除 node_modules 内 test/docs | 1–3 MB | `builder.json` files 规则 |
| [x] | 审查 `electron-native-share` 多平台 prebuild | 1–5 MB | `after-pack.mjs` 仅保留 win32-x64 |

### 合规

- 保留各依赖 `LICENSE` / `NOTICE`，不删除第三方版权声明。

## Phase 3 — 数据层与搜索（P1）

| 状态 | 项 | 说明 |
|------|-----|------|
| [x] | 收藏列表批量查询 | 消除 N+1 `getItem` |
| [x] | `getItem(id)` 索引 | 内存 `itemCategoryCache`（列表/收藏预热） |
| [ ] | FTS5 搜索 | 替代多库 `LIKE '%term%'` |
| [ ] | 图鉴网格虚拟滚动 | `@tanstack/vue-virtual` 或等价方案 |

## Phase 4 — 媒体与 I/O（P1–P2）

| 状态 | 项 | 说明 |
|------|-----|------|
| [x] | `wanwu-media` 流式响应 | `createReadStream` 替代整文件 `readFile` |
| [ ] | 列表缩略图 | 构建 pack 时生成 `cover-thumb.webp` |
| [ ] | 图鉴 zip 解压 Worker | `worker_threads` 或独立子进程，降低主进程卡顿 |
| [x] | `html2canvas` 动态 import | 仅长图导出时加载 |

## Phase 5 — 依赖精简（P2）

| 状态 | 项 | 说明 |
|------|-----|------|
| [ ] | `archiver` 仅备份使用 | 评估更轻量 zip 库（需保留 MIT/兼容许可） |
| [ ] | Lucide 单一路径 | 统一 `@lucide/vue` 或 `lucide-vue-next` |
| [ ] | PrimeVue 按需与 tree-shaking 审计 | 构建产物分析 |

## 跟踪

- 版本发布说明：[release-v1.1.md](release-v1.1.md)
- 打包配置：[pack/windows/builder.json](../../pack/windows/builder.json)
