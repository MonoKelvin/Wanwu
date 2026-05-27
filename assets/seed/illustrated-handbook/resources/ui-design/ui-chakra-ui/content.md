# Chakra UI

Chakra UI 是 Segun Adebayo 创建的 React 组件库，以 Style props（如 `<Box p={4} bg="gray.50">`）、内置 dark mode 与 accessibility 默认值著称。2024 年 major v3 迁移至 Ark UI + Panda CSS 架构，拆分 headless 与 styling 层。

![Chakra UI 组件示例概念图](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/640px-React-icon.svg.png)

## 设计师与品牌

Chakra UI 由 Chakra UI SAS 团队维护；GitHub chakra-ui/chakra-ui。v2 长期服务 SaaS 与 startup dashboard；v3 引入 @chakra-ui/react 新 package 结构与 recipes。竞品含 Mantine、MUI、Radix+Tailwind（shadcn）。文档 chakra-ui.com 提供 patterns 与 migration guide。

## 设计亮点

Style props 映射 theme token，减少 CSS 文件切换。Default theme 含 semantic tokens：colors.gray、fontSizes、space scale。组件 Compound pattern：Modal、Menu、Tabs 拆 subcomponents。v3 基于 Ark UI 提供 headless state machine；Panda CSS 生成 atomic styles。FormControl 自动 wire label、helperText、errorMessage id。Color mode 通过 ColorModeProvider 与 useColorMode 切换。

## 使用体验

v2：`npm i @chakra-ui/react @emotion/react`。v3 migration 需重写 theme 为 recipes/slot recipes，Breaking changes 较多。与 React Hook Form、TanStack Query 组合常见。Bundle size 大于纯 Tailwind，小于部分 MUI 全量。TS 支持 props autocomplete。Storybook 展示 component variants 方便 design QA。

## 文化影响

Chakra 在 2020–2023 年 React 生态与 Supabase、Firebase tutorial 高频出现，代表「快速美观 dashboard」路线。v3 架构转变反映 industry 向 headless + CSS engine 迁移（类似 Radix + Tailwind）。设计系统讨论中，Chakra 常用于对比「token 驱动 style props」与「utility class」 ergonomics。

## 参考与延伸阅读

- [Chakra UI v3 文档](https://www.chakra-ui.com/)
- [GitHub：chakra-ui/chakra-ui](https://github.com/chakra-ui/chakra-ui)
- [Ark UI（Chakra v3 基础）](https://ark-ui.com/)
