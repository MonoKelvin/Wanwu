# 脚本目录

## 日常开发

| 文件 | 说明 |
|------|------|
| `check-node.mjs` | Node 版本检查（`npm run dev`） |
| `ensure-renderer-fallback.mjs` | Windows 开发备用 renderer |

## 全库数据与配图

统一入口 **[library/run.mjs](./library/run.mjs)**，数据配置在 **[assets/seed/library/items/](../assets/seed/library/items/)**。

```bash
npm run seed:library -- build    # 生成 catalog + media
npm run seed:library -- media    # 下载配图
npm run seed:library -- audit
```

详见 [library/README.md](./library/README.md)。

## 其它

| 文件 | 说明 |
|------|------|
| `probe-rss-feeds.mjs` | 探测 RSS 源可达性 |
