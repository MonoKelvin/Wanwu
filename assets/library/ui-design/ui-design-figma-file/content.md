# Figma 设计稿

Figma 设计稿（Figma File）是存储于云端的多页面 **.fig 协作画布**，包含 Frame、Component、Instance、Variant 与 Comment thread。它是现代 UI 项目的事实源（source of truth），连接 research、visual design、prototype 与 Dev Mode 交付。

![Figma 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/320px-Figma-logo.svg.png)

## 背景与历史

Figma 文件从 2016 年起即 browser-native；**Multiplayer** 光标成为 remote design 标志画面。FigJam 文件与 Design 文件分工：前者 brainstorm，后者 high-fidelity spec。Branching（2022）允许 exploratory work 不污染 main file；Variables（2023）统一 color、spacing、boolean token。

## UX 原则与产品影响

- **Frame as screen**：iPhone 14 Pro、Desktop 1440 等 preset 对齐 dev breakpoint。
- **Component discipline**：命名 `Button/Primary/Default` 映射 code Storybook story。
- **Auto Layout**：设计稿 responsive behavior 预览，减少「静态 mock 无法解释 stretch」问题。
- **Comment + @mention**：async review 替代 endless export PDF ping-pong。

文件组织（cover page、changelog、archive page）影响团队 onboarding；缺乏 governance 的 file 会沦为「 layer 9999 坟场」。

## 冷知识

- Figma 无传统「保存」按钮——实时 autosave；offline 模式后恢复曾是大 feature request。
- **Dev Mode** 与设计 Mode 切换同文件，减少 duplicate file drift。
- 大型 design system file 可有 thousands components；performance 优化靠 hidden pages 与 library publish。

## 参考与延伸阅读

- [Figma 帮助：文件与项目](https://help.figma.com/hc/en-us/articles/360039832134)
- [Figma Best Practices](https://www.figma.com/best-practices/)
- [Config 大会资源](https://config.figma.com/)
