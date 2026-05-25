# Radix UI

Radix UI 是由 WorkOS 团队维护的 **React 无样式、可访问性优先** 组件原语（Primitives）库。它提供 Dialog、Dropdown、Tooltip、Accordion 等组件的**行为、焦点管理与 WAI-ARIA 语义**，而把视觉完全交给消费者——这正是 shadcn/ui、Park UI 等现代组件集的基础。

![React 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/320px-React-icon.svg.png)


从读者角度，把「标准书描述」与「真实饲养体验」对照着看，更容易判断自己是否适合该主题：时间投入、预算、空间与家庭成员（老人、幼儿、其他宠物）都会改变答案。以下内容在常识基础上稍作延展，便于形成 3–5 分钟可读完的完整印象。

## 背景与历史

Radix 前身 Modulz（设计工具公司）在 2020 年前后开源 Primitives，后团队转型 WorkOS 仍持续维护。与 Reach UI、Headless UI 同期，Radix 以**更细粒度组合 API**（如 `Dialog.Root` / `Trigger` / `Content`）与严格的 a11y 测试著称。2023 年起 shadcn/ui 爆火，Radix 成为默认交互层，npm 下载量激增。

时间线与地域背景有助于理解它为何在特定年代走红，以及今日在收藏、实用或文化象征中的位置。


## UX 原则与产品影响

- **可访问性内置**：焦点陷阱、Esc 关闭、Portal 渲染、屏幕阅读器标签由库保证。
- **无样式**：开发者用 Tailwind 或 CSS Modules 自由造型，避免「换肤 wars」。
- **组合优于配置**：Compound Components 模式让复杂交互（嵌套 Menu、Context Menu）可声明式拼装。
- **与 Design System 协同**：设计 Token + Radix 行为 + Storybook 文档，成为 headless 时代标准栈。

Radix 降低了「自己写 Modal 焦点管理」的重复劳动，但也要求团队理解 WAI-ARIA 概念，否则易出现样式对但语义错的问题。

## 冷知识

- Radix 名称来自拉丁语「根、根源」，强调底层原语定位。
- 每个 Primitive 附带 extensive 文档说明 keyboard interaction 与 aria 属性映射。
- `@radix-ui/react-icons` 提供与组件风格一致的开源图标集。

趣闻应可核对来源；若仅流传于社群梗，建议标注为「说法之一」以免误作史实。


## 参考与延伸阅读

- [Radix UI 官网](https://www.radix-ui.com/)
- [Radix Primitives GitHub](https://github.com/radix-ui/primitives)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
