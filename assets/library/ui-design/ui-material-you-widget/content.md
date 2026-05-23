# Material You 小组件

Material You 小组件（Widgets）是 Android 主屏上可 glanceable 的 **Material 3 风格信息卡片**，随 Android 12 与 Pixel Launcher 推广。它们继承动态取色、圆角容器与统一 padding 规范，让第三方 App 与系统 UI 在主屏共存时不破坏整体美学。

![Google 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/320px-Google_2015_logo.svg.png)

![Android 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Android_new_logo_2019.svg/320px-Android_new_logo_2019.svg.png)

## 背景与历史

Android 1.5 即引入 App Widgets；多年间样式各自为政。2021 年 Google 发布 **Material You Widgets** 设计指南与 **Glance**（Jetpack）框架，简化 RemoteViews 开发。Android 12L/13 增加尺寸规范与 pinned widget 流程；14 继续优化配置 UI 与预测性返回手势下的 widget 预览。

## UX 原则与产品影响

- **Glanceable**：一屏展示 1–3 个关键数据点（天气、日历、音乐控制），避免 mini-app 复杂度。
- **动态配色**：Widget 背景与 accent 可读取系统 Material You palette，与壁纸和谐。
- **尺寸等级**：small / medium / large 栅格与 launcher grid 对齐，设计需多尺寸适配。
- **刷新与电量**：后台 update 频率受 WorkManager 与电池优化约束，UI 需容忍 stale 数据态。

Widget 是留存与 re-engagement 渠道：用户无需打开 App 即可完成任务，但交互深度有限，需与通知、Tile 分工。

## 冷知识

- **Glance for AppWidgets** 用 Kotlin DSL 声明 UI，类似 Compose 子集，降低 RemoteViews XML 痛苦。
- iOS WidgetKit 与 Android Widget 设计哲学不同：iOS 更严格只读，Android 允许部分按钮交互。
- Google Clock、Photos 等第一方 widget 常作为 M3 组件范例随 Design Kit 更新。

## 参考与延伸阅读

- [Material Design：Widgets](https://m3.material.io/components/widgets/overview)
- [Android Developers：App widgets](https://developer.android.com/develop/ui/views/appwidgets)
- [Jetpack Glance 文档](https://developer.android.com/jetpack/androidx/releases/glance)
