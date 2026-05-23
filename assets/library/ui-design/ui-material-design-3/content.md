# Material Design 3

Material Design 3（M3）是 Google 于 2021 年 Google I/O 发布的第三代跨平台设计系统，随 Android 12 的 **Material You** 动态取色一同亮相。它从「纸墨隐喻」转向更个性化、更情感化的表达，覆盖 Android、Flutter、Web（Material Web）与 Wear OS。

![Google 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/320px-Google_2015_logo.svg.png)

![Android 标志（维基共享资源）](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Android_new_logo_2019.svg/320px-Android_new_logo_2019.svg.png)

## 背景与历史

2014 年 Google 发布首版 Material Design，统一 Android 与 Web 视觉语言；2018 年 M2 强化密度与深色主题。M3 的核心跃迁是 **动态配色（Dynamic Color）**：从壁纸提取主色、次色与中性色，生成整套主题，让系统 UI 与用户个人审美对齐。更大圆角、强调排版层级、状态层（State Layers）与 motion 规范，则让组件在触控与无障碍场景下更可预测。

## UX 原则与产品影响

- **个性化**：Monet 算法驱动的取色，提升品牌 App 与系统 UI 的亲和感。
- **无障碍**：对比度、触控目标与 TalkBack 语义在组件规范中内置。
- **跨端一致**：同一 Design Token 可流向 Compose、Flutter 与 CSS Custom Properties。
- **设计—开发对齐**：官方 Figma M3 Design Kit 与 Material Theme Builder 降低落地摩擦。

M3 深刻影响了 Android 厂商定制 UI 的配色思路，也推动 Web 端 CSS `color-mix`、Design Token 管道成为团队标配。

## 冷知识

- Material You 名称强调「为你定制」，壁纸取色在 Pixel 上首发，后扩展至更多设备。
- M3 的 **Tonal Spot**、**Vibrant** 等配色方案名称，对应不同的色彩和谐算法。
- Jetpack Compose 是 Android 上 M3 的官方实现路径，旧 View 体系仍可通过 Material Components 迁移。

## 参考与延伸阅读

- [Material Design 3 官网](https://m3.material.io/)
- [Android Developers：Material You](https://developer.android.com/develop/ui/views/theming/dynamic-colors)
- [维基百科：Material Design](https://zh.wikipedia.org/wiki/Material_Design)
