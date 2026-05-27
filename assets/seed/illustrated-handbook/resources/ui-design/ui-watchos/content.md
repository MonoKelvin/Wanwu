# watchOS 界面

watchOS 是 Apple Watch 操作系统，UI 针对小圆形/圆角矩形屏幕与 glanceable 交互设计。Human Interface Guidelines 强调 lightweight interaction、legible typography、Digital Crown 滚动与 complication 信息密度，与 iOS 完整 app 体验刻意区分。

![Apple Watch 界面](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_Watch_Series_7.png/640px-Apple_Watch_Series_7.png)

## 设计师与品牌

Apple watchOS 团队；每年 WWDC 更新 watchOS 11 等。SwiftUI 为首选 UI 框架；WatchKit  legacy。配套 iPhone Watch app 管理 watch face、complication、health。竞品 Wear OS、Galaxy Watch One UI Watch 在 tile、round layout 上对照。

## 设计亮点

One screen one task：避免 deep hierarchy。Touch target minimum 44×44 pt；button 少 text 多 icon。Digital Crown 滚动 list、zoom map；haptic detent feedback。Complication 多 size（circular、rectangular、inline）供 watch face 嵌入。Always On：dim luminance 降 power。Navigation：page-based TabView 或 list push。Workout 专用 high-contrast 大字体。Double tap gesture（Series 9+）primary action。

## 使用体验

Dev：Watch-only app 或 iOS companion；test on real device 非仅 simulator。Performance：image asset 小；network 用 URLSession background。Complication TimelineProvider 刷新 budget。HealthKit、WorkoutKit permission 清晰 copy。Localization 短 string；Crown 滚动比 swipe 优先 list 长内容。

## 文化影响

Apple Watch 定义 smartwatch「notification filter + health」而非 phone duplicate。Complication 设计成为 micro UI specialty。Fitness ring 视觉渗透 popular culture。watchOS 10  redesign app grid 引发 power user debate。Developer 学 watch HIG 理解 extreme constraint design 方法论。

## 参考与延伸阅读

- [watchOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/watchos)
- [Apple Watch Design Resources](https://developer.apple.com/design/resources/)
- [SwiftUI for watchOS](https://developer.apple.com/documentation/swiftui/building_a_watchos_app)
