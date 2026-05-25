# 玻璃拟态（Glassmorphism）

玻璃拟态是一种 UI 视觉风格，通过**半透明背景、背景模糊（backdrop-filter）与细边框高光**模拟磨砂玻璃层叠效果。它在 2020 年前后随 macOS Big Sur、Windows 11 与 iOS 控制中心的设计语言而广为人知，成为现代网页与 Dashboard 的常见装饰手法。

![Apple 标志（玻璃与半透明 UI 常见于 Apple 平台，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png)

![Microsoft 标志（Fluent Acrylic 材质，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/320px-Microsoft_logo.svg.png)

## 背景与历史

苹果在 iOS 7（2013）已大规模使用 blur 与 translucency；2020 年 UX 设计师 Michal Malewicz 等人将「Glassmorphism」作为 trend 命名并推广。CSS **`backdrop-filter: blur()`** 在 Chromium、Safari 普及后，前端无需 Canvas 即可实现高性能毛玻璃卡片。Material Design 3 与 Fluent Design 的「Acrylic」「Mica」材质，可视为系统化、可访问性更成熟的演进。

## UX 原则与产品影响

- **层级暗示**：半透明层让用户感知「浮在内容之上」的 modal、导航或侧边栏。
- **性能注意**：大面积 blur 在低端 GPU 上可能掉帧，需限制 blur 半径与层数。
- **对比度风险**：文字落在复杂背景上时，WCAG 对比度易不达标，需加 scrim（暗色遮罩）或 solid fallback。
- **深色模式**：玻璃层在 dark UI 中常用低 opacity 白 + 细 border，避免「脏灰」感。

玻璃拟态适合 hero 区、登录卡片与音乐播放器界面，但不适合数据密集型表格主体——可读性始终优先于炫技。

## 冷知识

- Windows Vista 的 Aero Glass（2007）是早期桌面「玻璃」隐喻的先驱，但因性能与审美争议在 Win8 被削弱。
- iOS 18 与 visionOS 进一步混合 glass 与 spatial depth，但 Web 端仍主要依赖 CSS blur。
- 设计社区中 Figma 的 Background blur 效果与 CSS `backdrop-filter` 并非 1:1，交付时需开发侧微调。

## 参考与延伸阅读

- [MDN：backdrop-filter](https://developer.mozilla.org/zh-CN/docs/Web/CSS/backdrop-filter)
- [UX Collective：Glassmorphism 讨论](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)
- [Apple HIG：Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
