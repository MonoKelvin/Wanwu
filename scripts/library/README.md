# 全库种子脚本

入口：`run.mjs`  
数据目录：`assets/seed/library/`（见 [items 说明](../../assets/seed/library/README.md)）

## 命令

| 步骤 | 命令 | 说明 |
|------|------|------|
| build | `npm run seed:library -- build` | 扫描 `items/` → `catalog.json` + `media.json` |
| media | `npm run seed:library -- media` | 按 `media.json` 下载配图到 `assets/library/` |
| retry | `npm run seed:library -- retry` | 缺图按 `retryQuery` 重试 |
| audit | `npm run seed:library -- audit` | 检查缺图 |
| import | `npm run seed:library:reimport` | 仅新增未入库的 `id` |
| update | `npm run seed:library -- update --id=<uuid>` | 强制更新指定条目 |
| info | `npm run seed:library -- info` | 统计 |

选项：`--force`、`--slug=`、`--category=`、`--full`（import 全量同步）

## lib/

| 文件 | 职责 |
|------|------|
| `items.mjs` | 读取 `items/{分类}/*.json` 并组装 catalog 条目 |
| `seed-utils.mjs` | 描述格式化、合并 attribution、media 兜底 |
| `stable-id.mjs` | slug → 稳定 UUID |
| `pipeline-build.mjs` | build 流水线 |
| `pipeline-media.mjs` / `pipeline-audit.mjs` | 配图下载与检查 |
| `media-*.mjs` / `pixabay-api.mjs` | 配图提供商 |

`reimport-catalog.ts`：在 Electron 上下文中执行入库（供 import / update 调用）。
