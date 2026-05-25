# Fluent Design 与 iOS 风格对照

Microsoft **Fluent Design System** 与 Apple **Human Interface Guidelines** 代表两大桌面/移动生态的 official 设计语言。对比二者有助于产品团队在跨平台开发（React Native、Flutter、.NET MAUI）时理解：**同一功能在不同平台应「 feels native」而非 pixel-identical**。

![Microsoft 标志（Fluent Design，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/320px-Microsoft_logo.svg.png)

![Apple 标志（iOS HIG，维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png)

## 背景与历史

Fluent 2017 年随 Windows 10 Fall Creators Update 发布，强调 Light、Depth、Motion、Material、Scale 五要素；Acrylic 材质与 Reveal highlight 成为 Windows 11 视觉 signature。Apple HIG 则长期强调 clarity 与 content-first。Office、Teams、Outlook mobile 等 Microsoft 产品需在 iOS 上遵循 HIG，在 Windows 上遵循 Fluent，形成鲜明 **platform-adaptive** 案例库。

## UX 原则与产品影响

| 维度 | Fluent（Windows） | iOS HIG |
|------|-------------------|---------|
| 导航 | NavigationView / Pivot | Tab Bar + Navigation Stack |
| 材质 | Acrylic / Mica | Blur + Vibrancy |
| 触控反馈 | Reveal / Hover | Highlight + Haptics |
|  typography | Segoe UI Variable | San Francisco |
| 对话框 | ContentDialog | Sheet / Alert |

跨平台团队常维护 **platform-specific component wrappers**，共享 business logic 但 swap 视觉与交互细节，避免「 Android 套 iOS 皮」的 uncanny valley。

## 冷知识

- Fluent 图标系统（Segoe Fluent Icons）与 SF Symbols 均支持可变字重，但 licensing 不同。
- Windows 11 圆角窗口与居中 Taskbar 借鉴了部分 mobile aesthetic，Fluent 与 HIG 边界在模糊。
- Xbox UI 也属 Fluent 家族，强调 ten-foot UI 与 gamepad 焦点导航。

## 参考与延伸阅读

- [Microsoft Fluent Design](https://fluent2.microsoft.design/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design：Platform adaptation](https://m3.material.io/foundations/adaptation)
