# Android 14 界面

Android 14（Upside Down Cake）于 2023 年发布，延续 **Material You 动态取色** 与 **predictive back gesture** UI，并强化隐私指示器、partial photo access 与 per-app 语言设置。系统 UI 在 Quick Settings、锁屏 customizer 与 large screen 优化上进一步对齐 tablet 与 foldable。

![Android 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Android_new_logo_2019.svg/320px-Android_new_logo_2019.svg.png)

![Google 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/320px-Google_2015_logo.svg.png)

## 背景与历史

Android 14 开发代号 Upside Down Cake；2023 年 2 月 Developer Preview，10 月稳定版推送 Pixel，随后 OEM 适配。配合 **Material 3 Expressive** 预览与 **Health Connect** 集成，Settings 与 Permission 对话框视觉更统一。Google Play 政策同步要求 targetSdk 34 与 foreground service 类型声明，影响 App 内 notification 与 background UI。

## UX 原则与产品影响

- **Predictive back**：用户侧滑返回时 preview 上一屏 peek，App 需实现 OnBackPressedCallback 动画。
- **Themed icon**： monochrome icon + tint 与 wallpaper 协调，launcher 一致性提升。
- **Regional preferences**：温度单位、首周日等 regional prefs 独立 API，减少 locale 硬编码 form。
- **Large screen**：Android 14  discourage 强制 orientation；activity embedding 与 multi-window 引导。

Android 14 界面变更相对 12/13 incremental，但 **privacy UX**（camera/mic indicator、select photos）已成用户 baseline expectation。

## 冷知识

- Upside Down Cake 得名来自 Android 版本甜点传统（公开代号时代结束于 10，内部仍保留）。
- **Grammatical Inflection API** 支持性别化语言 UI string，服务全球化 polish。
- Pixel Feature Drops 可在 mid-cycle 更新 System UI，不必等 major version。

## 参考与延伸阅读

- [Android 14 行为变更（官方文档）](https://developer.android.com/about/versions/14/behavior-changes-14)
- [Material Design 3](https://m3.material.io/)
- [维基百科：Android 14](https://en.wikipedia.org/wiki/Android_14)
