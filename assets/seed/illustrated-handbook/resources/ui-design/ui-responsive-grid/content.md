# 响应式栅格

响应式栅格（Responsive Grid）是 Web 布局核心：通过 **断点（breakpoints）、流式列宽与 gap**，让界面在手机、平板与桌面间优雅 reflow。CSS **Grid** 与 **Flexbox** 取代 float 时代后，**容器查询（container queries）** 进一步让组件根据父容器而非 viewport 适配。

![HTML5 标志（Web 布局基础，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/HTML5_logo_and_wordmark.svg/320px-HTML5_logo_and_wordmark.svg.png)

## 背景与历史

Ethan Marcotte 2010 年提出 Responsive Web Design 概念；Bootstrap 12 列栅格教育了一代人。2017 年 CSS Grid Layout 主流化；2023 年 `@container` 在 Chromium、Safari 普及，组件库开始提供 `container-type` 工具类。Tailwind、Bootstrap 5、Material Web 均内置 responsive prefix 与 grid template API。

## UX 原则与产品影响

- **移动优先**：默认单列，progressive enhancement 至 multi-column。
- **内容优先级**：`order` 与 grid area 可在窄屏隐藏 sidebar、提升 main CTA。
- **触控 vs 鼠标**：断点不仅是宽度，也影响 hover 态是否可用、target size。
- **性能**：避免 layout thrashing；Grid 子项 `minmax(0, 1fr)` 防止 overflow 经典 bug。

Dashboard 常用 **12/16 列** 设计稿对齐 dev grid；marketing 页常用 asymmetric grid 讲故事。

## 冷知识

- `fr` 单位读作 fraction，Grid 的灵魂；`1fr 1fr` 不等于 `50% 50%`（gap 与 min-content 影响）。
- **Subgrid**（CSS Subgrid）让 nested grid 对齐父 grid track，卡片列表对齐神器。
- Figma Auto Layout 与 CSS Flexbox  mental model 高度同构，handoff 时应对应 padding/gap token。

## 参考与延伸阅读

- [MDN：CSS Grid Layout](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout)
- [MDN：CSS 容器查询](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_containment/Container_queries)
- [Ethan Marcotte：Responsive Web Design（2010）](https://alistapart.com/article/responsive-web-design/)
