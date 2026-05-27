# Storybook

Storybook 是 JavaScript UI 组件隔离开发与文档工具，2015 年由 Brad Frost 等推动的 component-driven 开发产物。开发者在 Storybook 中编写 Story（组件各 state），供 design QA、visual regression 与 onboarding，Chromatic 提供 hosted visual test 服务。

![Storybook Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Storybook_icon.svg/640px-Storybook_icon.svg.png)

## 设计师与品牌

Chroma Software 维护开源 Storybook；MIT。支持 React、Vue、Angular、Svelte、Web Components。Addons：a11y、controls、actions、viewport、measure、design（Figma embed）。Storybook 8+ 改进 Vite builder 与 test runner。

## 设计亮点

Story CSF3：`export default { component: Button } satisfies Meta; export const Primary: Story = { args: { variant: 'primary' } }`。Controls 动态调 props 无需改 code。Docs autodocs 从 TypeScript types 生成 prop table。Viewport addon 测 responsive breakpoint。A11y addon 跑 axe 在 story mount。Composition：render story inside Card layout 测 context。

## 使用体验

Setup：`npx storybook@latest init` 检测 framework。CI：Chromatic `npx chromatic --project-token` 抓 pixel diff。Design handoff：embed Figma in Docs panel。Monorepo：storybook 在 packages/ui 独立 dev script。Performance：lazy load heavy stories；mock API in decorator。

## 文化影响

Storybook 成为 design system team 标配；「no story no merge」rule 流行。与 Figma Code Connect 互补：design component id 链 code story。中国大厂内部 design platform 常 fork Storybook 或自研类似工具。Critique：story maintenance drift  from production；需 discipline 保持 sync。

## 参考与延伸阅读

- [Storybook 文档](https://storybook.js.org/docs)
- [Chromatic visual testing](https://www.chromatic.com/)
- [Component Story Format 3](https://storybook.js.org/docs/api/csf)
