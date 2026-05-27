# Material You 小组件

Material You 小组件（Widgets）是 Android 12+ 主屏信息组件，支持 dynamic color 染色、rounded corner 与 responsive sizing（targetCellWidth/Height）。与 iOS WidgetKit 对照，强调 glanceable 信息与 wallpaper 视觉融合。

![Android 主屏小组件示意](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Android_robot.svg/640px-Android_robot.svg.png)

## 设计师与品牌

Google Android System UI 与 Material 团队定义 widget design guidelines。Glance（Jetpack Glance）用 Compose-like API 构建 AppWidget。Samsung One UI、Pixel Launcher 在 grid size 与 padding 上略有差异。开发文档 developer.android.com/develop/ui/views/appwidgets。

## 设计亮点

Widget 尺寸：small 2×2、medium 4×2、large 4×4 等 grid cell。Dynamic color：系统 palette 自动 apply 到 widget background 与 accent。Rounded corner radius 随 launcher 变化，需 safe zone 布局。Configuration activity 首次添加时设置 account/filter。Refresh：`WorkManager` 或 `AlarmManager` 控制 battery impact。Responsive layout 用 `SizeMode.Responsive` 多 layout XML/Glance。

## 使用体验

用户 long-press home → widgets picker → drag 放置。Developer：Glance `GlanceAppWidget` + preview in Android Studio。Test 多 launcher（Nova、Pixel）。Avoid 过频 update 被系统 throttle。Content 只读为主；复杂交互 deep link 进 app。iOS widget 对照学习 timeline provider 与 intent configuration 差异。

## 文化影响

Android widget 生态长期弱于 iOS，Material You 统一视觉后 Pixel 示范 weather、calendar 美观 widget。中国 Android 厂商负一屏「卡片」与 widget 并存，super app 占 slot。Design 讨论：widget 是 brand 延伸，需与 app 内 M3 token 一致。

## 参考与延伸阅读

- [Android App Widgets 指南](https://developer.android.com/develop/ui/views/appwidgets)
- [Jetpack Glance](https://developer.android.com/jetpack/androidx/releases/glance)
- [Material 3 Widget 规范](https://m3.material.io/components/widgets/overview)
