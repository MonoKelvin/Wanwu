# Figma 转代码

Figma to Code 指将设计稿转换为 HTML/CSS、React、Vue 等前端代码的流程。手段含 Dev Mode inspect、插件（Anima、Locofy）、Figma API 与 AI 工具（v0、Builder.io）；目标是在保真度与可维护 token/component 结构间平衡。

![Figma Dev Mode 与代码交付](https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/640px-Figma-logo.svg.png)

## 设计师与品牌

Figma Dev Mode（2023 GA）面向 developer inspect 与 MCP integration。Anima、Locofy、TeleportHQ 等 commercial plugin。Vercel v0 从 screenshot/wireframe 生成 React+Tailwind。GitHub Copilot、Cursor 读 Figma spec 辅助 implementation。Design engineer 角色兴起于 Airbnb、Shopify 等。

## 设计亮点

Auto Layout → flexbox 映射最可靠；absolute positioning 导出常需人工 refactor。Variables → CSS custom properties / Tailwind theme。Component instance → React component 需 naming 约定一致。Responsive：frame variant 优于 single desktop export。Code Connect 将 Figma component 链接 Storybook story 源码，减少 drift。

## 使用体验

Workflow：designer 标注 spacing token → dev copy Dev Mode CSS → 迁入 component library。插件一键 export 适合 marketing page MVP，production 需删 redundant div。AI 生成 code 须 review accessibility 与 semantic HTML。Monorepo 中禁止 designer 直 push generated code 无 review。Storybook 对照 Figma Chromatic visual test。

## 文化影响

「Design to code 80%」承诺多次被 marketing 夸大， industry 共识是 system 成熟后 handoff 加速而非消除 dev。Figma MCP 与 Cursor 整合改变 ticket 流程。讨论焦点从 pixel-perfect 转向 token parity 与 component coverage。

## 参考与延伸阅读

- [Figma Dev Mode 文档](https://help.figma.com/hc/en-us/articles/15023124644247)
- [Figma Code Connect](https://www.figma.com/developers/code-connect)
- [Anima：Figma to React](https://www.animaapp.com/)
