# watchOS 界面

watchOS 是 Apple Watch 的操作系统，界面设计需在极小圆角矩形屏幕内完成信息展示、触控与 Digital Crown 滚动的协调。Apple 的 Human Interface Guidelines 为 watchOS 单独成章，强调**一屏一事**、大触控目标与 glanceable（扫一眼即懂）的信息密度。

![Apple Watch Ultra（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Apple_Watch_Ultra.jpg/480px-Apple_Watch_Ultra.jpg)

![Apple 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/240px-Apple_logo_black.svg.png)

## 背景与历史

Apple Watch 2015 年首发 watchOS 1，早期以信息卡片与 Force Touch 为主；watchOS 3 引入 Dock 与更快启动；watchOS 7 带来表盘复杂功能（Complications）与睡眠追踪 UI；近年版本强化健身、健康与独立 App（不依赖 iPhone）。SwiftUI 对 watchOS 的一等支持，让小组件式布局与 List/NavigationStack 成为主流实现方式。

## UX 原则与产品影响

- **触控目标**：最小约 44×44 pt，列表行高需容纳手指误触余量。
- **Digital Crown**：滚动列表与缩放地图时，Crown 是核心输入，需避免与边缘滑动手势冲突。
- **Complications**：表盘角落的小组件是最高频入口，设计需极简图标 + 关键数字。
- **Always-On Display**：常亮表盘降低对比度，深色背景与 muted 色是系统默认策略。

watchOS 设计经验也反哺 iOS：Live Activities、灵动岛与小组件，都强调「短Deferred 空间里的优先级排序」。

## 冷知识

- watchOS App 图标在设备上显示为圆形，设计稿需预留圆形裁切安全区。
- 体能训练类 App 常使用高对比大数字，因为用户可能在跑步中斜眼观看。
- Apple Watch Ultra 的「操作按钮」为户外场景增加了硬件级快捷入口，UI 需与之配对。

## 参考与延伸阅读

- [Apple HIG：watchOS](https://developer.apple.com/design/human-interface-guidelines/watchos)
- [Apple Watch 产品页](https://www.apple.com/watch/)
- [维基百科：watchOS](https://zh.wikipedia.org/wiki/WatchOS)
