# 全库种子脚本

入口：`run.mjs`  
数据目录：`assets/seed/library/`（见 [items 说明](../../assets/seed/library/README.md)）

## 命令

| 步骤 | 命令 | 说明 |
|------|------|------|
| build | `npm run seed:library -- build` | 扫描 `items/` → `catalog.json` + `media.json` |
| media | `npm run seed:library -- media` | 并行下载配图（`--concurrency=10`） |
| retry | `npm run seed:library -- retry` | 缺图按 `retryQuery` 重试 |
| audit | `npm run seed:library -- audit` | 检查缺图 |
| cleanup | `npm run seed:library -- cleanup` | 删除占位小图与 mediaTodo |
| fetch-content | `npm run seed:library -- fetch-content` | 百度百科 → `content.md` |
| assign-subs | `npm run seed:library -- assign-subs` | 按规则细化二级分类 |
| improve-queries | `npm run seed:library -- improve-queries` | 优化 Pixabay 搜索词 |
| media-quality | `npm run seed:library -- media-quality` | 配图质量摘要 |
| curate | `npm run seed:library -- curate --force` | 同 `media --force` |
| dedupe-local | `npm run seed:library -- dedupe-local` | 删除条内 MD5 重复文件 |
| import | `npm run seed:library:reimport` | 仅新增未入库的 `id` |
| update | `npm run seed:library -- update --id=<uuid>` | 强制更新指定条目 |
| info | `npm run seed:library -- info` | 统计 |

选项：`--force`、`--slug=`、`--category=`、`--concurrency=`、`--limit=`、`--full`

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
