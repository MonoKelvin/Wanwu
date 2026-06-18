# Wanwu 通用文档压缩包（Document Package）

## 目标

- 底层：**通用文档包**，支持条目级读写、增量保存、完整性校验、可选加解密
- 上层：按业务映射条目（如流程图 `.wfg`）
- 容器：ZIP（deflate），单文件便携；工作区可用**目录包**实现真正的按条目落盘

## 格式标识

| 字段 | 值 |
|------|-----|
| `format` | `wanwu-document-package` |
| `formatVersion` | `1` |
| 流程图扩展名 | `.wfg` |
| 通用扩展名 | `.wwpkg` |

## 包内结构

```
manifest.json          # 必填：元数据 + 条目清单（path / size / sha256）
content/               # 业务主内容（JSON 等）
assets/                # 图片、图标等二进制
```

### manifest.json 要点

- `docType`：`flow-graph` | `generic`
- `docId`、`title`、`createdAt`、`modifiedAt`
- `encryption`：可选 AES-256-GCM（PBKDF2 派生密钥，按条目加密后写入 zip）
- `entries[]`：每个条目的 `path`、`mediaType`、`size`、`sha256`

## 流程图（.wfg）条目约定

| 路径 | 说明 |
|------|------|
| `content/meta.json` | 引擎、标题、默认页 ID（`formatVersion: 2`） |
| `content/pages/{pageId}.json` | 单页图数据，支持按页增量保存 |
| `assets/{assetId}.{ext}` | 内嵌图片/图标 |

内存中仍组装为 `DiagramContent`；落盘时拆分为多文件。

## 架构分层

```
┌─────────────────────────────────────┐
│  WfgDiagramDocument（流程图文件流）   │
├─────────────────────────────────────┤
│  WanwuDocumentPackage（通用文档类）   │
│  - setEntry / getEntry / dirty      │
│  - verify() / materializeForWrite   │
├─────────────────────────────────────┤
│  fsStore（目录包，增量写）            │
│  zipStore（.wfg / .wwpkg 单文件）    │
└─────────────────────────────────────┘
```

## 增量保存策略

- **目录工作区**（`diagrams/{fileId}/`）：仅 `saveDirtyEntriesToFolder` 写入变更条目 + `manifest.json`
- **单文件 .wfg**：修改在内存中标记 dirty；`savePackageToZip` 时重建 zip（条目来自内存，体积可控）

## 加解密

- 算法：AES-256-GCM
- 密钥：PBKDF2-SHA256（120000 次）+ 随机 salt（写在 manifest）
- 加密粒度：单条目（加密后 JSON 包装 `iv` / `authTag` / `ciphertext`）

## 校验

`verify()` 对比 manifest 中 `size`、`sha256` 与内存条目；并报告未登记条目。

## 代码位置

- 共享类型与接口：`src/shared/documentPackage/`
- Node 实现（通用类、目录/ZIP 存储）：`src/shared/documentPackage/node/`
- 流程图适配：`src/modules/library/diagrams/main/service/wfgDiagramDocument.ts`

## 自测

验证脚本待统一补充（见后续 `scripts/verify-*`）。

## 迁移

- 旧版 `content.json`（`formatVersion: 1`）只读兼容
- 下次写入自动转为目录包布局（`manifest.json` + `content/`）
