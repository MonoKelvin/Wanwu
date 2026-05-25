# Human Interface Guidelines（Apple HIG）

Human Interface Guidelines（HIG）是 Apple 为 iOS、iPadOS、macOS、watchOS、visionOS 与 tvOS 提供的官方设计与交互规范。它阐述**清晰（Clarity）、遵从（Deference）、深度（Depth）** 三大原则，并给出导航、排版、材质、motion 与无障碍的具体模式，是 App Store 体验一致性的重要参照。

![Apple 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png)

## 背景与历史

HIG 可追溯至 Mac 早期 **Macintosh Human Interface Guidelines**（1987），随 iPhone SDK（2008）扩展移动章节。SwiftUI（2019）与 visionOS（2023）推动 HIG 持续更新：Sidebar、Inspector、Spatial UI 等新范式写入文档。每年 **WWDC** Design 系列 session 常解读 HIG 变更，影响全球数百万开发者默认 UI 选择。

## UX 原则与产品影响

- **清晰**：文字 legible、图标 precise、装饰 subtle；功能优先于视觉噱头。
- **遵从**：UI 帮助用户理解内容，而非与内容竞争；半透明与 blur 服务 hierarchy。
- **深度**：层级与 motion 传达 spatial relationship；触控反馈即时可感。
- **平台惯例**：Tab Bar、Navigation Stack、Sheet、Context Menu 等有明确 usage 场景。

遵循 HIG 可降低审核 friction、提升 VoiceOver 与 Dynamic Type 兼容，并让用户在 Apple 生态内获得迁移学习（transfer learning）收益。

## 冷知识

- HIG 不是 law，但 App Store Review 会以「 confusing UI」等理由拒审极端违背惯例的 App。
- **SF Symbols** 与 HIG 深度集成，数千个矢量符号支持 multicolor 与 variable color。
- iOS 18 的 **Tinted Icons** 与 Control Center 自定义，在 HIG 框架下扩展 personalization。

## 参考与延伸阅读

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple Design Resources（Figma / Sketch）](https://developer.apple.com/design/resources/)
- [WWDC Design 视频归档](https://developer.apple.com/videos/design/)
