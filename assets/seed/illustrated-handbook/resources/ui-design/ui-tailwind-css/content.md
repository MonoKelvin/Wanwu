# Tailwind CSS

Tailwind CSS 是 utility-first CSS 框架，通过在 markup 中组合原子类快速构建界面，由 Tailwind Labs 的 Adam Wathan 与 Steve Schoger 推广。v4 采用 Rust 编写的 Oxide 引擎，以 `@import "tailwindcss"` 与 CSS-first 配置取代 PostCSS 为主的 v3 工作流。

![Tailwind CSS Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Tailwind_CSS_Logo.svg/640px-Tailwind_CSS_Logo.svg.png)

## 设计师与品牌

Tailwind Labs 同时维护 Headless UI、Heroicons 与 Tailwind UI 付费模板。开源核心 MIT；商业 Tailwind Plus 提供 component 与 template。与 Vercel、Laravel、Rails 官方文档集成。竞品 UnoCSS、Open Props 走 lighter 路线。

## 设计亮点

Utility namespace：`flex`、`grid`、`p-4`、`text-muted-foreground`（配合 shadcn token）。State variants：`hover:`、`focus-visible:`、`dark:`、`md:`。v4 `@theme` block 定义 color、font、breakpoint 为 CSS variables。 `@layer components` 抽重复 pattern。Just-in-Time 编译未使用 class 不进入 bundle。Plugin：typography、forms、aspect-ratio、container-queries。

## 使用体验

Next.js：`@tailwindcss/postcss` 或 Vite plugin。IntelliSense 扩展 autocomplete class。Debug：`outline outline-red-500` 查 layout。Preflight reset 类似 normalize；与 UI 库合注意 button 样式 reset。Production `@tailwindcss/cli -m` minify。Design token 同步：Tokens Studio → Tailwind config JSON。

## 文化影响

Tailwind 占 2024 State of CSS utility 使用率前列；shadcn/ui、Vercel marketing site 强化「Tailwind aesthetic」： tight spacing、gray-50 bg、subtle border。争议「HTML 乱」vs「shipping speed」持续；industry 倾向 component 封装化解。中国 Vue 项目 UnoCSS/Tailwind 并存于 Vite 生态。

## 参考与延伸阅读

- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [GitHub：tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss)
- [Tailwind UI](https://tailwindui.com/)
