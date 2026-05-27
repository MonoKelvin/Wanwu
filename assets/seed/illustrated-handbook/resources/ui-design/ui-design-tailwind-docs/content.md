# Tailwind CSS

Tailwind CSS 是 Tailwind Labs（Adam Wathan、Steve Schoger）开发的 utility-first CSS 框架。通过在 HTML/JSX 中组合原子类（如 `flex gap-4 text-sm`）实现界面，JIT 引擎按需生成 CSS；v4 改用 Oxide engine 与 CSS-first `@theme` 配置。

![Tailwind CSS Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Tailwind_CSS_Logo.svg/640px-Tailwind_CSS_Logo.svg.png)

## 设计师与品牌

Tailwind Labs 同时维护 Headless UI、Heroicons、Tailwind UI 模板。文档 tailwindcss.com v4 重写安装为 `@import "tailwindcss"`。生态：shadcn/ui、DaisyUI、Flowbite、Tailwind Plus。与 PostCSS、Vite、Next.js 深度集成。

## 设计亮点

Utility classes 覆盖 layout、spacing、color、typography、state（hover、focus-visible、dark:）。`@theme` 定义 design token 映射 CSS variables。JIT 扫描 content paths，purge 未用 class。Plugin API 扩展 typography（prose）、forms、container queries `@container`。Responsive：`sm:` `md:` `lg:` breakpoint prefix。Arbitrary values：`w-[137px]`  escape hatch。

## 使用体验

安装：`npm i tailwindcss @tailwindcss/vite`（v4）。配合 clsx/cn（tailwind-merge）合并 conditional class。Designer 可用 Figma Tailwind plugin 对齐 spacing scale。Learning：记 utility 名初期慢，熟练后 iteration 极快。Critique：markup 冗长 → 抽 component 或 @apply 局部。Production bundle 小因 purge。

## 文化影响

Tailwind 与 Bootstrap 路线之争定义 2020s frontend styling。Vercel、Linear、GitHub 新页广泛采用；shadcn 模式依赖 Tailwind token。中国 Vue 生态有 UnoCSS 等受启发方案。设计教育讨论「designer 是否需学 Tailwind」——token 命名成为 design-dev 共同语言。

## 参考与延伸阅读

- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [GitHub：tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss)
- [Headless UI](https://headlessui.com/)
