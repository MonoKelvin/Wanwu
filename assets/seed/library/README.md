# 全库种子数据

```
library/
  items/              # 源数据：按大类分子目录，每物品一个 JSON
  categories.json     # 分类与细分类定义
  catalog.json        # 构建产物
  media.json          # 配图检索配置
```

每个物品资源目录（运行时）：

```
assets/library/{categoryId}/{mediaDir}/
  cover.jpg           # 封面（必须有效，≥约 2.5KB）
  gallery-01.jpg …    # 画廊（有几张用几张，可少于上限）
  content.md          # 详情正文（界面优先加载此文件）
```

## items/ 字段

| 字段 | 说明 |
|------|------|
| `id` | 稳定 UUID |
| `slug` / `subCategoryId` | 标识与细分类 |
| `name` / `summary` | 列表展示 |
| `description` | 种子摘要；有 `content.md` 时界面以 Markdown 为准 |
| `media` | Pixabay 参数；`imageCount` 为尝试上限（默认 8，最多 12） |

## 维护流程

```bash
npm run seed:library -- cleanup          # 删除占位小图
npm run seed:library -- improve-queries
npm run seed:library -- build
npm run seed:library -- media --force --concurrency=12
npm run seed:library -- fetch-content --concurrency=4
npm run seed:library -- dedupe-local
npm run seed:library:reimport -- --full
```

脚本说明见 [scripts/library/README.md](../../../scripts/library/README.md)。
