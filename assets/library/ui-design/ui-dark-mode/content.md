# 深色模式（Dark Mode）

深色模式（Dark Mode）指 UI 以深灰或黑色为背景、浅色文字与控件为主视觉的主题。它并非单纯「颜色反转」，而是一套涉及对比度、 elevation、图像与品牌色的**完整主题系统**，自 2019 年前后随 iOS 13、Android 10 系统级支持而成为用户预期功能。

![Apple 标志（iOS 深色模式代表平台之一，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png)

![Android 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Android_new_logo_2019.svg/320px/Android_new_logo_2019.svg.png)

## 背景与历史

早期 IDE 与终端长期使用深色以减少 eye strain；2018–2019 年 Apple、Google 相继在系统设置中提供「外观：浅色/深色/自动」，并随日出日落切换。Web 端通过 **`prefers-color-scheme`** 媒体查询与 CSS 变量实现跟随系统；Material Design 与 Apple HIG 均发布深色配色与 elevation 指南，避免纯 `#000` 导致的 smearing 与 halo 效应。

## UX 原则与产品影响

- **对比度**：WCAG 要求正文至少 4.5:1；深色下 link 色需单独校准，不能沿用浅色主题 hex。
- **Elevation**：Material 用「表面变亮」而非 shadow 表达层级；iOS 用 grouped background 区分 section。
- **图像与媒体**：照片、插画、图表需提供 dark 变体或加 dim overlay，避免「亮斑」刺眼。
- **用户选择**：应尊重系统偏好，同时允许 App 内 override（如阅读类 App 强制 sepia/深色）。

深色模式可降低 OLED 功耗、改善弱光阅读，但并非所有用户偏好——A/B 测试显示留存差异因品类而异，关键是**可选且一致**。

## 冷知识

- Twitter/X 2016 年 joke 推出深色模式后用户呼声极高，成为产品优先级经典案例。
- `color-scheme: dark` 可提示浏览器渲染原生 scrollbar、form control 的深色样式。
- 许多团队用 **Design Token 双套 alias**（`bg.primary.light` / `bg.primary.dark`）而非运行时 filter  invert。

## 参考与延伸阅读

- [Apple HIG：Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Material Design：Dark theme](https://m3.material.io/styles/color/dark-theme)
- [MDN：prefers-color-scheme](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@media/prefers-color-scheme)
