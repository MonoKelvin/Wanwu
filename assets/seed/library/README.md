# 全库种子数据

```
library/
  items/              # 源数据：按大类分子目录，每物品一个 JSON
  categories.json     # 分类与细分类定义
  catalog.json        # 构建产物（npm run seed:library -- build）
  media.json          # 配图检索配置（build 生成，media 步骤使用）
```

## items/ 结构

```
items/
  cat/
    _defaults.json              # 可选：该分类配图默认参数
    cat-british-shorthair.json  # 文件名建议与 slug 一致
  dog/
  ...
  _schema.example.json          # 字段示例
```

| 字段 | 说明 |
|------|------|
| `id` | 全库唯一稳定 UUID |
| `slug` | 如 `cat-british-shorthair` |
| `subCategoryId` | 细分类 id（见 `categories.json`） |
| `name` / `summary` / `description` | 展示文案 |
| `media` | Pixabay 等搜索参数（可继承 `_defaults.json`） |

## 维护流程

```bash
npm run seed:library -- build
npm run seed:library -- media
npm run seed:library:reimport
```

修改已有条目入库：`npm run seed:library -- update --id=<uuid>`

脚本说明见 [scripts/library/README.md](../../../scripts/library/README.md)。
