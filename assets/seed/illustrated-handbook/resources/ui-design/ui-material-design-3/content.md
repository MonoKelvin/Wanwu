# Material Design 3

Material Design 3（M3，代号 Material You）2021 年随 Android 12 发布，强调 dynamic color 从 wallpaper 提取、personalization 与大圆角 tactile UI。Google 用 Material Theme Builder 与 Compose Material3 库将 token 落到 Android、Flutter 与 Web（Material Web Components）。

![Material Design Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_Material_Design_logo.svg/640px-Google_Material_Design_logo.svg.png)

## 设计师与品牌

Google Design 团队维护；Material.io 文档与 Figma M3 kit。Jetpack Compose `androidx.compose.material3` 为一等公民。Flutter `ThemeData` useMaterial3。Web `@material/web` components 持续演进。Pixel 手机首发 dynamic color，OEM 可选是否跟随。

## 设计亮点

Color：seed color → HCT 算法生成 light/dark scheme；primary、secondary、tertiary、error roles。Typography：Display/Headline/Title/Body/Label scale。Shape：corner small/medium/large/extra-large。Elevation：tonal surface 替代 heavy shadow。Components：FAB extended、NavigationBar、NavigationRail、SearchBar M3 refresh。Motion：emphasized easing shared axis transition。

## 使用体验

Android：`dynamicLightColorScheme(context)` 读取 wallpaper。Compose：`MaterialTheme { Surface { ... } }`。Custom brand：override ColorScheme 保留 algorithm。Design QA：对比 OEM 魔改 ROM 是否破坏 token。Accessibility：check contrast with Material Theme Builder accessibility tab。

## 文化影响

Material You 推动「personal OS aesthetic」叙事，与 Apple 统一 brand 对比。Dynamic color 影响 wallpaper app 与 theme engine 生态。中国 OEM（MIUI、ColorOS）借鉴大圆角与 blur，但保留自有 icon 与广告 UI。M3 成为 Android 开发面试常考点。

## 参考与延伸阅读

- [Material Design 3 官网](https://m3.material.io/)
- [Jetpack Compose Material3](https://developer.android.com/jetpack/compose/designsystems/material3)
- [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/)
