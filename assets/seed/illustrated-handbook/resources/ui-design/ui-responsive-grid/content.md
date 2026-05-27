# 响应式栅格

响应式栅格（Responsive Grid）是 Web 布局基础：Ethan Marcotte 2010 年提出 responsive web design，结合 fluid grid、flexible media 与 media queries。今日 CSS Grid、Flexbox 与 Container Queries 构成 modern layout stack，Breakpoint 常用 640/768/1024/1280 px（Tailwind 默认）。

![响应式网页布局示意](https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/CSS3_logo_and_wordmark.svg/640px-CSS3_logo_and_wordmark.svg.png)

## 设计师与品牌

W3C CSS Grid Layout、Flexbox 规范；Bootstrap 12-column、Material Design responsive layout guidelines。Tailwind `sm/md/lg/xl/2xl` breakpoint。Figma Auto Layout + constraints 模拟 reflow。

## 设计亮点

Mobile-first：base style 小屏，`min-width` query 逐级增强。Grid：`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` 自适应 card。Flex：`flex-wrap` + `gap` 替代 float。Container Queries `@container (min-width: 400px)` 组件级响应，解耦 viewport。Aspect-ratio、clamp() typography  fluid scale。Avoid horizontal scroll；touch target 44px。

## 使用体验

Design handoff 标注 breakpoint behavior 非仅 desktop 稿。DevTools device mode test rotation。Real device 测 iOS Safari 100vh、address bar issue。Tailwind：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`。Print stylesheet 别忘。Performance：responsive image `srcset` + `sizes`。

## 文化影响

Responsive 从 best practice 变为 baseline；Google mobile-first indexing 强化 SEO 需求。Container Queries 2023+ browser 全面支持开启 component-driven era。中国移动端 traffic 占比高，many site 直接 mobile-only design desktop 次要。

## 参考与延伸阅读

- [MDN：CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- [MDN：Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [Ethan Marcotte：Responsive Web Design](https://alistapart.com/article/responsive-web-design/)
