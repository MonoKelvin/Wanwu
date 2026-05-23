# Figma 转代码

「Figma 转代码」泛指将设计稿结构、样式与 Token **映射为前端实现**（React、Vue、SwiftUI、Compose 等）的流程与工具链。它介于完全手工还原与全自动代码生成之间，目标是减少重复劳动，同时保留工程师对语义 HTML、a11y 与性能的控制。

![Figma 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/320px-Figma-logo.svg.png)

![React 标志（常见输出目标，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/320px-React-icon.svg.png)

## 背景与历史

早期 Zeplin、Avocode 提供标注与资源导出；2019 年后 Anima、Locofy、Builder.io 等尝试 AI/规则驱动 codegen；Figma 官方 **Dev Mode**（2023）与 **Code Connect** 让组件在 Figma 内链到真实 repo 代码片段。社区工具 **html.to.design** 反向从网页导入 Figma，形成双向 bridge。

## UX 原则与产品影响

- **结构化设计**：Auto Layout、组件命名与 Token 绑定越好，生成代码越可维护。
- **语义优先**：自动 div  soup 需人工 refactor 为 `<button>`、landmark regions。
- **Design Token 管道**：Style Dictionary / Tokens Studio 导出 JSON → Tailwind theme，比逐页 export 更可持续。
- **验收标准**：像素 diff 不如「交互状态齐全 + 键盘可用」重要。

产品团队常采用 **80/20 规则**：布局与 spacing 工具辅助，业务逻辑与数据层仍手写。

## 冷知识

- Figma 的 REST API 可读取 node tree，许多 codegen 工具基于 JSON + 启发式 CSS。
- **Anatomy of a Figma component** 与 code component 1:1 映射是 Code Connect 的核心理念。
- shadcn/ui 反模式地「复制代码进 repo」，反而避开黑盒 codegen 的版本锁定问题。

## 参考与延伸阅读

- [Figma Dev Mode 文档](https://help.figma.com/hc/en-us/articles/15023124644247)
- [Figma Code Connect](https://www.figma.com/developers/code-connect)
- [Tokens Studio for Figma](https://tokens.studio/)
