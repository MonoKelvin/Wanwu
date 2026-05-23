# 项目文档索引

按职责分类，便于持续维护。历史 Word 文档保留原内容，新变更以 Markdown 为主。

## 目录结构

| 目录 | 说明 |
|------|------|
| [requirements/](requirements/) | 需求说明（产品范围、用户场景） |
| [design/](design/) | 详细设计、数据与模块设计 |
| [optimization/](optimization/) | 版本发布说明、性能与打包优化计划 |
| [guidelines/](guidelines/) | 编码与内容编写规范 |

## 文档清单

### 需求

| 文档 | 说明 |
|------|------|
| [software-requirements-v1.0.txt](requirements/software-requirements-v1.0.txt) | 软件需求说明（v1.0） |
| [user-requirements-v1.0.docx](requirements/user-requirements-v1.0.docx) | 用户需求文档（v1.0） |
| [user-requirements-v1.1-cloud-abode.docx](requirements/user-requirements-v1.1-cloud-abode.docx) | **云斋模块用户需求（v1.1）** |
| [software-requirements-v1.1.txt](requirements/software-requirements-v1.1.txt) | 云斋 v1.1 需求摘要（txt） |

### 设计

| 文档 | 说明 |
|------|------|
| [detailed-design-v1.0.docx](design/detailed-design-v1.0.docx) | 详细设计文档（v1.0） |
| [technical-design-v1.1-cloud-abode.docx](design/technical-design-v1.1-cloud-abode.docx) | **云斋模块技术设计（v1.1，含 SU7 逆向附录）** |
| [su7-reverse-engineering.md](design/su7-reverse-engineering.md) | **gamemcu SU7 深度逆向分析（Markdown 详版）** |
| [cloud-abode-development-plan.md](design/cloud-abode-development-plan.md) | **云斋开发计划（定稿，含里程碑与验收清单）** |
| [library-catalog-supplement-v7.docx](design/library-catalog-supplement-v7.docx) | 全库条目补充说明（v7） |

### 优化

| 文档 | 说明 |
|------|------|
| [release-v1.1.md](optimization/release-v1.1.md) | **v1.1 已实现变更** |
| [roadmap-performance-packaging.md](optimization/roadmap-performance-packaging.md) | 性能与安装包体积优化路线图 |

### 编码指导

| 文档 | 说明 |
|------|------|
| [content-md-guidelines.md](guidelines/content-md-guidelines.md) | 全库 `content.md` 与种子 JSON 维护规范 |

## 相关仓库文档

- 根目录 [README.md](../README.md) — 用户与开发者入门
- [pack/windows/README.md](../pack/windows/README.md) — Windows 安装包
- [electron/services/README.md](../electron/services/README.md) — 主进程服务模块
- [assets/seed/library/README.md](../assets/seed/library/README.md) — 图鉴种子数据
