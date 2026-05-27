# 玻璃拟态

玻璃拟态（Glassmorphism）是 2020 前后流行的 UI 视觉风格：半透明 frosted glass 面板、background blur、细 border 与 soft shadow，营造层次与深度。Apple macOS Big Sur、iOS 控制中心与 Windows 11 Acrylic 推动 mainstream；CSS 实现靠 `backdrop-filter: blur()` 与 alpha background。

![macOS Big Sur 玻璃质感界面](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/MacOS_Big_Sur_Desktop.png/640px-MacOS_Big_Sur_Desktop.png)

## 设计师与品牌

风格名 glassmorphism 由 UI 社区命名；Apple HIG materials、Microsoft Fluent Acrylic、Material You 动态色 surface 提供 system-level 参考。Figma 用 background blur layer + fill opacity 模拟。Tailwind：`backdrop-blur-md bg-white/30`。

## 设计亮点

Layer stack： vibrant wallpaper/gradient 底层 + blur 面板 + 1px white/20% stroke。Contrast 风险：blur 上 gray text 可能低于 WCAG；需 solid fallback。Performance：mobile `backdrop-filter` GPU 成本，Android 碎片化需测试。Dark mode：border 用 white/10 而非 gray shadow。Combine with subtle noise texture 减 banding。

## 使用体验

适用：dashboard card、modal overlay、nav bar floating。不适用：长文阅读区、复杂 form（干扰 focus）。Progressive enhancement：不支持 blur 时 solid background。iOS 15+ UIBlurEffect；CSS `@supports (backdrop-filter)`。Design critique：2021 后滥用致「廉价 glass」；today 更克制，与 neumorphism 同样周期衰退。

## 文化影响

Glassmorphism 与 neumorphism 并列 2020 UI trend cycle 案例。Apple 生态美学外溢至 Dribbble landing page。开发者社区 debate「real usability vs dribbble bait」。Design system 将其收编为 semantic surface token（elevated-glass）而非 global style。

## 参考与延伸阅读

- [Apple HIG：Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [MDN：backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- [Fluent Acrylic material](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)
