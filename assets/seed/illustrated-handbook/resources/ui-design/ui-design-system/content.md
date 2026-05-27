# 设计系统

设计系统（Design System）是产品 UI 的可复用规范集合：design tokens（color、typography、spacing）、组件库、pattern 文档与 governance 流程。连接 Figma library 与 code（React/Vue）保证 design-dev 一致，Storybook 常作为 living documentation 载体。

![设计系统组件库示意](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/640px-React-icon.svg.png)

## 设计师与品牌

代表系统：Material Design（Google）、Fluent 2（Microsoft）、Apple HIG、Polaris（Shopify）、Carbon（IBM）、Atlassian Design System、Ant Design。方法论受 Brad Frost Atomic Design、Nathan Curtis 的 scaling design systems 影响。工具：Figma Variables、Tokens Studio、Style Dictionary 导出 multi-platform token。

## 设计亮点

Token 三层：global → semantic → component。Component API：variant、size、disabled state 与 accessibility props。Documentation 含 do/don't、usage、content guidelines。Versioning semver；deprecation 路径。Theming：brand swap primary token 不改 component code。Composition over customization：slot、children pattern。

## 使用体验

Team 流程：design 更新 library → PR 到 code → Chromatic visual regression → release notes。Adoption 指标：import 率、duplicate UI audit。Starter：Storybook + Radix/shadcn 或 MUI。Monorepo（Nx/Turborepo）放 packages/ui。Onboarding workshop 降「野生 button」；lint rule 禁 hardcoded hex。

## 文化影响

2016 年后 design system 从 big tech 扩散至 bank、telecom 数字化。Spotify Encore、GitHub Primer 开源影响 community。失败案例常因缺 governance、token 与 Figma 脱节。中国大厂（阿里 Ant、腾讯 TDesign、字节 Arco）均推 enterprise design system 平台化。

## 参考与延伸阅读

- [Material Design 3](https://m3.material.io/)
- [Storybook 文档](https://storybook.js.org/docs)
- [Design Tokens W3C Community Group](https://design-tokens.github.io/community-group/)
- [Shopify Polaris](https://polaris.shopify.com/)
