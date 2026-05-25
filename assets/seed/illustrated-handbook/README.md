# 图鉴种子数据

```
assets/seed/illustrated-handbook/
  items/              # 每物品一个 JSON
  categories.json     # 分类定义
  resources/          # 配图与 content.md（按大类/条目目录）
```

条目资源目录示例：

```
resources/{categoryId}/{mediaDir}/
  cover.jpg
  gallery-01.jpg …
  content.md
```

## items/ 字段

| 字段 | 说明 |
|------|------|
| `id` | 稳定 UUID |
| `slug` / `subCategoryId` | 标识与细分类 |
| `name` / `summary` | 列表展示 |
| `contentFile` | 媒体路径 `illustrated-handbook/{category}/{dir}/content.md` |
| `specs` | 规格参数 |
| `tags` / `media` | 标签与配图检索参数 |

维护时编辑 `items/` 下 JSON 与 `resources/` 中对应目录；`npm run build` 会打包进 `library-data-pack.zip`。

## 发布前

```bash
npm run build
```

应用首次启动解压数据包；种子未变更时跳过重复入库。
