# Apple Human Interface Guidelines

Apple Human Interface Guidelines（HIG）是 iOS、iPadOS、macOS、watchOS、visionOS 的官方设计规范，阐述 layout、typography、color、motion、accessibility 与 platform patterns（NavigationStack、TabView、Sheets）。遵循 HIG 是 App Store 体验一致性与系统整合的基础。

![Apple Developer 设计资源](https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/App_Store_%28iOS%29.svg/640px-App_Store_%28iOS%29.svg.png)

## 设计师与品牌

Apple Design Team 维护；WWDC session 每年更新 iOS 18 等新 paradigm。SF Pro / SF Compact / New York 字体 family。SF Symbols 6 提供 thousands symbol with variable color、animation。Design Resources 下载 Sketch/Figma/Pixel template（随 Apple 提供格式更新）。

## 设计亮点

Clarity、Deference、Depth 三原则。Dynamic Type 支持 accessibility size；layout 需 Auto Layout/SwiftUI 自适应。Semantic system colors 自动 light/dark。Navigation：large title、back button text 可 hide。Modal：sheet detent、form page vs card。Haptics 与 Live Activities 扩展 lock screen。visionOS：window、volume、ornament  spatial pattern。

## 使用体验

SwiftUI 优先：`List`、`NavigationStack`、`TabView` 映射 HIG patterns。UIKit  legacy 项目对照 HIG migration。Review rejection 常见因 custom gesture 冲突、missing privacy manifest。TestFlight + Xcode Accessibility Inspector。Mac Catalyst 需 resize 与 menu bar 适配。

## 文化影响

HIG 塑造用户对「iPhone app 应该什么样」的预期，Android Material 常与之对照。Apple 拒绝「copy iOS on Android」亦影响 cross-platform 策略。中国 super app 功能密度与 HIG minimalism 张力产生本地化 adaptation 讨论。Design 教育以 HIG 为 mobile UX 权威读物。

## 参考与延伸阅读

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [Apple Design Resources](https://developer.apple.com/design/resources/)
