# shadcn/ui

shadcn/ui 是 shadcn（Vercel）推广的 **可复制组件代码模式**——非传统 npm 包，而是通过 CLI 将基于 **Radix UI + Tailwind CSS** 的组件源码写入你的 repo，你拥有全部修改权。2023 年起爆火，成为 Next.js 生态默认 UI 起点之一。

![React 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/320px-React-icon.svg.png)

![Tailwind CSS 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Tailwind_CSS_Logo.svg/320px-Tailwind_CSS_Logo.svg.png)

## 背景与历史

2023 年 3 月 shadcn 发布 ui.shadcn.com，主张「Open Code、Composition、Distribution」；组件包括 Button、Dialog、Data Table 等，样式用 Tailwind + CSS variables 实现 theme。与 **tweakcn、Magic UI** 等衍生生态共同构成「new default stack」：Next.js + shadcn + Vercel。2024 年扩展 blocks、charts 与 registry 自定义源。

## UX 原则与产品影响

- **所有权**：源码在项目中，无黑盒版本锁定；可任意改 a11y 与 branding。
- **一致性**：`cn()` utility 合并 class；`components.json` 统一 alias 与 Tailwind 配置。
- **Radix 行为**：Dialog、Dropdown 等交互层可靠，团队专注 visual polish。
- **文档即营销**：站点本身即精美 demo，降低 adoption friction。

shadcn/ui 改变了「装 dependency」习惯，转向 **vendor components into codebase**；企业需建立 internal registry 避免 20 个 fork 的 Button。

## 冷知识

- 「shadcn」是作者 Discord/Twitter handle，非公司品牌名。
- `npx shadcn@latest init` 会检测 Next.js、Vite、Remix 等框架自动配置。
- Data Table 基于 TanStack Table，是 admin UI 最难组件之一的社区标准答案。

## 参考与延伸阅读

- [shadcn/ui 官网](https://ui.shadcn.com/)
- [shadcn/ui GitHub](https://github.com/shadcn-ui/ui)
- [Radix UI](https://www.radix-ui.com/)
