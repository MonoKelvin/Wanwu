# 深色模式

深色模式（Dark Mode）通过浅色文字与深灰/黑背景降低弱光环境眩光，在 OLED 屏上可节省部分像素功耗。现代系统以 iOS 13（2019）、Android 10 与 macOS Mojave 级联推动；Web 侧用 CSS `prefers-color-scheme` 与 design token 双主题实现。

![深色与浅色界面对比示意](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/MacOS_Dark_Mode_screenshot.png/640px-MacOS_Dark_Mode_screenshot.png)

## 设计师与品牌

Apple Human Interface Guidelines 定义 semantic colors（label、systemBackground）自动适配。Material Design 3 提供 dark color scheme 算法。Microsoft Fluent 2 强调 elevation 用 surface tint 而非 shadow 表达层级。Tailwind CSS v3+ 用 `dark:` variant；Ant Design 5 Token darkAlgorithm。

## 设计亮点

避免纯 #000 背景，常用 #121212 与 elevated surface +1/+2 lightness。文本对比 WCAG AA 仍须满足；secondary text 不可过灰。Image 与 icon 需 dark 变体或 border 分离背景。Elevation：light 用 shadow，dark 用 lighter surface overlay。Form input、modal scrim 需单独 token。Toggle 应 respect system 默认并允许 app 内 override。

## 使用体验

CSS：`@media (prefers-color-scheme: dark) { ... }` 或 class-based `.dark`（Tailwind）。iOS traitCollection、Android DayNight theme 自动切换。测试：真机夜间、Sunset 自动切换、forced dark（Samsung）。Charts 与 brand color 在 dark 下 saturation 常需下调。Email client 对 dark mode 支持不一，需 meta color-scheme。

## 文化影响

2019 年「全平台 dark mode 年」成为 UX 里程碑；Twitter/X、Notion、Slack 等相继上线。用户形成「夜间必 dark」预期，light-only app 受批评。设计 token 架构因 dark 成为标配。中国 App 普遍跟随系统主题，部分保留独立「护眼模式」与 dark 并存。

## 参考与延伸阅读

- [Apple HIG：Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Material Design 3：Dark theme](https://m3.material.io/styles/color/the-color-system/color-roles)
- [MDN：prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
