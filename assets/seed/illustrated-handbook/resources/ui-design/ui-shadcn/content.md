# shadcn/ui

shadcn/ui 是 shadcn（Vercel）创建的 React UI 模式：非 npm 组件库，而是通过 CLI 将 Radix UI primitives + Tailwind CSS 源码复制到项目中，开发者完全拥有并可修改。2023 起与 Next.js App Router、Tailwind v4 深度整合，成为 modern web app 默认 UI 起点之一。

![shadcn/ui 与 Tailwind 生态](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Tailwind_CSS_Logo.svg/640px-Tailwind_CSS_Logo.svg.png)

## 设计师与品牌

shadcn 个人维护，MIT；站点 ui.shadcn.com。依赖 Radix UI、Tailwind、class-variance-authority（cva）、tailwind-merge（cn  helper）。Vercel v0 生成 code 常基于 shadcn 组件。Blocks 提供 dashboard、login、sidebar 完整 section。

## 设计亮点

Copy-paste ownership：改 `components/ui/button.tsx` 无 fork upstream 负担。Variants：`buttonVariants({ variant: 'outline', size: 'sm' })` cva 类型安全。Theming：CSS variables `--primary`、`--radius` in globals.css；dark class toggle。Composition：Card、Dialog、Form（react-hook-form + zod）patterns 文档化。Charts 集成 Recharts；Sonner toast。Registry JSON 支持 monorepo `@workspace/ui`。

## 使用体验

Init：`npx shadcn@latest init` 选 Next/Vite/Remix。Add：`npx shadcn@latest add button dialog`。Tailwind v4 用 `@tailwindcss/vite`。Customize radius/spacing 改 theme 即可全局生效。Upgrade component：re-run add --overwrite 或 manual diff。Storybook 可选 wrap each ui component。

## 文化影响

shadcn 改变「install MUI 即用」习惯，强调 design engineer ownership。GitHub star 与 Twitter 病毒传播；中国开发者社区大量中文 shadcn 教程。Critique：multiple project 难统一 update；defenders 称 business logic 本就该 local fork。

## 参考与延伸阅读

- [shadcn/ui 文档](https://ui.shadcn.com/)
- [GitHub：shadcn-ui/ui](https://github.com/shadcn-ui/ui)
- [Radix UI Primitives](https://www.radix-ui.com/)
