# Wanwu v1.2.0 发布说明

## 新增：全库流程图模块

- 全库侧栏新增 **流程图** 大分类（位于链接与图鉴之间）
- 系统分组：首页、草稿、文件、回收站；支持用户自定义分组
- LogicFlow 矢量画布：基础图元、连线、撤销/重做、网格吸附
- 单文件多页：页签切换，切页 flush 当前页 graph
- 命令化架构：`DiagramCommandBus` 统一 UI / 快捷键 / `executeCommands` API
- 持久化：`library_diagrams.sqlite` + `media/diagrams/{id}/content.json`
- 导出：当前页 PNG / SVG（Snapshot 扩展）
- 自动保存：debounce 1500ms（仅已持久化文件）

## 开发者 API

```ts
await window.wanwu.diagrams.executeCommands([
  { type: 'folder.list' },
  { type: 'file.create', payload: { folderId: 'dg-files', title: '验收流程图' } }
])
```

画布/页面/文档类命令需在编辑器页活跃 Session 下执行。

## 备份

流程图数据纳入万物数据目录整体备份（`db/library_diagrams.sqlite` 与 `media/diagrams/`）。
