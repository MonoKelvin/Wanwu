# 全库种子数据

```
library/
  items/            # 源数据：按大类分子目录，每物品一个 JSON
  categories.json   # 分类与细分类定义
```

每个物品资源目录：

```
assets/library/{categoryId}/{mediaDir}/
  cover.jpg
  gallery-01.jpg …
  content.md          # 详情正文（界面优先加载）
```

## items/ 字段

| 字段 | 说明 |
|------|------|
| `id` | 稳定 UUID |
| `slug` / `subCategoryId` | 标识与细分类 |
| `name` / `summary` | 列表展示 |
| `contentFile` | 相对路径，指向 `assets/library/.../content.md` |
| `specs` | 规格参数（详情页右栏） |
| `tags` / `media` | 标签与配图检索参数 |

维护条目时直接编辑 `items/` 下 JSON 与 `content.md`；构建时会扫描 items 并发现 `assets/library` 中的配图。

## 发布前

```bash
npm run build   # 含数据包生成，产出 assets/packed/library-data-pack.zip
```

应用打包后首次启动会解压该数据包；种子未变更时自动跳过重复入库。
