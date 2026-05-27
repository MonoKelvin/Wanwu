# 无障碍设计

无障碍设计（Accessibility，常简称 a11y）确保数字产品可被不同能力用户使用：包括视觉、听觉、运动与认知差异。Web 领域以 WCAG 2.2 与 WAI-ARIA 为核心标准；移动端 iOS/Android 提供 VoiceOver、TalkBack 等系统能力。它不是合规 checkbox，而是信息架构、交互与视觉的系统工程。

![W3C Web Accessibility Initiative 标识](https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/W3C_Icon.svg/640px-W3C_Icon.svg.png)

## 设计师与品牌

W3C Web Accessibility Initiative（WAI）维护 WCAG；美国 Section 508、欧盟 EN 301 549 将标准纳入采购法规。Apple Human Interface Guidelines、Google Material、Microsoft Fluent 均设 accessibility 专章。工具链含 axe DevTools、Lighthouse、NVDA/JAWS 屏幕阅读器测试。Radix UI、React Aria 等库把 focus trap、keyboard nav 封装进组件 primitives。

## 设计亮点

POUR 四原则：Perceivable（可感知）、Operable（可操作）、Understandable（可理解）、Robust（健壮）。正文对比度 WCAG AA 要求 4.5:1，大文本 3:1；非文本 UI 组件 3:1。Focus indicator 必须可见，不可移除 outline 而无替代。表单需 label 关联与 error 文案；图标按钮要 aria-label。动画需 respect prefers-reduced-motion。Semantic HTML（button、nav、heading 层级）优于 div 模拟。

## 使用体验

设计师用 Figma 插件（Stark、A11y）早期查对比度；开发用 eslint-plugin-jsx-a11y 与 Storybook a11y addon 回归。VoiceOver 线性浏览可暴露 reading order 错误。触控目标 iOS HIG 建议 44×44 pt；Material 48 dp。Dark mode 仍需满足 contrast。Inclusive design 扩展至 dyslexia 字体、caption 与 plain language。

## 文化影响

2019 年后诉讼与监管推动欧美企业加大 a11y 投入；#a11y Twitter 与 Deque、Level Access 等社区教育开发者。Apple 将 accessibility 作为 keynote 叙事；Microsoft Inclusive Design 工具包影响 design thinking 课程。中国 App 适老化改造与《无障碍环境建设法》衔接，强调字号、语音与简化流程。对 UI 从业者，a11y 成为 design system 必备 token 与 review checklist。

## 参考与延伸阅读

- [WCAG 2.2 官方](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Apple Accessibility](https://developer.apple.com/accessibility/)
- [Material Accessibility](https://m3.material.io/foundations/accessible-design)
