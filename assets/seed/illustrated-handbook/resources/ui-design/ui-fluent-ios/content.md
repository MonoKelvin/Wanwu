# Fluent / iOS 风格

Fluent Design System（Microsoft）与 Apple Human Interface Guidelines（HIG）代表两大平台原生 UI 范式：Fluent 强调 acrylic 材质、Reveal highlight 与 depth；iOS HIG 强调 clarity、deference、depth 与 San Francisco 字体、large title 导航。跨平台产品常需在二者间做映射而非像素复制。

![Apple 与 Microsoft 设计标志并列](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/640px-Apple_logo_black.svg.png)

## 设计师与品牌

Microsoft Fluent 2（2022+）统一 Windows、Office、Teams、Xbox。Apple HIG 随 iOS 17/18、visionOS 扩展 spatial UI。Material Design 常作 Android 第三方参照。React Native、Flutter、.NET MAUI 提供 platform-adaptive widget。

## 设计亮点

Fluent：Mica/Acrylic 背景、rounded corner 8px scale、Segoe UI Variable。NavigationView、CommandBar 模式。iOS：UITabBar、UINavigationBar large title→inline collapse、SF Symbols multi-weight。Safe area、Dynamic Type、Vibrancy label。Both 强调 motion 有意义；Fluent Reveal vs iOS subtle fade。Dark mode semantic color 各自体系不可硬套 hex。

## 使用体验

Cross-platform app 用 platform detection 切换 component（Settings on iOS vs Windows）。Design token 抽象 layer color、spacing，platform file 实现细节。TestFlight 与 Windows Insider 分别验证。Accessibility：VoiceOver rotor vs Narrator landmark。Documentation 常读 Apple HIG 与 Fluent 2 docs 并排对照 tab pattern、settings layout。

## 文化影响

「iOS clone」Android 时代结束，用户期望 platform-native feel。Microsoft Fluent 从 Windows 8 metro 演进至 today  softer Mica。Apple visionOS 引入 eye/hand UI 新章节。Enterprise app 在 BYOD 环境必须 fluent+iOS 双精通，design system 多维护 platform theme package。

## 参考与延伸阅读

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Fluent 2 Design System](https://fluent2.microsoft.design/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
