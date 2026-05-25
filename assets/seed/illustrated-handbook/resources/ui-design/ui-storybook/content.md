# Storybook

Storybook 是开源的 **UI 组件开发与文档工作台**，由 Chroma（原 Storybook 团队）维护。开发者可为每个组件编写独立 **Story**（状态变体），在浏览器中隔离预览、交互测试与视觉回归，是 design:system 落地的事实标准工具。

![GitHub 标志（众多 design system 托管于 GitHub，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/320px-Octicons-mark-github.svg.png)


从读者角度，把「标准书描述」与「真实饲养体验」对照着看，更容易判断自己是否适合该主题：时间投入、预算、空间与家庭成员（老人、幼儿、其他宠物）都会改变答案。以下内容在常识基础上稍作延展，便于形成 3–5 分钟可读完的完整印象。

## 背景与历史

Storybook 2015 年随 React 生态兴起，原名「React Storybook」，后支持 Vue、Angular、Svelte、Web Components 等。6.x 引入 CSF（Component Story Format）3.0 与 Args 控件；7.x 统一 Vite/Webpack 构建；8.x 强化测试集成（Vitest、Playwright）与 **Component Testing** 工作流。Figma 插件与 **Storybook Connect** 推动设计稿与 Story 双向链接。

时间线与地域背景有助于理解它为何在特定年代走红，以及今日在收藏、实用或文化象征中的位置。


## UX 原则与产品影响

- **隔离开发**：无需启动完整 App 即可调 Button 的 loading/disabled 等边缘状态。
- **活文档**：Controls、Actions、Docs 页自动生成 prop 表，产品与设计可自助验收。
- **视觉回归**：Chromatic 等 SaaS 基于 Story 截图 diff，防止 CSS 意外破坏。
- **设计对齐**：Design Token 与 theme switcher 可在 Storybook 内演示浅色/深色/品牌主题。

Storybook 让「组件即产品」成为工程文化：每个 PR 可附带 Story 更新，降低 UI 债累积。

## 冷知识

- Storybook 吉祥物是「Storybook 宇宙」中的宇航员，社区 Conf 常发贴纸。
- `play` 函数可在 Story 内模拟用户点击序列，用于交互测试。
- 许多大厂对外开源 design system（如 GitHub Primer、Shopify Polaris）均提供官方 Storybook。

趣闻应可核对来源；若仅流传于社群梗，建议标注为「说法之一」以免误作史实。


## 参考与延伸阅读

- [Storybook 官网](https://storybook.js.org/)
- [Storybook 文档：编写 Stories](https://storybook.js.org/docs/writing-stories)
- [Chromatic 视觉测试](https://www.chromatic.com/)
