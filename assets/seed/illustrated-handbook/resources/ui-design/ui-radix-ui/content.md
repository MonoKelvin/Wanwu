# Radix UI

Radix UI 是 WorkOS 维护的 React headless 组件原语库，提供 Dialog、DropdownMenu、Popover、Tooltip 等 accessibility 与 keyboard behavior，无内置样式。shadcn/ui、Park UI、Mantine 部分底层采用 Radix primitives，是 modern component stack 的关键层。

![Radix UI Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/640px-React-icon.svg.png)

## 设计师与品牌

WorkOS（原 Modulz 团队）维护；GitHub radix-ui/primitives。MIT 许可。与 React Aria（Adobe）、Headless UI（Tailwind Labs）并列 headless 方案。shadcn/ui 默认 `@radix-ui/react-*` 包组合 Tailwind 样式。

## 设计亮点

WAI-ARIA Authoring Practices 实现：focus trap in Dialog、roving tabindex in Menu、typeahead select。Compound components：`Dialog.Root`、`Trigger`、`Content`、`Close`。Portal 渲染 overlay 避免 z-index 与 overflow 问题。Unstyled：dev 完全控 CSS，适配 design token。Consistent API：`open`/`onOpenChange` controlled pattern。Positioning 用 Popper/Floating UI 逻辑内建。

## 使用体验

Install：`npm i @radix-ui/react-dialog`。Wrap custom button as Trigger；style Content with Tailwind `fixed inset-0 z-50`。Read docs 每 primitive anatomy。Upgrade major 读 migration；API 相对稳定。Test keyboard：Tab、Escape、Arrow keys。SSR：注意 id hydration，Next.js app router 兼容。

## 文化影响

Radix + Tailwind + shadcn 成为 2023–2025 React greenfield 默认 triad，替代部分 MUI/Chakra 全包 styled 方案。Design system 团队拆「behavior layer（Radix）+ theme layer（Tailwind）」职责。中文社区教程大量 shadcn 中文文档降低 adoption 门槛。

## 参考与延伸阅读

- [Radix UI 文档](https://www.radix-ui.com/primitives)
- [GitHub：radix-ui/primitives](https://github.com/radix-ui/primitives)
- [shadcn/ui](https://ui.shadcn.com/)
